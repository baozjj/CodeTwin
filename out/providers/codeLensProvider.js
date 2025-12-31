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
exports.DuplicateCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * 提供相似代码的 CodeLens
 */
class DuplicateCodeLensProvider {
    constructor() {
        this.duplicates = new Map();
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    /**
     * 更新特定文件的重复项信息
     */
    updateDuplicates(filePath, pairs) {
        // 过滤出当前文件的重复项(按起始行分组)
        this.duplicates.set(filePath, pairs);
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document, token) {
        const filePath = document.uri.fsPath;
        const pairs = this.duplicates.get(filePath);
        if (!pairs || pairs.length === 0) {
            return [];
        }
        const codeLenses = [];
        const processedLines = new Set();
        for (const pair of pairs) {
            // 避免同一行重复显示
            if (processedLines.has(pair.source.startLine)) {
                continue;
            }
            processedLines.add(pair.source.startLine);
            const range = new vscode.Range(pair.source.startLine - 1, 0, pair.source.startLine - 1, 0);
            // 查找该单元的所有相似项
            const similarUnits = pairs
                .filter((p) => p.source.startLine === pair.source.startLine)
                .sort((a, b) => b.similarity - a.similarity);
            // 显示前 3 个最相似的项作为独立 CodeLens
            const topSimilar = similarUnits.slice(0, 3);
            for (const sim of topSimilar) {
                const percentage = (sim.similarity * 100).toFixed(0);
                const targetName = sim.target.filePath !== pair.source.filePath
                    ? `${path.basename(sim.target.filePath).split(".")[0]}:${sim.target.name}`
                    : sim.target.name;
                const command = {
                    title: `⚡️ ${percentage}%: ${targetName}`,
                    tooltip: `点击跳转: ${sim.target.filePath}:${sim.target.startLine}`,
                    command: "codetwin.jumpToDuplicate",
                    arguments: [sim],
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }
            // 如果超过 3 个，添加一个汇总 CodeLens
            if (similarUnits.length > 3) {
                const command = {
                    title: `... 以及其他 ${similarUnits.length - 3} 个相似块`,
                    tooltip: "点击查看完整列表",
                    command: "codetwin.showDuplicates",
                    arguments: [pair.source, similarUnits],
                };
                codeLenses.push(new vscode.CodeLens(range, command));
            }
        }
        return codeLenses;
    }
}
exports.DuplicateCodeLensProvider = DuplicateCodeLensProvider;
//# sourceMappingURL=codeLensProvider.js.map