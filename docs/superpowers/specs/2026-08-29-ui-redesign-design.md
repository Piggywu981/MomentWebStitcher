# MomentWebStitcher UI 重构设计规格：柔和奶油 × 双形态

- 日期：2026-08-29
- 状态：待用户审查
- 前置文档：`CODE_REVIEW.md`（两轮审查与修复记录）
- 决策来源：视觉伴侣头脑风暴（风格 B 柔和奶油、范围大胆重排、布局 B 迷你条内联、细节全选：SVG 图标 / 暗色模式 / 动效 / 结果卡片 / 实时预览）

## 1. 目标与非目标

**目标**

1. 用「柔和奶油」设计语言替换现有紫渐变 + 灰卡片的模板感界面
2. 桌面双栏（池｜分组）、手机单列 + 底部操作栏的双形态自适应布局
3. 每张分组卡片内置实时迷你长图预览条，编辑后 300ms 内自动重画；可放大为全屏预览
4. 拼接结果改为结果卡片展示（预览 + 手动保存），替代直接触发下载
5. 暗色模式跟随系统；全站动效；emoji 换内联 SVG 图标

**非目标**

- 不改拼接算法、输出宽度钳制、EXIF 排序逻辑
- 不引入任何框架/图标库/字体文件（零依赖与 CSP 白名单不变）
- 不做「拖图直接落长图」的舞台式交互（评估过，成本不值）
- 不改部署流程与 CI

## 2. 设计令牌（CSS Custom Properties）

所有颜色、圆角、阴影、间距收进 `:root` 变量；暗色模式通过 `@media (prefers-color-scheme: dark)` 覆盖变量实现，组件样式只引用变量。

| 令牌 | 亮色 | 暗色 |
|------|------|------|
| `--bg` | `#F5EFE9` | `#201914` |
| `--surface` | `#FFFDF9` | `#2A211B` |
| `--surface-2`（内嵌区/拖放区） | `#FFF6EE` | `#332821` |
| `--primary` | `#FF7A4D` | `#FF8A5E` |
| `--primary-strong`（按压/hover） | `#F0663A` | `#FF9E78` |
| `--primary-soft`（badge/高亮底） | `#FFF1E6` | `#4A3327` |
| `--text` | `#3D2E24` | `#F3EAE2` |
| `--text-2`（次要） | `#B0947E` | `#C4A88E` |
| `--hairline`（发丝线/边框） | `#F3E7DC` | `#3A2E25` |
| `--shadow` | `0 2px 12px rgba(180,140,110,.12)` | `0 2px 12px rgba(0,0,0,.35)` |

圆角：卡片 16px、磁贴 10px、小件 8px、胶囊 999px。字体沿用现有系统栈。品牌符号仅保留标题中的 ✿ 一个，其余 emoji 全部替换。

## 3. 图标系统

手写内联 SVG（`stroke="currentColor"`，1.8px 圆头描边，24 viewBox），由 JS 常量对象注入，共 9 个：

`plus`（添加）、`image`（图片）、`layers`（分组）、`x`（删除/关闭）、`grip`（拖拽把手）、`download`（保存）、`sliders`（参数）、`chevron`（折叠）、`expand`（放大预览）。

按钮/图标统一 `<svg aria-hidden="true">`，语义由按钮的 `aria-label` 承担。

## 4. 布局结构

### 4.1 桌面（≥960px）

居中容器 max-width 1280px，顶部极简页头（品牌字 + 一句标语），主体两栏：

- **左栏 · 图片池**：拖放卡（空态）或「＋ 添加照片 · 已选 N 张」摘要条，下方磁贴网格（缩略图 + 悬浮 × 删除）
- **右栏 · 工作台**：参数行（每组数量步进输入 + 自动分组按钮 + 质量滑块）→ 分组卡片列表 → 底部操作区（清空所有 + 开始拼图主按钮）

分组卡片拖拽：磁贴可跨组/池拖动、组内重排，全部沿用现有 HTML5 DnD 与触摸逻辑（类名与事件流不变）。

### 4.2 移动（<960px）

单列自上而下：页头 → 拖放摘要卡 → 图片池横向滚动磁贴条 → 分组卡片列表（可折叠）→ **固定底部操作栏**：`[⚙ 参数] [开始拼图]`。

⚙ 打开底部抽屉（参数面板）：每组数量步进器 + 输出质量滑块。桌面不出现底部栏与抽屉。

### 4.3 分组卡片（两端共用）

头部：`第 N 组` + 张数胶囊 + **迷你长图预览条**（点击放大）+ 折叠 chevron + 清空按钮。
体：纵向磁贴行（缩略图 + 文件名 + 拍摄时间 + grip 把手 + ×），拖拽排序/跨组移动沿用现有逻辑。空组由现有 `updateGroups` 清理，不渲染。

