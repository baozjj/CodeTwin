"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const codeExtractor_1 = require("./codeExtractor");
const embeddingEngine_1 = require("./embeddingEngine");
const similarityService_1 = require("./similarityService");
const codeLensProvider_1 = require("./providers/codeLensProvider");
const diagnosticManager_1 = require("./providers/diagnosticManager");
const debounce_1 = require("./utils/debounce");
// 全局服务实例
let engine;
let similarityService;
let diagnosticManager;
let codeLensProvider;
let outputChannel;
/**
 * 插件激活时调用
 */
async function activate(context) {
    console.log("CodeTwin 插件已激活");
    // 初始化服务
    engine = new embeddingEngine_1.EmbeddingEngine();
    similarityService = new similarityService_1.SimilarityService();
    diagnosticManager = new diagnosticManager_1.DiagnosticManager();
    codeLensProvider = new codeLensProvider_1.DuplicateCodeLensProvider();
    outputChannel = vscode.window.createOutputChannel("CodeTwin");
    // 注册 CodeLens 提供者
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file", pattern: "**/*.{ts,tsx,js,jsx,vue}" }, codeLensProvider));
    // 注册命令: 提取代码
    context.subscriptions.push(vscode.commands.registerCommand("codetwin.extractCode", extractCodeUnits));
    // 注册命令: 全量查重
    context.subscriptions.push(vscode.commands.registerCommand("codetwin.findDuplicates", findDuplicates));
    // 注册命令: 显示重复项详情
    context.subscriptions.push(vscode.commands.registerCommand("codetwin.showDuplicates", showDuplicatesInteraction));
    // 监听文件保存事件 (防抖处理)
    const debouncedSaveHandler = (0, debounce_1.debounce)(async (document) => {
        // 过滤非目标文件
        if (![
            "typescript",
            "typescriptreact",
            "javascript",
            "javascriptreact",
            "vue",
        ].includes(document.languageId)) {
            return;
        }
        // 如果模型未初始化,先初始化(静默)
        if (!engine.isReady()) {
            await engine.initialize();
        }
        try {
            await processSingleFile(document);
        }
        catch (e) {
            console.error("增量查重失败:", e);
        }
    }, 1000); // 1秒防抖
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(debouncedSaveHandler));
    // 销毁资源
    context.subscriptions.push(diagnosticManager);
}
/**
 * 处理单个文件的增量查重
 */
async function processSingleFile(document) {
    const filePath = document.uri.fsPath;
    // 1. 提取代码单元
    const extractor = new codeExtractor_1.CodeExtractor();
    const units = await extractor.extractFromFile(filePath);
    if (units.length === 0) {
        // 如果没有代码单元,清除该文件的记录
        similarityService.updateFileVectors(filePath, []);
        codeLensProvider.updateDuplicates(filePath, []);
        diagnosticManager.clearDiagnostics(document);
        return;
    }
    // 2. 向量化
    const codes = units.map((u) => u.code);
    const vectors = await engine.generateVectors(codes);
    // 3. 更新向量库
    const codeVectors = units.map((u, i) => ({ unit: u, vector: vectors[i] }));
    similarityService.updateFileVectors(filePath, codeVectors);
    // 4. 查找该文件的重复项
    const config = vscode.workspace.getConfiguration("codetwin");
    const threshold = config.get("similarityThreshold") || 0.85;
    const duplicates = similarityService.findDuplicatesForFile(filePath, threshold);
    // 5. 更新 UI
    codeLensProvider.updateDuplicates(filePath, duplicates);
    diagnosticManager.updateDiagnostics(document, duplicates);
    if (duplicates.length > 0) {
        outputChannel.appendLine(`⚡️ [实时查重] 在 ${path.basename(filePath)} 中发现 ${duplicates.length} 处重复`);
    }
}
/**
 * 交互式显示重复项
 */
async function showDuplicatesInteraction(sourceUnit, similarUnits) {
    const items = similarUnits.map((pair) => {
        const similarity = (pair.similarity * 100).toFixed(0);
        return {
            label: `$(symbol-file) ${pair.target.filePath.split(/[\\/]/).pop()} - ${pair.target.name}`,
            description: `相似度: ${similarity}%`,
            detail: `${pair.target.filePath}:${pair.target.startLine}`,
            pair: pair,
        };
    });
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `选择要对比的代码块 (源: ${sourceUnit.name})`,
        title: "CodeTwin 代码对比",
    });
    if (selected) {
        const pair = selected.pair;
        const uri1 = vscode.Uri.file(pair.source.filePath);
        const uri2 = vscode.Uri.file(pair.target.filePath);
        // 打开 Diff 视图
        // 构造选区
        const selection = new vscode.Range(pair.target.startLine - 1, 0, pair.target.endLine, 0);
        await vscode.commands.executeCommand("vscode.diff", uri1, uri2, `CodeTwin: ${pair.source.name} ↔ ${pair.target.name} (${(pair.similarity * 100).toFixed(0)}%)`);
    }
}
/**
 * 提取代码单元 (旧版命令保留用于调试)
 */
