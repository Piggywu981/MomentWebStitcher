# README 重写实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用新 UI 的真实截图与 SVG 示意图重写 README，去 emoji、去重复，产出约 150 行的中文专业风单文件文档。

**Architecture:** 三个产出物——(1) Playwright 临时脚本驱动本地服务注入程序化示例照片并截图，(2) 手写 SVG 流程示意图，(3) 全新 README.md。截图与 SVG 存入仓库 `docs/images/`，临时脚本留在临时工作目录不入仓库。

**Tech Stack:** Node.js + Playwright（仅本地开发用，不影响项目零依赖运行）、静态 SVG、Markdown。

**设计文档:** `docs/superpowers/specs/2026-08-29-readme-rewrite-design.md`

**背景事实（执行者必读）:**
- 仓库根：`d:\Github\MomentWebStitcher`（Windows，终端为 PowerShell 5；用户偏好 WSL bash，但 Playwright/Chromium 与项目依赖绑定在 Windows 侧，本计划统一用 PowerShell 执行）。
- `index.html` 的 CSP 允许页内 canvas 生成 blob 并通过 `handleImageUpload(files)` 全局函数上传（`tests/smoke.test.js` 已验证此路径）。
- 页面全局函数：`handleImageUpload(files)`、`autoGroup()`（由 `#autoGroupBtn` 触发）、`clearAll()`；`#groupSize` 输入框默认 9；`#qualitySlider` 默认 95。
- 部署：`.github/workflows/deploy.yml` 在 push 到 main 时自动把 `index.html`/`style.css`/`script.js` 发布到 gh-pages 分支。
- 技术常量：`MAX_OUTPUT_WIDTH = 1080`、`MAX_CANVAS_AREA = 16777216`（script.js:10-11）。
- 在线地址：https://piggywu981.github.io/MomentWebStitcher/ ；仓库地址：https://github.com/Piggywu981/MomentWebStitcher

---

### Task 1: 生成真实 UI 截图

**Files:**
- Create (临时，不入仓库): `c:\Users\piggy\.trae-cn\work\6a91e0ebc564f4bc3aa2c670\shot.js`
- Create: `docs/images/screenshot-desktop.png`
- Create: `docs/images/screenshot-mobile.png`

- [ ] **Step 1: 准备 Node 与 Playwright 环境**

在临时工作目录独立安装 playwright（不修改项目 `package.json`）。Chromium 已装过时此步很快（走 `%LOCALAPPDATA%\ms-playwright` 缓存）。

```powershell
node --version
cd c:\Users\piggy\.trae-cn\work\6a91e0ebc564f4bc3aa2c670
npm init -y
npm i playwright
npx playwright install chromium
```

预期：`node --version` 输出 v18+；`npm i playwright` 与 `npx playwright install chromium` 均成功退出（exit code 0）。

- [ ] **Step 2: 编写截图脚本**

完整写入 `c:\Users\piggy\.trae-cn\work\6a91e0ebc564f4bc3aa2c670\shot.js`：

