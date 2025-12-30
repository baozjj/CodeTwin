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
exports.DiagnosticManager = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 管理代码重复的诊断信息(波浪线提示)
 */
class DiagnosticManager {
    constructor() {
        this.collection = vscode.languages.createDiagnosticCollection("codetwin");
    }
    /**
     * 更新特定文件的诊断信息
     */
    updateDiagnostics(document, pairs) {
        const diagnostics = [];
        const processedRanges = new Set();
        for (const pair of pairs) {
            // 创建范围 key 避免重复
            const rangeKey = `${pair.source.startLine}-${pair.source.endLine}`;
            if (processedRanges.has(rangeKey)) {
                continue;
            }
            processedRanges.add(rangeKey);
            const range = new vscode.Range(pair.source.startLine - 1, pair.source.startColumn, pair.source.endLine - 1, pair.source.endColumn);
            const percentage = (pair.similarity * 100).toFixed(0);
            const message = `检测到潜在的重复逻辑 (相似度: ${percentage}%)\n相似目标: ${pair.target.name} in ${pair.target.filePath}`;
            const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Information);
            diagnostic.source = "CodeTwin";
            diagnostic.code = "duplicate-code";
            diagnostics.push(diagnostic);
        }
        this.collection.set(document.uri, diagnostics);
    }
    /**
     * 清除特定文件的诊断信息
     */
    clearDiagnostics(document) {
        this.collection.delete(document.uri);
    }
    /**
     * 销毁所有诊断信息
     */
    dispose() {
        this.collection.clear();
        this.collection.dispose();
    }
}
exports.DiagnosticManager = DiagnosticManager;
//# sourceMappingURL=diagnosticManager.js.map