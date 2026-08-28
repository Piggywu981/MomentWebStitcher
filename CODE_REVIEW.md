# MomentWebStitcher 代码审查报告

- **审查日期**：2026-08-28
- **审查范围**：`script.js`（886 行）、`index.html`（75 行）、`style.css`（664 行）、`.github/workflows/deploy.yml`、`package.json`、`README.md`
- **审查方式**：人工通读 + 逐行走查，重点覆盖四条主路径：图片上传（含 EXIF 读取）、分组与拖拽交互（鼠标 + 触摸）、Canvas 拼接与导出、部署链路。

## 总体评价

项目是纯前端单页应用，零依赖、零构建，代码结构清晰。事件委托、分批上传、DocumentFragment 批量渲染、blob URL 回收等优化点体现了不错的性能意识。

但存在 **2 个会直接产生错误结果的功能级 bug**（输出质量参数失效、跨组移动图片落错组），以及若干影响移动端可用性的问题。项目的目标场景（手机上处理朋友圈素材）恰好会放大后者的影响，建议优先处理 P1 与移动端相关项。

## 修复状态

**全部 18 项（R1–R18）已于 2026-08-28 修复完毕**，并通过 Playwright 无头浏览器功能验证（17 项断言全部通过，无 console / page 错误），验证记录见文末。

## 问题清单

### P1 功能缺陷（必须修复）

#### R1 输出质量滑块完全无效 🔴

- **位置**：`script.js:771`、`script.js:870`
- **问题**：L771 已将滑块值换算为 0–1 区间（0.95），L870 传给 `canvas.toBlob` 时又乘回 100（得到 95）。`toBlob` 的 quality 合法范围是 0–1，越界值被浏览器忽略并回落到默认值 0.92——滑块从 70% 到 100% 的所有档位输出完全相同，用户调节无任何效果。
- **修复**：直接传 `quality`，不做二次换算。

#### R2 跨组移动图片会落错组 🔴

- **位置**：`script.js:693-727`
- **问题**：`addImageToGroup` 先调用 `removeImageFromGroups`，而后者会把搬空的组从 `imageGroups` 中 `filter` 掉，数组索引整体左移；随后 `imageGroups[groupIndex].push(image)` 仍使用移动前的索引，图片落入错位后的组。触发条件：把某组的最后一张图拖入其后的组，或在单图组内拖动图片。
- **修复**：在删除源之前先捕获目标组的引用，push 到引用上；空组清理延后到渲染阶段（`updateGroups`）统一做。

### P2 风险与可用性

#### R3 文件名未转义直接拼入 innerHTML 🟡

- **位置**：`script.js:223-238`
- **问题**：`${image.name}` 未做 HTML 转义。文件名含 `"` 会破坏 `alt` 属性（必现），含 HTML 片段可注入 DOM。本地自用场景危害有限（多为自 XSS），但属于注入隐患。
- **修复**：统一 `escapeHtml()` 处理文件名。

#### R4 base64 data URL 存图导致内存膨胀 🟡

- **位置**：`script.js:96-141`
- **问题**：每张图以 base64 字符串常驻内存（约原文件 1.37 倍），叠加 `uploadedImages` 长期持有。目标场景是几十张手机原图，移动端标签页容易崩溃。
- **修复**：改用 `URL.createObjectURL(file)`（exif-js 2.3.0 原生支持 `blob:` URL 读取 EXIF），并在删除/清空时 `revokeObjectURL`。

#### R5 拼接结果超出移动端 canvas 上限 🟡

- **位置**：`script.js:832-870`
- **问题**：手机照片宽度普遍 3000px+，多张竖排后 canvas 高度轻松破万，超出移动端 Safari 的 canvas 尺寸/面积限制后，`toBlob` 输出空白或直接失败。目标用户恰恰在移动端。
- **修复**：输出宽度钳制到 1080px（微信发圈会二次压缩，无感知差异）；总面积超限时等比缩小整条长图兜底。

#### R6 拼接过程未禁用按钮 🟡

- **位置**：`script.js:770-801`
- **问题**：处理循环期间「开始拼图」按钮仍可点击，连点导致重复处理与重复下载。
- **修复**：加运行标志 + `disabled`，`finally` 中恢复。

#### R7 触摸开始即 preventDefault，图片区无法滚动 🟡

- **位置**：`script.js:419-424`
- **问题**：手指落在任意缩略图上就 `preventDefault`，长按确认之前页面滚动已被抑制；图片池铺满屏幕时手机上基本滚不动，同时阻断捏合缩放。L548-574 的「手动命中删除按钮」逻辑正是该行为引入的补丁。
- **修复**：`touchstart` 不再 `preventDefault`，滚动交还浏览器（现有「移动超阈值取消长按」逻辑已能区分滚动与拖拽）；删除手动命中补丁，恢复原生 click；补 `contextmenu` 拦截防止安卓长按菜单。

#### R8 分组大小输入空值不拦截 🟡

- **位置**：`script.js:641-645`
- **问题**：输入框清空时 `parseInt` 得 `NaN`，`NaN <= 0` 为 `false`，不进 alert，直接按异常值切片生成一个大组。
- **修复**：条件补 `isNaN(groupSize) ||`。

#### R9 exif-js CDN 引用无 SRI 🟡

- **位置**：`index.html:8`
- **问题**：第三方 CDN 脚本无 `integrity` 校验，CDN 被污染即任意代码执行；且 exif-js 已停止维护。
- **修复**：补 `integrity` + `crossorigin="anonymous"`。