```javascript
/**
 * README 截图脚本：起本地静态服务，向页面注入程序化生成的示例照片并自动分组，
 * 分别截取桌面与手机视图。输出到仓库 docs/images/。
 * 运行：node shot.js（需已安装 playwright + chromium）
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'd:/Github/MomentWebStitcher';
const OUT_DIR = path.join(ROOT, 'docs', 'images');
const PORT = 8901;
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
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const server = await startServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(800);

    // 程序化生成 9 张不同色调的竖版示例照片（3:4，模拟手机照片），带两位编号水印
    await page.evaluate(async () => {
        const palettes = [
            ['#f6d365', '#fda085'], ['#a1c4fd', '#c2e9fb'], ['#d4fc79', '#96e6a1'],
            ['#fbc2eb', '#a6c1ee'], ['#84fab0', '#8fd3f4'], ['#fddb92', '#d1fdff'],
            ['#ffecd2', '#fcb69f'], ['#e0c3fc', '#8ec5fc'], ['#f093fb', '#f5576c'],
        ];
        const mk = async (i) => {
            const c = document.createElement('canvas');
            c.width = 900; c.height = 1200;
            const g = c.getContext('2d');
            const grad = g.createLinearGradient(0, 0, c.width, c.height);
            grad.addColorStop(0, palettes[i][0]);
            grad.addColorStop(1, palettes[i][1]);
            g.fillStyle = grad;
            g.fillRect(0, 0, c.width, c.height);
            g.fillStyle = 'rgba(255,255,255,0.85)';
            g.font = 'bold 160px sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(String(i + 1).padStart(2, '0'), c.width / 2, c.height / 2);
            const blob = await new Promise(r => c.toBlob(r, 'image/png'));
            return new File([blob], `photo_${String(i + 1).padStart(2, '0')}.png`,
                { type: 'image/png', lastModified: 1700000000000 + i * 60000 });
        };
        const files = [];
        for (let i = 0; i < 9; i++) files.push(await mk(i));
        handleImageUpload(files);
    });
    await page.waitForFunction(
        () => document.querySelectorAll('#poolImages .pool-image').length === 9,
        null, { timeout: 8000 });
    await page.waitForTimeout(400);

    // 每组 9 张 → 自动分组为一组
    await page.fill('#groupSize', '9');
    await page.click('#autoGroupBtn');
    await page.waitForFunction(
        () => document.querySelectorAll('#groupsContainer .group-box').length === 1,
        null, { timeout: 8000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-desktop.png'), fullPage: true });

    // 手机视图（同一内容，换视口）
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-mobile.png'), fullPage: true });

    await browser.close();
    server.close();
    console.log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: 运行脚本生成截图**

```powershell
cd c:\Users\piggy\.trae-cn\work\6a91e0ebc564f4bc3aa2c670
node shot.js
```

预期：输出 `DONE`；`d:\Github\MomentWebStitcher\docs\images\` 下生成 `screenshot-desktop.png` 与 `screenshot-mobile.png`（每个数百 KB 量级）。

若报 `page.goto` 超时：检查是否有其他进程占用 8901 端口，可改脚本中的 `PORT` 重跑。

- [ ] **Step 4: 目检截图**

用 Read 工具（图片模式）分别查看两张 PNG，确认：
1. 界面为新版 UI（图片池 + 参数行 + 分组卡片 + 底部操作栏），无样式错乱或空白。
2. 图片池为空、存在 1 个含 9 张照片的分组卡片（缩略图可见彩色渐变与编号）。
3. 手机截图呈现单列响应式布局。

若截图内容异常（空白、无照片），先在脚本 `page.waitForTimeout` 后加 `await page.screenshot` 调试，或检查 `handleImageUpload` 是否被 CSP 拦截（对照 smoke.test.js 的用法排查），修正后重跑 Step 3。

- [ ] **Step 5: 提交截图**

```powershell
cd d:\Github\MomentWebStitcher
git add docs/images/screenshot-desktop.png docs/images/screenshot-mobile.png
git commit -m "docs: add README screenshots of new UI"
```

预期：commit 成功，仅包含 2 个图片文件。

---

### Task 2: 绘制流程示意图 workflow.svg

**Files:**
- Create: `docs/images/workflow.svg`

- [ ] **Step 1: 写入 SVG 文件**

完整写入 `d:\Github\MomentWebStitcher\docs\images\workflow.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="920" height="300" viewBox="0 0 920 300" font-family="system-ui, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
    </marker>
  </defs>

  <rect width="920" height="300" fill="#f8fafc"/>

  <!-- 步骤 1：上传照片 -->
  <rect x="40" y="70" width="170" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="125" y="100" text-anchor="middle" font-size="18" font-weight="600" fill="#1e293b">1. 上传照片</text>
  <text x="125" y="126" text-anchor="middle" font-size="13" fill="#64748b">拖拽 / 点击批量添加</text>

  <!-- 步骤 2：分组整理 -->
  <rect x="265" y="70" width="170" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="350" y="100" text-anchor="middle" font-size="18" font-weight="600" fill="#1e293b">2. 分组整理</text>
  <text x="350" y="126" text-anchor="middle" font-size="13" fill="#64748b">自动分组 · 手动拖拽</text>

  <!-- 步骤 3：Canvas 拼接 -->
  <rect x="490" y="70" width="170" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="575" y="100" text-anchor="middle" font-size="18" font-weight="600" fill="#1e293b">3. Canvas 拼接</text>
  <text x="575" y="126" text-anchor="middle" font-size="13" fill="#64748b">垂直拼接 · 质量压缩</text>

  <!-- 步骤 4：导出保存 -->
  <rect x="715" y="70" width="170" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="800" y="100" text-anchor="middle" font-size="18" font-weight="600" fill="#1e293b">4. 导出保存</text>
  <text x="800" y="126" text-anchor="middle" font-size="13" fill="#64748b">结果卡片 · 全部保存</text>

  <!-- 箭头 -->
  <line x1="212" y1="106" x2="259" y2="106" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="437" y1="106" x2="484" y2="106" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="662" y1="106" x2="709" y2="106" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- 标注 1：EXIF 排序 -->
  <rect x="230" y="180" width="240" height="44" rx="8" fill="#eef2ff" stroke="#818cf8" stroke-width="1"/>
  <text x="350" y="198" text-anchor="middle" font-size="13" fill="#4338ca">按 EXIF 拍摄时间早到晚排序</text>
  <text x="350" y="215" text-anchor="middle" font-size="11" fill="#6366f1">无拍摄时间时按文件时间排其后</text>
  <line x1="350" y1="142" x2="350" y2="180" stroke="#818cf8" stroke-width="1" stroke-dasharray="3,3"/>

  <!-- 标注 2：输出限制 -->
  <rect x="480" y="180" width="190" height="44" rx="8" fill="#ecfdf5" stroke="#34d399" stroke-width="1"/>
  <text x="575" y="198" text-anchor="middle" font-size="13" fill="#047857">输出宽度上限 1080px</text>
  <text x="575" y="215" text-anchor="middle" font-size="11" fill="#059669">适配朋友圈，超长等比缩小</text>
  <line x1="575" y1="142" x2="575" y2="180" stroke="#34d399" stroke-width="1" stroke-dasharray="3,3"/>

  <!-- 底注 -->
  <text x="460" y="268" text-anchor="middle" font-size="12" fill="#94a3b8">全程在浏览器本地完成，照片不上传服务器</text>
