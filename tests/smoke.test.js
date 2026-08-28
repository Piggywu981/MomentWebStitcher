/**
 * 冒烟测试：本地起静态服务 + Playwright 无头 Chromium 跑功能断言。
 * 运行：npm test（需要 npm i -D playwright && npx playwright install chromium）
 */
let chromium;
try {
    ({ chromium } = require('playwright'));
} catch (e) {
    console.error('缺少 playwright。请先执行：\n  npm i -D playwright\n  npx playwright install chromium\n然后重跑 npm test。');
    process.exit(1);
}

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8899;
const URL_BASE = `http://localhost:${PORT}`;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function startServer() {
    return new Promise(resolve => {
        const server = http.createServer((req, res) => {
            let p = req.url.split('?')[0];
            if (p === '/') p = '/index.html';
            const file = path.join(ROOT, p);
            fs.readFile(file, (err, data) => {
                if (err) { res.statusCode = 404; res.end(); return; }
                res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
                res.end(data);
            });
        });
        server.listen(PORT, () => resolve(server));
    });
}

(async () => {
    const server = await startServer();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    const results = [];
    const check = (name, cond, extra) => results.push({ name, pass: !!cond, extra: extra || '' });

    await page.goto(URL_BASE + '/index.html', { waitUntil: 'load' });
    await page.waitForTimeout(600);

    check('S0 exif-js loaded (SRI ok)', await page.evaluate(() => typeof EXIF !== 'undefined'));
    check('S0 CSP meta present', await page.evaluate(() =>
        document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null));

    // 页内工具：PNG / 带 EXIF 的 JPEG / 解不了的字节 / 合成拖拽事件链
    await page.evaluate(() => {
        window.__mkPng = async (w, h, name, lm) => {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d'); g.fillStyle = '#7788aa'; g.fillRect(0, 0, w, h);
            const blob = await new Promise(r => c.toBlob(r, 'image/png'));
            return new File([blob], name, { type: 'image/png', lastModified: lm });
        };
        // 手工构造带 EXIF APP1 段的 JPEG（DateTimeOriginal 可指定）
        window.__mkExifJpeg = async (name, lm, dtStr) => {
            const c = document.createElement('canvas'); c.width = 8; c.height = 8;
            const g = c.getContext('2d'); g.fillStyle = '#5a7'; g.fillRect(0, 0, 8, 8);
            const blob = await new Promise(r => c.toBlob(r, 'image/jpeg'));
            const buf = new Uint8Array(await blob.arrayBuffer());
            const ascii = s => { const a = []; for (const ch of s) a.push(ch.charCodeAt(0)); return a; };
            const tiff = [
                0x49, 0x49, 0x2A, 0x00, 8, 0, 0, 0,                            // II TIFF header
                1, 0, 0x69, 0x87, 4, 0, 1, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0,   // IFD0: ExifIFDPointer -> 26
                1, 0, 0x03, 0x90, 2, 0, 20, 0, 0, 0, 44, 0, 0, 0, 0, 0, 0, 0,  // ExifIFD: DateTimeOriginal @44
                ...ascii(dtStr + '\0')
            ];
            const payload = [...ascii('Exif\0\0'), ...tiff];
            const seg = [0xFF, 0xE1, (payload.length + 2) >> 8 & 0xFF, (payload.length + 2) & 0xFF, ...payload];
            const out = new Uint8Array([buf[0], buf[1], ...seg, ...buf.slice(2)]);
            return new File([out], name, { type: 'image/jpeg', lastModified: lm });
        };
        window.__dnd = (sourceSel, targetSel, clientX, clientY) => {
            const src = document.querySelector(sourceSel);
            const target = document.querySelector(targetSel);
            const dt = new DataTransfer();
            src.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true, cancelable: true }));
            const opts = { dataTransfer: dt, bubbles: true, cancelable: true, clientX: clientX || 0, clientY: clientY || 0 };
            target.dispatchEvent(new DragEvent('dragover', opts));
            target.dispatchEvent(new DragEvent('drop', opts));
            src.dispatchEvent(new DragEvent('dragend', { dataTransfer: dt, bubbles: true, cancelable: true }));
        };
        window.__alertMsgs = [];
        window.alert = m => window.__alertMsgs.push(m);
    });

    // T1 上传：PNG ×2 + 带 EXIF 的 JPEG
    // exif.jpg 文件时间最老(2020)但拍摄时间最新(2025-06-01) => 若按文件时间排最后，按拍摄时间应排第一
    await page.evaluate(async () => {
        const files = [
            await __mkPng(100, 150, 'a<svg/onload=alert(1)>.png', 1700000000000),
            await __mkPng(100, 120, 'b.png', 1700000100000),
            await __mkExifJpeg('exif.jpg', 1600000000000, '2025:06:01 12:00:00'),
        ];
        handleImageUpload(files);
    });
    await page.waitForFunction(() => uploadedImages.length === 3, null, { timeout: 8000 });
    await page.waitForTimeout(400);

    check('T1 upload: 3 images', await page.evaluate(() => uploadedImages.length === 3));
    check('T1 upload: blob URLs', await page.evaluate(() => uploadedImages.every(i => i.src.startsWith('blob:'))));
    check('T1 upload: pool shows 3', await page.evaluate(() => document.querySelectorAll('#poolImages .pool-image').length === 3));
    check('T1 EXIF date parsed', await page.evaluate(() => {
        const img = uploadedImages.find(i => i.name === 'exif.jpg');
        return img && img.exifTime === true &&
            img.dateTime.getTime() === new Date(2025, 5, 1, 12, 0, 0).getTime();
    }));
    check('T1 EXIF image sorted first (capture time wins over file time)', await page.evaluate(() =>
        uploadedImages[0].name === 'exif.jpg'), JSON.stringify(await page.evaluate(() => uploadedImages.map(i => i.name))));
    check('T1 non-exif flagged', await page.evaluate(() =>
        uploadedImages.filter(i => i.name !== 'exif.jpg').every(i => i.exifTime === false)));
    check('T1 filename escaped', await page.evaluate(() => {
        const spans = [...document.querySelectorAll('#poolImages .pool-image .image-info span')];
        return spans.some(s => s.textContent.includes('<svg') && s.children.length === 0);
    }));

    // T2 解不了的文件被剔除并提示
    await page.evaluate(() => {
        handleImageUpload([new File([new Uint8Array([1, 2, 3, 4, 5])], 'broken.heic', { type: 'image/heic', lastModified: 1700000000000 })]);
    });
    await page.waitForFunction(() =>
        document.getElementById('progressText').textContent === '准备就绪' && window.__alertMsgs.length > 0,
        null, { timeout: 8000 });
    check('T2 undecodable skipped + alerted', await page.evaluate(() =>
        uploadedImages.find(i => i.name === 'broken.heic') === undefined &&
        window.__alertMsgs.some(m => m.includes('broken.heic') && m.includes('无法解码'))));

    // T3 R2 回归：把组1唯一的图移到组2（目标组引用 + 延迟清理空组）
    await page.evaluate(() => {
        uploadedImages = uploadedImages.slice(0, 3);
        const [exif, a, b] = uploadedImages;
        imageGroups = [[exif], [a, b]];
        updateGroups();
    });
    await page.evaluate(() => insertImageIntoGroup(uploadedImages[0], 1, null));
    await page.evaluate(() => updateGroups());
    check('T3 R2 fix: image lands in target group', await page.evaluate(() =>
        imageGroups.length === 1 && imageGroups[0].length === 3 && imageGroups[0][2] === uploadedImages[0]));
    check('T3 R2 fix: DOM index consistent', await page.evaluate(() => {
        const boxes = document.querySelectorAll('#groupsContainer .group-box');
        return boxes.length === 1 &&
            boxes[0].querySelector('.group-images').dataset.groupIndex === '0' &&
            boxes[0].querySelectorAll('.group-image').length === 3;
    }));

    // T4 分组：NaN 拦截 + 正常分组 + 按钮状态
    await page.fill('#groupSize', '');
    await page.click('#autoGroupBtn');
    check('T4 NaN guard alerts', await page.evaluate(() =>
        window.__alertMsgs.some(m => m === '请输入有效的分组大小')));
    await page.fill('#groupSize', '2');
    await page.click('#autoGroupBtn');
    check('T4 autoGroup sizes [2,1]', await page.evaluate(() =>
        imageGroups.length === 2 && imageGroups[0].length === 2 && imageGroups[1].length === 1));
    check('T4 stitch btn enabled', await page.evaluate(() => document.getElementById('stitchBtn').disabled === false));

    // 给池子补一张未分组图，供拖拽测试用
    await page.evaluate(async () => {
        handleImageUpload([await __mkPng(60, 60, 't0.png', 1700000200000)]);
    });
    await page.waitForFunction(() => uploadedImages.length === 4, null, { timeout: 8000 });
    await page.waitForTimeout(300);

    // T5 鼠标拖拽事件链（合成 DataTransfer 事件走真实监听器）
    // pool(t0) -> group1 顶部 => 插入到最前
    await page.evaluate(() => {
        const g1 = document.querySelector('.group-images[data-group-index="1"]');
        const r = g1.querySelector('.group-image').getBoundingClientRect();
        __dnd('#poolImages .pool-image:last-child', '.group-images[data-group-index="1"]', r.left + 10, r.top + 2);
    });
    await page.waitForTimeout(200);
    check('T5 pool->group inserts at drop point', await page.evaluate(() => {
        const t0 = uploadedImages.find(i => i.name === 't0.png');
        return imageGroups[1].length === 2 && imageGroups[1][0] === t0;
    }), JSON.stringify(await page.evaluate(() => imageGroups.map(g => g.map(i => i.name)))));

    // group0 第2张 -> group1 底部
    await page.evaluate(() => {
        const g1 = document.querySelector('.group-images[data-group-index="1"]');
        const r = g1.getBoundingClientRect();
        __dnd('.group-images[data-group-index="0"] .group-image:nth-child(2)', '.group-images[data-group-index="1"]', r.left + 10, r.bottom - 2);
    });
    await page.waitForTimeout(200);
    check('T5 group0->group1 moves image', await page.evaluate(() =>
        imageGroups[0].length === 1 && imageGroups[1].length === 3));

    // 同组内重排：组1第一张拖到底部 => 顺序变化且模型与 DOM 一致
    await page.evaluate(() => {
        const tiles = document.querySelectorAll('.group-images[data-group-index="1"] .group-image');
        const last = tiles[tiles.length - 1];
        const r = last.getBoundingClientRect();
        __dnd('.group-images[data-group-index="1"] .group-image:first-child', '.group-images[data-group-index="1"]', r.left + 10, r.bottom - 2);
    });
    await page.waitForTimeout(200);
    check('T5 same-group reorder (model matches DOM)', await page.evaluate(() => {
        const model = imageGroups[1].map(i => i.name);
        const dom = [...document.querySelectorAll('.group-images[data-group-index="1"] .group-image')]
            .map(el => uploadedImages.find(i => String(i.id) === el.dataset.imageId).name);
        return JSON.stringify(model) === JSON.stringify(dom) && model[2] === 't0.png';
    }), JSON.stringify(await page.evaluate(() => imageGroups.map(g => g.map(i => i.name)))));

    // group1 最后一张 -> pool
    await page.evaluate(() => {
        __dnd('.group-images[data-group-index="1"] .group-image:last-child', '#poolImages');
    });
    await page.waitForTimeout(200);
    check('T5 group->pool returns image', await page.evaluate(() => imageGroups[1].length === 2));

    // T6 清空分组按钮（委托）
    await page.click('.group-box:first-child .clear-group-btn');
    await page.waitForTimeout(200);
    check('T6 clear-group via delegation', await page.evaluate(() => imageGroups.length === 1));

    // T7 拼接：宽度钳制 + quality 生效 + 重入保护
    await page.evaluate(async () => {
        clearAll();
        const mk = (w, h, name) => (async () => {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d'); g.fillStyle = '#3355aa'; g.fillRect(0, 0, w, h);
            const blob = await new Promise(r => c.toBlob(r, 'image/png'));
            handleImageUpload([new File([blob], name, { type: 'image/png', lastModified: 1700000300000 })]);
        })();
        await mk(2000, 3000, 'big1.png');
        await mk(2000, 3000, 'big2.png');
    });
    await page.waitForFunction(() => uploadedImages.length === 2, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    await page.fill('#groupSize', '2');
    await page.click('#autoGroupBtn');

    const size95 = await page.evaluate(async () => {
        const url = await stitchImages(imageGroups[0], 0.95);
        const blob = await fetch(url).then(r => r.blob());
        const bmp = await createImageBitmap(blob);
        window.__bigW = bmp.width; window.__bigH = bmp.height;
        return blob.size;
    });
    const size70 = await page.evaluate(async () => {
        const url = await stitchImages(imageGroups[0], 0.7);
        const blob = await fetch(url).then(r => r.blob());
        return blob.size;
    });
    check('T7 output width clamped to 1080', await page.evaluate(() => window.__bigW === 1080),
        `w=${await page.evaluate(() => window.__bigW)} h=${await page.evaluate(() => window.__bigH)}`);
    check('T7 height sane', await page.evaluate(() => window.__bigH === 3240));
    check('T7 quality 0.7 smaller than 0.95', size70 < size95, `q70=${size70} q95=${size95}`);

    await page.evaluate(() => {
        window.__calls = 0;
        const orig = stitchImages;
        window.stitchImages = (...a) => { window.__calls++; return new Promise(r => setTimeout(() => r(orig(...a)), 300)); };
        window.downloadImage = async () => {};
    });
    const p1 = page.evaluate(() => startStitching());
    await page.waitForTimeout(80);
    await page.evaluate(() => startStitching());
    await p1;
    check('T7 re-entry guarded', await page.evaluate(() => window.__calls === 1), `calls=${await page.evaluate(() => window.__calls)}`);
    check('T7 clearAllBtn restored', await page.evaluate(() => document.getElementById('clearAllBtn').disabled === false));

    // T8 触摸（CDP 注入触摸事件）：长按拖拽、组内重排、滚动不被劫持
    // 触摸坐标按视口命中，加高视口让图片池与分组同屏可见
    await page.setViewportSize({ width: 1280, height: 2400 });
    const session = await page.context().newCDPSession(page);
    const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
    const centerOf = sel => page.evaluate(sel => {
        const r = document.querySelector(sel).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, sel);

    await page.evaluate(() => clearAll());
    await page.evaluate(async () => {
        const mk = async (name, lm) => {
            const c = document.createElement('canvas'); c.width = 80; c.height = 100;
            const g = c.getContext('2d'); g.fillStyle = '#883355'; g.fillRect(0, 0, 80, 100);
            const blob = await new Promise(r => c.toBlob(r, 'image/png'));
            handleImageUpload([new File([blob], name, { type: 'image/png', lastModified: lm })]);
        };
        await mk('t1.png', 1700000000000);
        await mk('t2.png', 1700000100000);
        await mk('t3.png', 1700000200000);
    });
    await page.waitForFunction(() => uploadedImages.length === 3, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    await page.fill('#groupSize', '2');
    await page.click('#autoGroupBtn');
    // 清掉组2 => t3 回到池子
    await page.click('.group-box:nth-child(2) .clear-group-btn');
    await page.waitForTimeout(200);

    // pool(t3) -> 组1（长按 500ms 后拖过去）
    const from = await centerOf('#poolImages .pool-image:last-child');
    const g0 = await centerOf('.group-images[data-group-index="0"]');
    await touch('touchStart', [{ x: from.x, y: from.y }]);
    await page.waitForTimeout(500);
    await touch('touchMove', [{ x: g0.x, y: g0.y }]);
    await page.waitForTimeout(80);
    await touch('touchEnd', []);
    await page.waitForTimeout(200);
    check('T8 touch pool->group', await page.evaluate(() =>
        imageGroups[0].length === 3 && imageGroups[0].some(i => i.name === 't3.png')),
        JSON.stringify(await page.evaluate(() => imageGroups.map(g => g.map(i => i.name)))));

    // 组内重排：t3 拖到组1顶部 => 插到最前
    const tileRects = await page.evaluate(() => {
        const els = [...document.querySelectorAll('.group-images[data-group-index="0"] .group-image')];
        return els.map(el => {
            const r = el.getBoundingClientRect();
            return { name: uploadedImages.find(i => String(i.id) === el.dataset.imageId).name, x: r.left + 10, y: r.top + 10, top: r.top + 2 };
        });
    });
    const t3Tile = tileRects.find(t => t.name === 't3.png');
    const firstTop = tileRects[0].top;
    await touch('touchStart', [{ x: t3Tile.x, y: t3Tile.y }]);
    await page.waitForTimeout(500);
    await touch('touchMove', [{ x: t3Tile.x, y: firstTop }]);
    await page.waitForTimeout(80);
    await touch('touchEnd', []);
    await page.waitForTimeout(200);
    check('T8 touch same-group reorder to top', await page.evaluate(() =>
        imageGroups[0][0].name === 't3.png'), JSON.stringify(await page.evaluate(() => imageGroups.map(g => g.map(i => i.name)))));

    // 快速滑动：不应触发拖拽，数据不变
    await page.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 80; c.height = 100;
        const g = c.getContext('2d'); g.fillStyle = '#338855'; g.fillRect(0, 0, 80, 100);
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        handleImageUpload([new File([blob], 't4.png', { type: 'image/png', lastModified: 1700000300000 })]);
    });
    await page.waitForFunction(() => uploadedImages.length === 4, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const poolNow = await centerOf('#poolImages .pool-image:last-child');
    await touch('touchStart', [{ x: poolNow.x, y: poolNow.y }]);
    await page.waitForTimeout(50);
    await touch('touchMove', [{ x: poolNow.x, y: poolNow.y - 120 }]);
    await page.waitForTimeout(80);
    await touch('touchMove', [{ x: poolNow.x, y: poolNow.y - 240 }]);
    await touch('touchEnd', []);
    await page.waitForTimeout(200);
    check('T8 scroll gesture does not drag', await page.evaluate(() =>
        !document.querySelector('.dragging')));
    check('T8 scroll gesture no data change', await page.evaluate(() =>
        imageGroups[0].length === 3 && uploadedImages.length === 4 &&
        document.querySelectorAll('#poolImages .pool-image').length === 1),
        JSON.stringify(await page.evaluate(() => ({
            groups: imageGroups.map(g => g.map(i => i.name)),
            pool: [...document.querySelectorAll('#poolImages .pool-image')].map(el =>
                uploadedImages.find(i => String(i.id) === el.dataset.imageId)?.name),
        }))));
    const scrollAfter = await page.evaluate(() => window.scrollY);
    results.push({ name: 'T8 page scrolled natively (info)', pass: true, extra: `scrollY ${scrollBefore} -> ${scrollAfter}` });

    // T11 迷你实时预览
    await page.evaluate(() => clearAll());
    await page.evaluate(async () => {
        const mk = async (name, lm) => {
            const c = document.createElement('canvas'); c.width = 80; c.height = 100;
            const g = c.getContext('2d'); g.fillStyle = '#883355'; g.fillRect(0, 0, 80, 100);
            const blob = await new Promise(r => c.toBlob(r, 'image/png'));
            handleImageUpload([new File([blob], name, { type: 'image/png', lastModified: lm })]);
        };
        await mk('p1.png', 1700000000000);
        await mk('p2.png', 1700000100000);
    });
    await page.waitForFunction(() => uploadedImages.length === 2, null, { timeout: 8000 });
    await page.waitForTimeout(400);
    await page.fill('#groupSize', '2');
    await page.click('#autoGroupBtn');
    await page.waitForFunction(() =>
        document.querySelectorAll('.mini-preview').length >= 1 &&
        parseInt(document.querySelector('.mini-preview').dataset.renders || '0') >= 1,
        null, { timeout: 5000 });
    check('T11 mini preview canvas rendered', true);
    const rendersBefore = await page.evaluate(() => parseInt(document.querySelector('.mini-preview').dataset.renders));
    // 拖一张出组 => 迷你条应重画
    await page.evaluate(() => {
        __dnd('.group-images[data-group-index="0"] .group-image:nth-child(2)', '#poolImages');
    });
    await page.waitForTimeout(600);
    check('T11 mini preview re-renders after drag', await page.evaluate(n =>
        parseInt(document.querySelector('.mini-preview').dataset.renders) > n, rendersBefore));

    // T9 清空所有
    await page.evaluate(() => clearAll());
    check('T9 clearAll empties all', await page.evaluate(() =>
        uploadedImages.length === 0 && imageGroups.length === 0 &&
        document.querySelectorAll('#poolImages .pool-image').length === 0 &&
        document.querySelectorAll('#groupsContainer .group-box').length === 0));

    await page.screenshot({ path: path.join(__dirname, 'smoke-after.png'), fullPage: true });

    // T10 file:// 直开（CSP 含 file: 源，README 方法3）
    const page2 = await browser.newPage();
    const errors2 = [];
    page2.on('pageerror', e => errors2.push('pageerror: ' + e.message));
    page2.on('console', m => { if (m.type() === 'error') errors2.push('console: ' + m.text()); });
    await page2.goto('file:///' + ROOT.replace(/\\/g, '/') + '/index.html', { waitUntil: 'load' });
    await page2.waitForTimeout(1500);
    check('T10 file:// script runs (CSP ok)', await page2.evaluate(() =>
        typeof stitchImages === 'function' && typeof autoGroup === 'function'));
    check('T10 file:// no errors', errors2.length === 0, errors2.join(' | '));
    await page2.close();

    console.log(JSON.stringify(results, null, 1));
    console.log('CONSOLE/PAGE ERRORS:', errors.length ? JSON.stringify(errors) : 'none');
    await browser.close();
    server.close();
    const failed = results.filter(r => !r.pass);
    console.log(failed.length ? `FAILED: ${failed.length} -> ${failed.map(f => f.name).join(', ')}` : 'ALL PASS');
    process.exit(failed.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
