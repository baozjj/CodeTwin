import * as vscode from "vscode";
import * as path from "path";
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

      // 显示前 3 个最相似的项作为独立 CodeLens
      const topSimilar = similarUnits.slice(0, 3);

      for (const sim of topSimilar) {
        const percentage = (sim.similarity * 100).toFixed(0);
        const targetName =
          sim.target.filePath !== pair.source.filePath
            ? `${path.basename(sim.target.filePath).split(".")[0]}:${sim.target.name
            }`
            : sim.target.name;

        const command: vscode.Command = {
          title: `⚡️ ${percentage}%: ${targetName}`,
          tooltip: `点击跳转: ${sim.target.filePath}:${sim.target.startLine}`,
          command: "codetwin.jumpToDuplicate",
          arguments: [sim],
        };

        codeLenses.push(new vscode.CodeLens(range, command));
      }

      // 如果超过 3 个，添加一个汇总 CodeLens
      if (similarUnits.length > 3) {
        const command: vscode.Command = {
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