</svg>
```

- [ ] **Step 2: 校验 SVG**

用 Read 工具查看文件确认无语法截断；标签配对完整（`<svg>`/`<defs>`/`<text>` 闭合）。可选：在浏览器直接打开该文件确认渲染出 4 个步骤框、3 个箭头、2 个标注。

- [ ] **Step 3: 提交**

```powershell
cd d:\Github\MomentWebStitcher
git add docs/images/workflow.svg
git commit -m "docs: add processing workflow diagram"
```

---

### Task 3: 重写 README.md

**Files:**
- Modify: `README.md`（全文替换）

- [ ] **Step 1: 用以下完整内容替换 README.md**

````markdown
# MomentWebStitcher

网页版朋友圈长图拼接工具：把多张照片按组垂直拼接为适合社交分享的长图。纯前端实现，所有处理都在浏览器本地完成，照片不经过任何服务器。

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Processing: Browser-Only](https://img.shields.io/badge/Processing-Browser--Only-blue)
![Backend: None](https://img.shields.io/badge/Backend-None-success)

**在线使用**：<https://piggywu981.github.io/MomentWebStitcher/>

![桌面端界面](docs/images/screenshot-desktop.png)

## 功能特性

- **分组拼接**：自定义每组照片数量（默认 9 张，对应朋友圈九宫格），一键自动分组，每组输出一张长图
- **拍摄时间排序**：自动读取照片 EXIF 拍摄时间，按早到晚排序；无拍摄时间的照片按文件时间排在其后
- **拖拽整理**：照片可在图片池与分组之间自由拖拽，支持按落点位置插入与组内排序
- **触屏友好**：长按拖拽、震动反馈、防误触设计，专为手机与平板优化
- **实时预览**：每组提供迷你实时预览，支持全屏查看拼接效果
- **本地处理**：基于 Canvas 的拼接与压缩全部在浏览器内完成，无需上传

## 界面概览

![手机端界面](docs/images/screenshot-mobile.png)

- **图片池**：上传入口与待分组照片
- **分组区**：每组数量、输出质量、自动分组按钮，以及各分组卡片（迷你预览、清空、展开预览）
- **底部操作栏**：参数面板开关、处理进度、清空所有、开始拼图

## 快速开始

### 在线使用

打开 <https://piggywu981.github.io/MomentWebStitcher/> 即可，无需安装。

### 本地运行

```bash
git clone https://github.com/Piggywu981/MomentWebStitcher.git
cd MomentWebStitcher
```

任选一种方式启动：

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server .
```

然后访问 <http://localhost:8000>。也可以直接双击 index.html 打开（页面 CSP 已适配 file:// 场景）。

## 使用指南

1. **上传照片**：将照片拖入图片池，或点击"选择图片"批量添加
2. **分组**：设置每组数量后点击"自动分组"；也可以把照片在图片池与分组之间拖拽（按落点位置插入），或在分组内拖拽调整顺序
3. **拼接**：点击"开始拼图"，实时查看进度，完成后在结果卡片中单张保存或全部保存
4. **输出参数**：质量滑块（70–100%，默认 95%）；输出宽度自动限制在 1080px 内，超长图等比缩小

### 触屏手势（手机 / 平板）

