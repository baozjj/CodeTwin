import * as vscode from "vscode";
import { SimilarPair } from "../types";

/**
 * 管理代码重复的诊断信息(波浪线提示)
 */
export class DiagnosticManager {
  private collection: vscode.DiagnosticCollection;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection("codetwin");
  }

  /**
   * 更新特定文件的诊断信息
   */
  updateDiagnostics(document: vscode.TextDocument, pairs: SimilarPair[]) {
    const diagnostics: vscode.Diagnostic[] = [];
    const processedRanges = new Set<string>();

    for (const pair of pairs) {
      // 创建范围 key 避免重复
      const rangeKey = `${pair.source.startLine}-${pair.source.endLine}`;
      if (processedRanges.has(rangeKey)) {
        continue;
      }
      processedRanges.add(rangeKey);

      const range = new vscode.Range(
        pair.source.startLine - 1,
        pair.source.startColumn,
        pair.source.endLine - 1,
        pair.source.endColumn
      );

      const percentage = (pair.similarity * 100).toFixed(0);
      const message = `检测到潜在的重复逻辑 (相似度: ${percentage}%)\n相似目标: ${pair.target.name} in ${pair.target.filePath}`;

      const diagnostic = new vscode.Diagnostic(
        range,
        message,
        vscode.DiagnosticSeverity.Information
      );

      diagnostic.source = "CodeTwin";
      diagnostic.code = "duplicate-code";

      diagnostics.push(diagnostic);
    }

    this.collection.set(document.uri, diagnostics);
  }

  /**
   * 清除特定文件的诊断信息
   */
  clearDiagnostics(document: vscode.TextDocument) {
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
