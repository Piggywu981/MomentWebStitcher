# MomentWebStitcher

网页版朋友圈长图拼接工具：把多张照片按分组垂直拼接成适合社交分享的长图。项目为纯前端实现，图片读取、排序、拼接和压缩全部在浏览器本地完成，**图片数据不会上传服务器**；拼接在 Web Worker 后台线程执行，不阻塞界面。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Build: Vite](https://img.shields.io/badge/Build-Vite-6BA81E.svg)](https://vitejs.dev/)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)
[![Tests: Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18.svg)](https://vitest.dev/)
[![Deploy: GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-success.svg)](https://piggywu981.github.io/MomentWebStitcher/)

**在线使用：** <https://piggywu981.github.io/MomentWebStitcher/>
**旧版入口：** <https://piggywu981.github.io/MomentWebStitcher/legacy/>

> 本项目为 **rewrite（重写版）**：基于 Vite + TypeScript 的模块化实现。若需纯静态版，可使用上方旧版入口（见「新旧版本」章节）。

## 功能特性

- **批量上传：** 支持点击选择或拖拽添加多张图片，单张不超过 50 MB、单次最多 200 张。
- **自动分组：** 自定义每组图片数量，一键生成多个分组；默认值为 9 张。
- **时间排序：** 优先按修改时间排序（图片 `src` 为本地 Data URL，可在上传流程中扩展 EXIF 读取）。
- **拖拽整理：** 图片可以在图片池和分组之间移动，也可以在组内拖拽调整顺序。
- **Web Worker 后台拼接：** 使用 `OffscreenCanvas` + `ImageBitmap` 在后台线程完成缩放与垂直拼接，界面不卡顿，并支持进度反馈。
- **撤销 / 重做：** 基于命令模式（Command Pattern）管理完整操作历史，支持 50 步。
- **本地持久化：** 图片数据存入 **IndexedDB**，界面状态以轻量元数据存入 **localStorage**，刷新页面不丢失。
- **结果预览：** 拼接完成后在「拼接结果」区预览每个分组的合成图，支持单条下载与一键下载全部。
- **暗色 / 亮色主题：** 响应式设计，跟随系统或手动切换。
- **移动端适配：** 支持手机和平板的触屏拖拽。
- **快捷键支持：** 常用操作均有键盘快捷键。
- **版本切换：** 内置新版 / 旧版切换入口。

## 快速开始

### 在线使用

打开 <https://piggywu981.github.io/MomentWebStitcher/>，无需安装即可使用。

### 本地运行

```bash
git clone https://github.com/Piggywu981/MomentWebStitcher.git
cd MomentWebStitcher

# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建生产版本（输出到 dist/）
npm run build
```

> 本项目是构建型工程，需要 **Node.js 18+** 环境（与旧版纯静态站不同）。

## 使用流程

### 1. 上传照片

将照片拖入上传区域，或点击选择图片文件批量添加。支持 JPG / PNG / WebP / BMP 等格式。

### 2. 分组整理

在「分组管理」中设置每组数量并点击「自动分组」，或手动「新建分组」。随后可以：

- 将图片从图片池拖拽到指定分组；
- 在分组之间移动图片；
- 在同一分组内拖拽调整顺序；
- 点分组「清空」释放该组图片、「删除」移除分组。

### 3. 设置输出参数

在右侧「输出设置」中调整输出质量（70%～100%，默认 95%）与输出格式（JPEG / PNG / WebP）。

### 4. 开始拼接

点击「开始拼接」，应用会逐组处理可拼接的分组并显示进度；拼接在 Web Worker 后台执行。

### 5. 预览与下载

处理完成后，结果会在左侧「拼接结果」区生成卡片预览（含分组名与输出尺寸）。可点击单个「下载」，或「下载全部」一次保存。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| Ctrl / Cmd + O | 添加图片 |
| Ctrl / Cmd + Enter | 开始拼接 |
| Ctrl / Cmd + Z | 撤销 |
| Ctrl / Cmd + Y 或 Ctrl / Cmd + Shift + Z | 重做 |
| Ctrl + Shift + C | 清空所有 |

## 输出规则

- **拼接方向：** 当前版本仅支持垂直拼接。
- **质量范围：** 输出质量 70%～100%，默认 95%。
- **输出宽度：** 取分组内所有图片的最小原图宽度。
- **输出格式：** JPEG / PNG / WebP，默认为 JPEG。
- **分组限制：** 每个包含至少 2 张图片的分组生成一个文件；仅 1 张图片的分组会被跳过并提示。
- **文件名：** `分组名_时间戳.格式`，避免同名覆盖。

## 支持格式与兼容性

### 图片格式

常见的 JPEG / JPG、PNG、WebP、BMP、TIFF 等图片通常可以直接处理，实际支持范围取决于浏览器解码能力。浏览器无法解码的格式（例如部分 iPhone 的 HEIC 原图）会被跳过并提示，建议先转换为 JPG 或 PNG。

### 浏览器

需支持 `OffscreenCanvas` 与 `createImageBitmap`，建议：

- Chrome 90+
- Firefox 100+
- Safari 16.4+
- Edge 90+

## 技术实现

- **构建工具：** Vite 6（`worker.format: 'es'`，`base: './'`）。
- **语言：** TypeScript（严格模式）。
- **样式：** Tailwind CSS + CSS 自定义属性（暗色 / 亮色主题）。
- **测试：** Vitest（jsdom 环境）。
- **代码规范：** ESLint + Prettier。
- **UI 层：** 原生 DOM 工厂函数 + 事件总线（不依赖 Vue / React 等框架）。
- **状态层：** `AppState` 单例 + 命令模式（撤销 / 重做）。
- **拼接层：** Web Worker 内使用 `OffscreenCanvas` + `ImageBitmap`。
- **存储层：** 图片二进制存 IndexedDB，界面状态（分组、图片元数据、设置）存 localStorage。
- **部署：** GitHub Actions 自动发布 GitHub Pages，`base: './'` 兼容子路径，`public/legacy` 一并发布旧版。

## 项目结构

```text
MomentWebStitcher/
├── index.html                  # 入口 HTML
├── vite.config.ts              # Vite 配置（base:'./'、worker es、@ 别名）
├── vitest.config.ts            # Vitest 配置
├── tailwind.config.js          # Tailwind 配置
├── tsconfig.json               # TypeScript 配置
├── src/
│   ├── main.ts                 # 应用入口与布局装配
│   ├── core/
│   │   ├── state.ts            # AppState 单例（状态 + 命令分发 + 自动保存）
│   │   ├── commands.ts         # 命令模式（撤销 / 重做，含 IndexedDB 副作用）
│   │   ├── storage.ts          # IndexedDB 图片存储 + localStorage 状态
│   │   ├── worker.ts           # Web Worker 管理
│   │   └── events.ts           # 事件总线与事件常量
│   ├── components/
│   │   ├── upload/             # 上传区域
│   │   ├── image-pool/         # 图片池
│   │   ├── group-manager/      # 分组管理
│   │   ├── results/            # 拼接结果预览
│   │   ├── settings/           # 设置面板
│   │   └── common/             # 按钮 / Toast / Modal / 进度条
│   ├── workers/
│   │   └── imageProcessor.ts   # 图片拼接 Worker（OffscreenCanvas）
│   ├── utils/                  # 工具函数与常量
│   ├── styles/                 # 变量与动画样式
│   └── types/                  # TypeScript 类型
├── public/
│   ├── vite.svg
│   └── legacy/                 # 旧版静态站（含切换入口，随构建发布）
├── tests/
│   └── unit/                   # 单元测试（helpers / state / persistence）
├── .github/workflows/deploy.yml  # GitHub Pages 部署工作流
└── package.json
```

## 开发与测试

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 类型检查 + 构建
npm run build

# 单元测试（Vitest）
npm run test

# 代码检查（ESLint）
npm run lint
```

测试覆盖工具函数、状态管理（命令 / 撤销 / 重做 / 自动分组）以及持久化往返（IndexedDB + localStorage）。

## 部署

推送到 `rewrite` 分支后，GitHub Actions 会根据 `.github/workflows/deploy.yml` 构建并发布到 GitHub Pages：

- 步骤：checkout → setup Node 20 → `npm ci` → `npm run build` → configure-pages → upload artifact（`dist`）→ deploy-pages。
- 首次启用需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

部署完成后：新版位于根目录，旧版位于 `legacy/`。

## 新旧版本

- **新版（本分支，rewrite）：** Vite + TypeScript 模块化实现，带 Web Worker、持久化、撤销重做、结果预览与批量下载。
- **旧版（main 分支）：** 纯静态单文件实现（`index.html` + `style.css` + `script.js`），无构建步骤、直接部署。

新版页头提供「旧版」入口（跳转 `./legacy/index.html`），旧版页头提供「返回新版」入口（跳转 `../index.html`），可随时在两个版本间切换。旧版源码随构建发布到 `dist/legacy/`，因此只需一个 Pages 地址即可同时访问两版。

## 常见问题

### 图片会上传到服务器吗？

不会。图片读取、排序、拼接和压缩都在当前浏览器页面中完成，图片数据仅存储在本地 IndexedDB，不会上传。

### 刷新页面会丢失工作吗？

不会。图片存于 IndexedDB，分组与设置以轻量元数据存于 localStorage，自动防抖保存。清空操作同样会同步清除本地存储。

### 有文件大小 / 数量限制吗？

单张图片上限 50 MB，单次最多 200 张；受浏览器内存与 `OffscreenCanvas` 面积限制，处理超大数量原图时建议分批。

### 为什么需要 Node.js？

本分支为构建型工程（Vite + TypeScript），需要 `npm install` 与 `npm run build`；若希望免构建，请切换到旧版入口。

### 和旧版有什么区别？

旧版是免构建的纯静态站；重写版引入了 Web Worker 后台拼接、IndexedDB 持久化、撤销 / 重做、结果预览与批量下载，并以 TypeScript 模块化分层，便于长期维护。

## 贡献

欢迎通过 [GitHub Issues](https://github.com/Piggywu981/MomentWebStitcher/issues) 提交问题或建议，也欢迎提交 Pull Request。

## 许可证

本项目采用 [MIT License](LICENSE)。

---

Made with ❤️ by [Piggywu981](https://github.com/Piggywu981)
