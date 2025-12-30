# 如何导出和安装 CodeTwin 插件

本文档介绍如何将 CodeTwin 插件打包成 `.vsix` 文件并在 VS Code 中安装使用。

## 1. 准备工作

确保你已经安装了 `Node.js` 和 `npm`。

在项目根目录下，我们需要使用 `vsce` (Visual Studio Code Extensions) 工具来打包插件。

## 2. 打包插件

你可以直接使用 `npx` 运行打包命令，无需全局安装：

```bash
npx @vscode/vsce package
```

**可能遇到的提示：**

- 如果提示 `README.md` 缺少某些 URL（如 repository），可以选择 `y` 继续，或者在 local 测试时忽略。
- 如果提示 `yarn.lock` 或其他警告，通常也可以忽略。

执行成功后，项目根目录下会生成一个名为 `codetwin-0.1.0.vsix` 的文件。

## 3. 安装插件

### 方法 A: 使用命令行安装

在生成 `.vsix` 文件的目录下运行：

```bash
code --install-extension codetwin-0.1.0.vsix
```

### 方法 B: 在 VS Code 界面安装

1. 打开 VS Code。
2. 点击左侧活动栏的 **扩展 (Extensions)** 图标 (或按 `Cmd+Shift+X`)。
3. 点击扩展面板右上角的 **... (更多操作)** 菜单。
4. 选择 **从 VSIX 安装... (Install from VSIX...)**。
5. 在弹出的文件选择窗口中，找到并选中 `codetwin-0.1.0.vsix` 文件。

## 4. 验证安装

安装完成后（可能需要重载窗口）：

1. 打开任意包含 TS/JS 代码的项目。
2. 打开命令面板 (`Cmd+Shift+P`)。
3. 输入 `CodeTwin`，你应该能看到 `Find Duplicate Code` 等命令。

## 常见问题

**Q: 打包时提示 "Missing publisher name"**
A: 请检查 `package.json` 中是否配置了 `publisher` 字段。我们已经将其默认设置为 `codetwin-dev`。

**Q: 文件过大？**
A: 插件包含了 Transformers.js 和 ONNX Runtime，由于是本地运行模型，包体积可能会稍大。VS Code 插件大小限制通常很宽裕。

**Q: 想要发布到 VS Code 市场？**
A: 你需要在 [Marketplace](https://marketplace.visualstudio.com/) 注册账号，获取 Access Token，然后运行 `npx @vscode/vsce publish`。详细请参考 VS Code 官方文档。