#### R10 README 与实现不符 🟡

- **位置**：`README.md`
- **问题**：
  1. 「支持文件和**文件夹**拖拽」未实现——drop 处理只读 `e.dataTransfer.files`，拖文件夹进来静默无反应；
  2. 「智能分组：根据图片数量自动设置合理的每组上限」无对应代码；
  3. 「输出质量 70-100%」在 R1 修复前不成立。
- **修复**：修正文案，补充输出宽度限制说明。

### P3 优化项

#### R11 上传区点击空白处无反应 🔵

- **位置**：`index.html:22-26`
- **问题**：`upload-area` 是 `cursor: pointer` + hover 动效，但只有内部按钮能打开文件选择，点击空白区域无反应，与视觉暗示不符。
- **修复**：整块绑定 click 触发 `fileInput.click()`，去掉按钮自身的 inline onclick（点击会冒泡，避免重复触发）。

#### R12 拖拽排序时数据模型全量重算 🔵

- **位置**：`script.js:364`
- **问题**：每个 `dragover` 事件都 `querySelectorAll` + 逐个 `getBoundingClientRect` 并全量重写 `imageGroups`，O(n²)/帧。
- **修复**：dragover 只做视觉重排，数据模型在 drop / dragend 时同步一次。

#### R13 document 级拖拽监听重复 🔵

- **位置**：`script.js:273`、`script.js:346-387`
- **问题**：两套 `dragover`、两套 `dragstart`/`dragend` 并行派发，逻辑重复。
- **修复**：合并为文档级各一套（dragstart/dragend/dragover），容器级只留高亮与 drop。

#### R14 分批上传后图片池顺序非时间序 🔵

- **位置**：`script.js:148`
- **问题**：每批内部排序后直接追加，图片池显示顺序 = 批次完成顺序而非拍摄时间顺序（自动分组会重排所以最终结果正确，但池子顺序与宣传的「时间排序」不符）。
- **修复**：全部分批完成后统一按拍摄时间排序再刷新。

#### R15 死代码 🔵

- **位置**：`script.js:184-196`；`style.css` 的 `.drag-enter` / `.sort-indicator` / `.drag-placeholder` / `.drag-active` 相关块
- **问题**：`throttle` 定义未使用；上述 CSS 类从未被 JS 添加（`drag-active` 只有移除逻辑）。
- **修复**：删除。

#### R16 viewport meta 重复 🔵

- **位置**：`index.html:5`、`index.html:9`
- **问题**：两条 viewport 声明，后者生效；`user-scalable=no` 对无障碍不友好。
- **修复**：删除后者。

#### R17 deploy.yml 过时 🔵

- **位置**：`.github/workflows/deploy.yml`
- **问题**：`checkout@v3` / `setup-node@v3` / `peaceiris/actions-gh-pages@v3` 均为 Node 16 runtime（已弃用）；零依赖静态站执行 `npm install` + `npm run build`（内容是 echo）为空转；`pull_request` 触发只是空跑。
- **修复**：升级 v4，删除空转步骤与 pull_request 触发。

#### R18 img 原生可拖拽干扰自定义拖拽 🔵

- **位置**：`style.css`、`script.js:250`
- **问题**：`img` 默认 `draggable`，从图片像素区起拖时 `dragstart` 目标是 img 而非容器 div，`dataset.imageId` 读不到，拖拽可能失效。
- **修复**：缩略图 `pointer-events: none`，使拖拽/触摸目标确定化为容器 div。

### 附带发现

- **单图分组被静默跳过**：拼接循环跳过 `length < 2` 的组但无任何提示，用户会以为图片丢了。随 R6 一并在进度文案中提示。

## 修复顺序

R1 → R2 → R4 → R5 → R6 → R8 → R14 → R7 → R3 → R9 → R11 / R16 → R12 / R13 → R15 → R18 → R17 → R10

## 验证记录

修复后实际执行的验证（本地静态服务 + Playwright 无头 Chromium）：

| # | 验证项 | 结果 |
|---|--------|------|
| S0 | exif-js 经 SRI 校验正常加载（`typeof EXIF !== 'undefined'`） | ✅ |
| T1 | 注入 3 张合成图：`uploadedImages` 为 3、全部为 `blob:` URL、图片池渲染 3 个、时间兜底有效、完成后按时间排序、含 `<svg/onload=...>` 的文件名被正确转义（无注入节点） | ✅ |
| T2 | R2 回归：`imageGroups = [[a],[b,c]]` 执行 `addImageToGroup(a, 1)` 后，结果为 `[[b,c,a]]`，DOM `data-group-index` 与数据索引一致 | ✅ |
| T3 | `groupSize` 输入空串触发 `isNaN` 拦截并 alert | ✅ |
| T4 | `autoGroup` 按每组 2 张得到 `[2,1]`，拼图按钮正确启用 | ✅ |
| T5 | 2000px 宽原图拼接：输出宽度被钳制为 1080、高度 3240 符合预期；quality 0.7 产物小于 quality 0.95（滑块生效） | ✅ |
| T6 | 拼接期间二次调用 `startStitching` 被重入保护拦截（仅 1 次调用），结束后按钮恢复 | ✅ |
| T7 | `clearAll` 清空数据、图片池与分组 DOM | ✅ |

全程无 console error / pageerror。另外 `node --check script.js` 语法校验通过。