### 4.4 全屏预览浮层

点击迷你条或卡片「放大」打开：暗色半透明背景 + 居中长图（宽 480px、高度上限 80vh 内部滚动）+ 组号切换 ‹ › + 输出像素尺寸 + 关闭按钮。打开时按最新模型渲染一次（打开期间模型不会变，无需 LIVE）。

## 5. 实时迷你预览

- **渲染单元**：每张分组卡片头部一个 `<canvas>`，逻辑宽 40px（×devicePixelRatio 取整），高按组内容纵横比自适应，上限 160px 超出内部滚动
- **触发**：`insertImageIntoGroup` / `removeImageFromGroups` / `removeImage` / `clearGroup` / `clearAll` / `updateGroupOrder` 后，防抖 250ms 重画受影响组（质量滑块只影响导出压缩率，不改变预览像素，不触发重画）
- **性能**：图片解码按 `image.id` 全局缓存复用；渲染带代数计数器，新渲染请求取消挂起的旧渲染；单组重画只动自己的 canvas
- **空态**：组内 0 张不渲染（组已被清理）；1 张时显示「再选 1 张即可拼接」提示条
- **信息**：输出尺寸 `输出宽 × 总高 px` 显示在全屏预览浮层内（复用 `stitchImages` 的 `heightAt` 布局计算，抽出为独立函数 `computeStitchLayout(images, width)` 供预览与导出共用，保证所见即所得）；迷你条以 `title` 属性附带同一信息（触屏无副作用）

## 6. 动效规格

统一 150–250ms `ease-out`：磁贴 hover 抬升 2px + 阴影、按钮按压 `scale(.97)`、拖拽 ghost 旋转缩放（沿用现有）+ 落点虚线指示、分组折叠高度过渡、底部抽屉/浮层滑入滑出、进度条渐变流动、结果卡片上滑入场。`prefers-reduced-motion: reduce` 时全部过渡时长归零。触摸长按拖拽行为不变。

## 7. 结果卡片

`startStitching` 完成后不再逐组直接触发下载，改为：收集各组结果（blob URL + 文件名），弹出结果卡片——

- 单组：预览长图 + 文件名 + `[保存到本地]`（调用现有 `downloadImage`）+ `[完成]`
- 多组：纵向缩略图列表，每组单独保存，附「全部保存」按钮

进度条与「处理第 N 组」文案行为不变。处理中按钮锁定逻辑（`isStitching`、清空按钮禁用）不变。

## 8. 技术实现约束（硬性）

1. **零依赖**：无框架、无图标库、无字体、无新外链；SVG 手写内联
2. **CSP 合规**：无内联事件处理器、无内联 `<script>`；样式走 stylesheet 与 `<style>` 注入（现行 CSP 已允许）
3. **测试兼容承诺**：现有 33 项断言不改一行必须通过——以下钩子原样保留：
   - ID：`uploadArea` `fileInput` `groupSize` `autoGroupBtn` `qualitySlider` `qualityValue` `stitchBtn` `clearAllBtn` `groupsContainer` `poolImages` `progressFill` `progressText`
   - 类名：`.pool-image` `.group-image` `.group-images` `[data-group-index]` `.remove-btn` `.clear-group-btn` `.dragging` `.drag-over` `.group-box`
   - JS 全局函数：`handleImageUpload` `autoGroup` `startStitching` `clearAll` `clearGroup` `insertImageIntoGroup` `removeImageFromGroups` `updateGroups` `updateImagePool` `stitchImages` `downloadImage` `getFileDate` 及全局状态 `uploadedImages` `imageGroups` `isStitching`
4. **改动文件**：`style.css` 重写（令牌 + 组件）；`index.html` 结构重排（ID 不变）；`script.js` 加法改造（图标注入、迷你预览模块、抽屉、浮层、结果卡片、布局类名切换）

## 9. 测试与验收

- `npm test` 33 项断言全部通过（不改测试）
- 新增断言：迷你预览 canvas 存在且随拖拽更新（对比前后像素或重画计数）、全屏预览浮层开合、结果卡片出现与保存按钮触发
- 手动验收：桌面拖拽全链路、真机触摸长按/滚动/抽屉、亮暗两套配色目检、`file://` 直开正常

## 10. 风险与对策

| 风险 | 对策 |
|------|------|
| 迷你预览连续拖拽卡顿 | 40px 低分辨率 + 解码缓存 + 防抖 + 代数计数，单组重画 |
| 超长图浮层溢出 | 高度上限 80vh 内部滚动 |
| 布局重排碰坏测试钩子 | 钩子清单在实现计划中逐条核对，`npm test` 兜底 |
| 暗色对比度不足 | `--text-2` 在暗色下提亮至 `#C4A88E`，目检清单包含暗色 |