async function extractCodeUnits() {
    outputChannel.show();
    outputChannel.appendLine("CodeTwin - 代码单元提取 (手动触发)");
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodeTwin: 提取代码",
            cancellable: false,
        }, async (progress) => {
            const extractor = new codeExtractor_1.CodeExtractor();
            const units = await extractor.extractFromWorkspace();
            outputChannel.appendLine(`✅ 提取完成! 共找到 ${units.length} 个代码单元`);
            vscode.window.showInformationMessage(`提取完成: ${units.length} 个单元`);
        });
    }
    catch (e) {
        vscode.window.showErrorMessage(`提取失败: ${e}`);
    }
}
/**
 * 全量查重
 */
async function findDuplicates() {
    outputChannel.show();
    outputChannel.appendLine("=".repeat(60));
    outputChannel.appendLine("CodeTwin - 全量代码查重");
    outputChannel.appendLine("=".repeat(60));
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "CodeTwin 全量查重",
            cancellable: false,
        }, async (progress) => {
            // 1. 扫描
            progress.report({ message: "扫描工作区...", increment: 0 });
            const extractor = new codeExtractor_1.CodeExtractor();
            const units = await extractor.extractFromWorkspace();
            if (units.length === 0)
                return;
            // 2. 初始化模型
            progress.report({ message: "加载模型...", increment: 20 });
            if (!engine.isReady()) {
                await engine.initialize();
            }
            // 3. 向量化
            progress.report({ message: "向量化代码...", increment: 40 });
            const codes = units.map((u) => u.code);
            const vectors = await engine.generateVectors(codes, (current, total) => {
                progress.report({
                    message: `向量化 (${current}/${total})...`,
                    increment: 40 + (current / total) * 40,
                });
            });
            // 4. 重置并添加向量
            similarityService.clear();
            similarityService.addVectors(units, vectors);
            // 5. 计算相似度
            progress.report({ message: "计算相似度...", increment: 90 });
            const config = vscode.workspace.getConfiguration("codetwin");
            const threshold = config.get("similarityThreshold") || 0.85;
            const pairs = similarityService.findDuplicates(threshold);
            // 6. 报告
            const report = {
                totalUnits: units.length,
                duplicatePairs: pairs.length,
                pairs: pairs,
            };
            outputChannel.appendLine(`扫描单元: ${report.totalUnits}`);
            outputChannel.appendLine(`发现相似对: ${report.duplicatePairs}`);
            // 更新 UI 组件状态
            // 简单处理: 按文件分组更新 CodeLens
            for (const unit of units) {
                const fileDuplicates = similarityService.findDuplicatesForFile(unit.filePath, threshold);
                codeLensProvider.updateDuplicates(unit.filePath, fileDuplicates);
                // 这里暂不全量更新 Diagnostic，以免卡顿，建议只更新当前打开的文件或按需触发
            }
            vscode.window.showInformationMessage(`CodeTwin: 发现 ${report.duplicatePairs} 处重复逻辑`);
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`查重失败: ${errorMessage}`);
    }
}
/**
 * 插件停用时调用
 */
function deactivate() {
    if (diagnosticManager) {
        diagnosticManager.dispose();
    }
    console.log("CodeTwin 插件已停用");
}
//# sourceMappingURL=extension.js.map