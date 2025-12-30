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
            const maxSimilarity = Math.max(...similarUnits.map((p) => p.similarity));
            const percentage = (maxSimilarity * 100).toFixed(0);
            const command = {
                title: `⚡️ 发现 ${similarUnits.length} 个相似块 (最高相似度: ${percentage}%)`,
                tooltip: "点击查看详细对比",
                command: "codetwin.showDuplicates",
                arguments: [pair.source, similarUnits],
            };
            codeLenses.push(new vscode.CodeLens(range, command));
        }
        return codeLenses;
    }
}
exports.DuplicateCodeLensProvider = DuplicateCodeLensProvider;
//# sourceMappingURL=codeLensProvider.js.map