import { pipeline, env } from "@xenova/transformers";
import * as vscode from "vscode";
import { CONFIG } from "./config";
import { CodeExtractor } from "./codeExtractor";

/**
 * 向量化引擎
 */
export class EmbeddingEngine {
  private model: any = null;
  private isInitialized: boolean = false;
  private codeExtractor: CodeExtractor;

  constructor() {
    // 配置 Transformers.js 环境
    // 允许本地缓存模型文件
    env.allowLocalModels = true;
    env.allowRemoteModels = true;
    this.codeExtractor = new CodeExtractor();
  }

  /**
   * 初始化模型
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "CodeTwin",
          cancellable: false,
        },
        async (progress) => {
          progress.report({
            message: "正在加载语义模型...",
            increment: 0,
          });

          // 加载 feature-extraction pipeline
          this.model = await pipeline("feature-extraction", CONFIG.MODEL_NAME);

          progress.report({
            message: "模型加载完成",
            increment: 100,
          });

          this.isInitialized = true;
        }
      );

      console.log("EmbeddingEngine 初始化成功");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`模型加载失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 生成单个代码的向量表示
   */
  async generateVector(code: string, filePath?: string): Promise<Float32Array> {
    if (!this.isInitialized || !this.model) {
      throw new Error("模型未初始化,请先调用 initialize()");
    }

    try {
      // 规范化代码后再生成向量
      const normalizedCode = this.codeExtractor.normalizeCode(code, filePath);

      // 使用模型生成 embedding
      const output = await this.model(normalizedCode, {
        pooling: "mean",
        normalize: true,
      });

      // 转换为 Float32Array
      const vector = new Float32Array(output.data);

      return vector;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`向量化失败: ${errorMessage}`, error);
      throw new Error(`向量化失败: ${errorMessage}`);
    }
  }

  /**
   * 批量生成向量
   */
  async generateVectors(
    codes: string[],
    filePaths?: string[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Float32Array[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error("模型未初始化,请先调用 initialize()");
    }

    const vectors: Float32Array[] = [];
    const total = codes.length;

    // 分批处理以提高性能
    for (let i = 0; i < codes.length; i += CONFIG.BATCH_SIZE) {
      const batch = codes.slice(i, i + CONFIG.BATCH_SIZE);
      const batchFilePaths = filePaths ? filePaths.slice(i, i + CONFIG.BATCH_SIZE) : undefined;

      // 处理当前批次
      for (let j = 0; j < batch.length; j++) {
        const filePath = batchFilePaths ? batchFilePaths[j] : undefined;
        const vector = await this.generateVector(batch[j], filePath);
        vectors.push(vector);

        // 报告进度
        if (onProgress) {
          onProgress(i + j + 1, total);
        }
      }
    }

    return vectors;
  }

  /**
   * 规范化单个代码
   */
  normalizeCode(code: string, filePath?: string): string {
    return this.codeExtractor.normalizeCode(code, filePath);
  }

  /**
   * 检查模型是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取向量维度
   */
  getVectorDimension(): number {
    return CONFIG.VECTOR_DIMENSION;
  }
}
