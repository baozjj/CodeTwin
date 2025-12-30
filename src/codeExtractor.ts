import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { CodeUnit, ExtractOptions } from "./types";

/**
 * 代码提取器 - 从工作区提取独立功能单元
 */
export class CodeExtractor {
  private defaultOptions: ExtractOptions = {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".vue"],
    excludePatterns: ["node_modules", "dist", "out", "build", ".git"],
  };

  /**
   * 从整个工作区提取代码单元
   */
  async extractFromWorkspace(options?: ExtractOptions): Promise<CodeUnit[]> {
    const opts = { ...this.defaultOptions, ...options };
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage("未找到工作区文件夹");
      return [];
    }

    const allUnits: CodeUnit[] = [];

    for (const folder of workspaceFolders) {
      const files = await this.scanDirectory(folder.uri.fsPath, opts);

      for (const file of files) {
        try {
          const units = await this.extractFromFile(file);
          allUnits.push(...units);
        } catch (error) {
          console.error(`提取文件 ${file} 失败:`, error);
        }
      }
    }

    return allUnits;
  }

  /**
   * 扫描目录获取所有符合条件的文件
   */
  private async scanDirectory(
    dir: string,
    options: ExtractOptions
  ): Promise<string[]> {
    const files: string[] = [];

    const scan = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // 检查是否应该排除
        if (
          options.excludePatterns?.some((pattern) => fullPath.includes(pattern))
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (options.extensions?.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scan(dir);
    return files;
  }

  /**
   * 从单个文件提取代码单元
   */
  async extractFromFile(filePath: string): Promise<CodeUnit[]> {
    let code = fs.readFileSync(filePath, "utf-8");
    let lineOffset = 0;

    // 如果是 Vue 文件,提取 script 内容
    if (filePath.endsWith(".vue")) {
      const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        // 计算 offset
        const preScript = code.substring(0, scriptMatch.index!);
        lineOffset = preScript.split("\n").length - 1;
        code = scriptMatch[1];
      } else {
        // 没有 script 标签,跳过
        return [];
      }
    }

    const units: CodeUnit[] = [];

    try {
      const ast = this.parseAST(code, filePath);
      this.traverseAST(ast, code, filePath, units, lineOffset);
    } catch (error) {
      console.warn(`解析文件 ${filePath} 失败: ${error}`);
      // throw new Error(`解析文件 ${filePath} 失败: ${error}`);
      return [];
    }

    return units;
  }

  /**
   * 解析代码为 AST
   */
  private parseAST(code: string, filePath: string) {
    // Vue 文件视作 TS/JS 处理
    const isTsx = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
    const isTs =
      filePath.endsWith(".ts") ||
      filePath.endsWith(".tsx") ||
      filePath.endsWith(".vue");

    return parse(code, {
      sourceType: "module",
      plugins: [
        isTs ? "typescript" : "flow",
        isTsx ? "jsx" : null,
        "decorators-legacy",
        "classProperties",
        "objectRestSpread",
      ].filter(Boolean) as any[],
    });
  }

  /**
   * 遍历 AST 提取功能单元
   */
  /**
   * 遍历 AST 提取功能单元
   */
  private traverseAST(
    ast: any,
    code: string,
    filePath: string,
    units: CodeUnit[],
    lineOffset: number = 0
  ): void {
    traverse(ast, {
      // 处理函数声明: export function foo() {}
      FunctionDeclaration: (path: any) => {
        const node = path.node;

        // 检查是否是导出的函数
        if (
          path.parent.type === "ExportNamedDeclaration" ||
          path.parent.type === "ExportDefaultDeclaration"
        ) {
          const name = node.id?.name || "default";
          const unit = this.createCodeUnit(
            node,
            code,
            filePath,
            name,
            lineOffset
          );

          if (unit) {
            // 判断类型
            unit.type = this.determineUnitType(name, path);
            units.push(unit);
          }
        }
      },

      // 处理变量声明: export const foo = () => {}
      VariableDeclaration: (path: any) => {
        const node = path.node;

        // 检查是否是导出的
        if (
          path.parent.type === "ExportNamedDeclaration" ||
          path.parent.type === "ExportDefaultDeclaration"
        ) {
          for (const declaration of node.declarations) {
            if (
              t.isIdentifier(declaration.id) &&
              (t.isArrowFunctionExpression(declaration.init) ||
                t.isFunctionExpression(declaration.init))
            ) {
              const name = declaration.id.name;
              const unit = this.createCodeUnit(
                node,
                code,
                filePath,
                name,
                lineOffset
              );

              if (unit) {
                // 判断类型
                unit.type = this.determineUnitType(name, path);
                units.push(unit);
              }
            }
          }
        }
      },
    });
  }

  /**
   * 创建代码单元对象
   */
  private createCodeUnit(
    node: any,
    code: string,
    filePath: string,
    name: string,
    lineOffset: number = 0
  ): CodeUnit | null {
    if (!node.loc) {
      return null;
    }

    const { start, end } = node.loc;
    const lines = code.split("\n");

    // 提取代码片段
    const codeLines = lines.slice(start.line - 1, end.line);
    const extractedCode = codeLines.join("\n");

    return {
      name,
      code: extractedCode,
      filePath,
      startLine: start.line + lineOffset,
      startColumn: start.column,
      endLine: end.line + lineOffset,
      endColumn: end.column,
      type: "function", // 默认类型,后续会更新
    };
  }

  /**
   * 判断单元类型
   */
  private determineUnitType(
    name: string,
    path: any
  ): "function" | "component" | "hook" {
    // 检查是否是 Hook (以 use 开头)
    if (
      name.startsWith("use") &&
      name.length > 3 &&
      name[3] === name[3].toUpperCase()
    ) {
      return "hook";
    }

    // 检查是否是 React 组件 (首字母大写且返回 JSX)
    if (name[0] === name[0].toUpperCase()) {
      // 简单检查:如果函数体中有 JSX 元素,认为是组件
      let hasJSX = false;

      path.traverse({
        JSXElement: () => {
          hasJSX = true;
        },
        JSXFragment: () => {
          hasJSX = true;
        },
      });

      if (hasJSX) {
        return "component";
      }
    }

    return "function";
  }
}
