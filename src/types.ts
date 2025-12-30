/**
 * 代码单元类型定义
 */
export interface CodeUnit {
  /** 函数/组件名称 */
  name: string;

  /** 源代码字符串 */
  code: string;

  /** 文件路径 */
  filePath: string;

  /** 起始行号 (1-indexed) */
  startLine: number;

  /** 起始列号 (0-indexed) */
  startColumn: number;

  /** 结束行号 (1-indexed) */
  endLine: number;

  /** 结束列号 (0-indexed) */
  endColumn: number;

  /** 单元类型 */
  type: "function" | "component" | "hook";
}

/**
 * 提取选项
 */
export interface ExtractOptions {
  /** 要扫描的文件扩展名 */
  extensions?: string[];

  /** 要排除的目录模式 */
  excludePatterns?: string[];
}

/**
 * 代码向量表示
 */
export interface CodeVector {
  /** 关联的代码单元 */
  unit: CodeUnit;

  /** 向量表示 */
  vector: Float32Array;
}

/**
 * 相似代码对
 */
export interface SimilarPair {
  /** 源代码单元 */
  source: CodeUnit;

  /** 相似的代码单元 */
  target: CodeUnit;

  /** 相似度分数 (0-1) */
  similarity: number;
}

/**
 * 查重结果
 */
export interface DuplicateReport {
  /** 总扫描单元数 */
  totalUnits: number;

  /** 发现的相似对数量 */
  duplicatePairs: number;

  /** 详细的相似对列表 */
  pairs: SimilarPair[];
}
