# CodeTwin

一个用于语义代码查重的 VS Code 插件,基于 AST 分析检测项目中的重复代码。

## 功能特性

- 🔍 **智能扫描**: 自动扫描工作区中的 TypeScript/JavaScript/Vue 文件
- 🌳 **AST 分析**: 使用 Babel 解析器进行精确的代码结构分析
- 🧠 **语义理解**: 使用本地 BERT 模型 (all-MiniLM-L6-v2) 将代码转换为向量
- 🤖 **查重引擎**: 基于余弦相似度 (Cosine Similarity) 检测语义重复的代码
- ⚡️ **实时反馈**:
  - **CodeLens**: 函数上方的直观提示
  - **Diagnostic**: 问题代码的波浪线警告
  - **Diff View**: 一键对比相似代码

## 技术架构

```mermaid
graph TD
    User([开发者]) -->|编写/保存代码| Doc[src/App.tsx]
    Doc -->|OnSave 触发| Extractor[CodeExtractor]

    subgraph Analysis [代码分析层]
        Extractor -->|Babel Parser| AST[AST 语法树]
        AST -->|提取函数/组件/Hook| Unit[代码逻辑单元]
    end

    subgraph Intelligence [智能引擎层]
        Unit -->|Transformers.js| Model[all-MiniLM 模型]
        Model -->|本地 CPU 推理| Vector[384维特征向量]
        Vector -->|存入| DB[(内存向量库/Map)]
    end

    subgraph Interaction [交互反馈层]
        DB -->|Cosine 相似度计算| Sim{相似度 > 85%?}
        Sim -->|Yes| API[VS Code API]
        API -->|CodeLens| Lens[提示: ⚡️ 检测到相似逻辑]
        API -->|Diagnostic| Diag[警告: 波浪线提示]
        Lens -.->|点击| Diff[Side-by-Side 对比视图]
    end
```

## 使用方法

1. 在 VS Code 中打开一个包含 TypeScript/React/Vue 项目的工作区
2. 插件会自动进行增量扫描
3. **手动触发**: 按 `Cmd+Shift+P` 输入 `CodeTwin: Find Duplicate Code`
4. **查看结果**:
   - 观察编辑器中的 CodeLens 提示
   - 查看 "CodeTwin" 输出通道的详细报告

## 路线图

- [x] 基础代码提取功能
- [x] 代码相似度计算 (BERT + Cosine)
- [x] 重复代码检测
- [x] 实时 UI 反馈 (CodeLens/Diagnostic)
- [x] Vue 文件支持
- [ ] 可视化 Webview 报告
- [ ] 配置选项优化

## 许可证

MIT
