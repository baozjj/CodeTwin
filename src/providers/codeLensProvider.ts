import * as vscode from "vscode";
import { SimilarPair, CodeUnit } from "../types";

/**
 * 提供相似代码的 CodeLens
 */
export class DuplicateCodeLensProvider implements vscode.CodeLensProvider {
  private duplicates: Map<string, SimilarPair[]> = new Map();
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  /**
   * 更新特定文件的重复项信息
   */
  updateDuplicates(filePath: string, pairs: SimilarPair[]) {
    // 过滤出当前文件的重复项(按起始行分组)
    this.duplicates.set(filePath, pairs);
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const filePath = document.uri.fsPath;
    const pairs = this.duplicates.get(filePath);

    if (!pairs || pairs.length === 0) {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];
    const processedLines = new Set<number>();

    for (const pair of pairs) {
      // 避免同一行重复显示
      if (processedLines.has(pair.source.startLine)) {
        continue;
      }
      processedLines.add(pair.source.startLine);

      const range = new vscode.Range(
        pair.source.startLine - 1,
        0,
        pair.source.startLine - 1,
        0
      );

      // 查找该单元的所有相似项
      const similarUnits = pairs
        .filter((p) => p.source.startLine === pair.source.startLine)
        .sort((a, b) => b.similarity - a.similarity);

      const maxSimilarity = Math.max(...similarUnits.map((p) => p.similarity));
      const percentage = (maxSimilarity * 100).toFixed(0);

      const command: vscode.Command = {
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
