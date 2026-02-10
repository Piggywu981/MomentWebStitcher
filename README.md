# MomentStitcher - 朋友圈长图拼接工具

专为朋友圈设计的智能长图拼接工具，支持拖拽分组、自动排序、Web Worker异步处理等功能。

## ✨ 特性

- 🖼️ **智能分组** - 支持手动拖拽分组和自动按时间分组
- 🚀 **Web Worker处理** - 图片拼接在后台线程执行，不阻塞UI
- ↩️ **撤销/重做** - 完整的操作历史管理
- 💾 **本地存储** - 自动保存工作状态
- 🎨 **现代UI** - 响应式设计，支持暗色/亮色主题
- ⌨️ **快捷键支持** - 支持常用操作的键盘快捷键
- 📱 **移动端适配** - 完美支持手机和平板设备

## 🛠️ 技术栈

- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **测试**: Vitest
- **代码规范**: ESLint + Prettier

## 📦 安装

```bash
# 克隆仓库
git clone https://github.com/Piggywu981/MomentWebStitcher.git
cd MomentWebStitcher

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🚀 使用

1. **添加图片** - 拖拽图片到上传区域或点击选择文件
2. **创建分组** - 点击"新建分组"或"自动分组"
3. **拖拽排序** - 将图片从图片池拖拽到分组中
4. **设置参数** - 调整输出质量、格式等设置
5. **开始拼接** - 点击"开始拼接"按钮，等待处理完成

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + O | 添加图片 |
| Ctrl + Enter | 开始拼接 |
| Ctrl + Z | 撤销 |
| Ctrl + Y | 重做 |
| Ctrl + Shift + C | 清空所有 |

## 📁 项目结构

```
MomentWebStitcher/
├── src/
│   ├── core/              # 核心模块
│   │   ├── state.ts       # 状态管理
│   │   ├── commands.ts    # 命令模式（撤销/重做）
│   │   ├── storage.ts     # IndexedDB存储
│   │   ├── worker.ts      # Web Worker管理
│   │   └── events.ts      # 事件总线
│   ├── components/        # UI组件
│   │   ├── upload/        # 上传组件
│   │   ├── image-pool/    # 图片池
│   │   ├── group-manager/ # 分组管理
│   │   └── settings/      # 设置面板
│   ├── utils/             # 工具函数
│   ├── styles/            # 样式
│   └── types/             # TypeScript类型
├── tests/                 # 测试
└── dist/                  # 构建输出
```

## 🧪 测试

```bash
# 运行单元测试
npm run test

# 运行测试并显示UI
npm run test:ui

# 代码检查
npm run lint
```

## 📝 更新日志

### v2.0.0 (2024)

- ✨ 全新架构重构
- 🚀 添加Web Worker异步处理
- ↩️ 实现撤销/重做功能
- 💾 添加本地存储持久化
- 🎨 全新UI设计，支持暗色主题
- ⌨️ 添加快捷键支持
- 🧪 添加单元测试

### v1.0.0 (2024)

- 🎉 初始版本发布
- 🖼️ 基础图片拼接功能
- 📁 支持拖拽分组

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

Made with ❤️ by [Piggywu981](https://github.com/Piggywu981)