| 操作 | 说明 |
|------|------|
| 长按约 400ms 后拖动 | 开始拖拽照片 |
| 拖到目标位置松手 | 放置照片，按落点位置插入 |
| 拖回图片池 | 将照片从分组移回待分组 |
| 点击缩略图上的 × | 删除照片 |
| 轻微移动后松手 | 不触发拖拽（防误触） |

## 技术实现

![处理流程](docs/images/workflow.svg)

- **技术栈**：HTML5 + CSS3 + 原生 JavaScript（ES6+）、Canvas API、Drag & Drop / Touch Events、Vibration API；唯一外部依赖为 exif-js（cdnjs 加载，带 SRI 校验）
- **输出限制**：宽度上限 1080px——朋友圈展示与微信二次压缩均以该宽度为准；Canvas 总面积上限 16777216 px²，规避移动端 Safari 大画布输出空白问题
- **浏览器兼容**：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+
- **支持格式**：JPEG / PNG / WebP / BMP；无法解码的文件（如 iPhone 的 HEIC 原图）会被自动跳过并提示

## 开发

```text
MomentWebStitcher/
├── index.html                     # 主页面
├── style.css                      # 样式
├── script.js                      # 核心逻辑
├── tests/
│   ├── smoke.test.js              # Playwright 冒烟测试
│   └── smoke-after.png            # 测试运行产物截图
├── docs/
│   ├── images/                    # README 配图
│   └── superpowers/               # 设计与实施文档
├── .github/workflows/deploy.yml   # GitHub Pages 自动部署
├── package.json
└── LICENSE
```

运行冒烟测试（覆盖上传、EXIF 排序、拖拽、触摸、拼接等主流程）：

```bash
npm i -D playwright
npx playwright install chromium
npm test
```

测试为可选的开发依赖，不影响线上零依赖运行。

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）会自动把 `index.html`、`style.css`、`script.js` 发布到 `gh-pages` 分支。首次使用需在仓库 Settings → Pages 中将 Source 设置为 `gh-pages` 分支。

## 常见问题

**照片数据会上传吗？**
不会。上传、排序、拼接、压缩全部在浏览器本地完成，无任何网络上传。

**为什么处理速度慢？**
拼接在浏览器端进行，大图处理需要时间。建议减少单次照片数量、使用较小的原图、关闭其他占用资源的标签页。

**有文件大小限制吗？**
浏览器通常限制单文件约 100MB，建议单张照片不超过 10MB，单次处理不超过 50 张。

**为什么有些照片上传后不见了？**
浏览器无法解码的格式（如 iPhone 的 HEIC 原图）会被自动跳过并提示，请先转换为 JPG/PNG。

**如何调整照片顺序？**
在分组内拖拽即可排序；也可以把照片拖回图片池重新分配。

**可以横向拼接吗？**
当前版本仅支持垂直拼接，横向拼接计划在后续版本支持。

## 许可证

[MIT](LICENSE)
````

- [ ] **Step 2: 提交**

```powershell
cd d:\Github\MomentWebStitcher
git add README.md
git commit -m "docs: rewrite README for new UI"
```

---

### Task 4: 终验收

**Files:** 无新增，只读检查。

- [ ] **Step 1: 检查残留外链与过时内容**

用 Grep 在 `README.md` 中搜索 `user-attachments`，预期 0 匹配（旧外链截图已移除）。
用 Grep 在 `README.md` 中搜索 `docs/images/`，预期 3 处匹配（desktop / mobile / workflow）。

- [ ] **Step 2: 检查 emoji 残留**

用 Grep 在 `README.md` 中按 unicode 范围搜索 emoji（pattern：`[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2190}-\x{21FF}\x{2B00}-\x{2BFF}]`，需启用 unicode 支持），预期 0 匹配。若工具不支持该 pattern，改为人工通读 README 确认无 emoji、颜文字、删除线文字。

- [ ] **Step 3: 核对图片文件与行数**

```powershell
Get-ChildItem d:\Github\MomentWebStitcher\docs\images
(Get-Content d:\Github\MomentWebStitcher\README.md).Count
```

预期：`docs/images/` 恰好 3 个文件（screenshot-desktop.png、screenshot-mobile.png、workflow.svg）；README 行数在 105–195 之间。

- [ ] **Step 4: 确认无临时文件残留**

```powershell
cd d:\Github\MomentWebStitcher
git status
```

预期：working tree clean（临时脚本与 node_modules 都在 `c:\Users\piggy\.trae-cn\work\...`，不在仓库内）。临时工作目录中的 `shot.js`、`node_modules` 保留（不删除，供后续复用），无需处理。

- [ ] **Step 5: 汇报结果**

向用户汇报：README 重写完成，附 computer:// 链接指向新 README 与三张配图。
