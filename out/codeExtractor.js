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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeExtractor = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parser_1 = require("@babel/parser");
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
/**
 * 代码提取器 - 从工作区提取独立功能单元
 */
class CodeExtractor {
    constructor() {
        this.defaultOptions = {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue'],
            excludePatterns: ['node_modules', 'dist', 'out', 'build', '.git']
        };
    }
    /**
     * 从整个工作区提取代码单元
     */
    async extractFromWorkspace(options) {
        const opts = { ...this.defaultOptions, ...options };
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('未找到工作区文件夹');
            return [];
        }
        const allUnits = [];
        for (const folder of workspaceFolders) {
            const files = await this.scanDirectory(folder.uri.fsPath, opts);
            for (const file of files) {
                try {
                    const units = await this.extractFromFile(file);
                    allUnits.push(...units);
                }
                catch (error) {
                    console.error(`提取文件 ${file} 失败:`, error);
                }
            }
        }
        return allUnits;
    }
    /**
     * 扫描目录获取所有符合条件的文件
     */
    async scanDirectory(dir, options) {
        const files = [];
        const scan = (currentDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                // 检查是否应该排除
                if (options.excludePatterns?.some(pattern => fullPath.includes(pattern))) {
                    continue;
                }
                if (entry.isDirectory()) {
                    scan(fullPath);
                }
                else if (entry.isFile()) {
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
    async extractFromFile(filePath) {
        let code = fs.readFileSync(filePath, 'utf-8');
        let lineOffset = 0;
        // 如果是 Vue 文件,提取 script 内容
        if (filePath.endsWith('.vue')) {
            const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/);
            if (scriptMatch) {
                // 计算 offset
                const preScript = code.substring(0, scriptMatch.index);
                lineOffset = preScript.split('\n').length - 1;
                code = scriptMatch[1];
            }
            else {
                // 没有 script 标签,跳过
                return [];
            }
        }
        const units = [];
        try {
            const ast = this.parseAST(code, filePath);
            this.traverseAST(ast, code, filePath, units, lineOffset);
        }
        catch (error) {
            console.warn(`解析文件 ${filePath} 失败: ${error}`);
            // throw new Error(`解析文件 ${filePath} 失败: ${error}`);
            return [];
        }
        return units;
    }
    /**
     * 解析代码为 AST
     */
    parseAST(code, filePath) {
        // Vue 文件视作 TS/JS 处理
        const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
        const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.vue');
        return (0, parser_1.parse)(code, {
            sourceType: 'module',
            plugins: [
                isTs ? 'typescript' : 'flow',
                isTsx ? 'jsx' : null,
                'decorators-legacy',
                'classProperties',
                'objectRestSpread'
            ].filter(Boolean)
        });
    }
    /**
     * 遍历 AST 提取功能单元
     */
    /**
     * 遍历 AST 提取功能单元
     */
    traverseAST(ast, code, filePath, units, lineOffset = 0) {
        (0, traverse_1.default)(ast, {
            // 处理函数声明: export function foo() {}
            FunctionDeclaration: (path) => {
                const node = path.node;
                // 检查是否是导出的函数
                if (path.parent.type === 'ExportNamedDeclaration' ||
                    path.parent.type === 'ExportDefaultDeclaration') {
                    const name = node.id?.name || 'default';
                    const unit = this.createCodeUnit(node, code, filePath, name, lineOffset);
                    if (unit) {
                        // 判断类型
                        unit.type = this.determineUnitType(name, path);
                        units.push(unit);
                    }
                }
            },
            // 处理变量声明: export const foo = () => {}
            VariableDeclaration: (path) => {
                const node = path.node;
                // 检查是否是导出的
                if (path.parent.type === 'ExportNamedDeclaration' ||
                    path.parent.type === 'ExportDefaultDeclaration') {
                    for (const declaration of node.declarations) {
                        if (t.isIdentifier(declaration.id) &&
                            (t.isArrowFunctionExpression(declaration.init) ||
                                t.isFunctionExpression(declaration.init))) {
                            const name = declaration.id.name;
                            const unit = this.createCodeUnit(node, code, filePath, name, lineOffset);
                            if (unit) {
                                // 判断类型
                                unit.type = this.determineUnitType(name, path);
                                units.push(unit);
                            }
                        }
                    }
                }
            }
        });
    }
    /**
     * 创建代码单元对象
     */
    createCodeUnit(node, code, filePath, name, lineOffset = 0) {
        if (!node.loc) {
            return null;
        }
        const { start, end } = node.loc;
        const lines = code.split('\n');
        // 提取代码片段
        const codeLines = lines.slice(start.line - 1, end.line);
        const extractedCode = codeLines.join('\n');
        return {
            name,
            code: extractedCode,
            filePath,
            startLine: start.line + lineOffset,
            startColumn: start.column,
            endLine: end.line + lineOffset,
            endColumn: end.column,
            type: 'function' // 默认类型,后续会更新
        };
    }
    /**
     * 判断单元类型
     */
    determineUnitType(name, path) {
        // 检查是否是 Hook (以 use 开头)
        if (name.startsWith('use') && name.length > 3 && name[3] === name[3].toUpperCase()) {
            return 'hook';
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
                }
            });
            if (hasJSX) {
                return 'component';
            }
        }
        return 'function';
    }
}
exports.CodeExtractor = CodeExtractor;
//# sourceMappingURL=codeExtractor.js.map