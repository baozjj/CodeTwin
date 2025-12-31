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
exports.EmbeddingEngine = void 0;
const transformers_1 = require("@xenova/transformers");
const vscode = __importStar(require("vscode"));
const config_1 = require("./config");
const codeExtractor_1 = require("./codeExtractor");
/**
 * 向量化引擎
 */
class EmbeddingEngine {
    constructor() {
        this.model = null;
        this.isInitialized = false;
        // 配置 Transformers.js 环境
        // 允许本地缓存模型文件
        transformers_1.env.allowLocalModels = true;
        transformers_1.env.allowRemoteModels = true;
        this.codeExtractor = new codeExtractor_1.CodeExtractor();
    }
    /**
     * 初始化模型
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "CodeTwin",
                cancellable: false,
            }, async (progress) => {
                progress.report({
                    message: "正在加载语义模型...",
                    increment: 0,
                });
                // 加载 feature-extraction pipeline
                this.model = await (0, transformers_1.pipeline)("feature-extraction", config_1.CONFIG.MODEL_NAME);
                progress.report({
                    message: "模型加载完成",
                    increment: 100,
                });
                this.isInitialized = true;
            });
            console.log("EmbeddingEngine 初始化成功");
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`模型加载失败: ${errorMessage}`);
            throw error;
        }
    }
    /**
     * 生成单个代码的向量表示
     */
    async generateVector(code, filePath) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`向量化失败: ${errorMessage}`, error);
            throw new Error(`向量化失败: ${errorMessage}`);
        }
    }
    /**
     * 批量生成向量
     */
    async generateVectors(codes, filePaths, onProgress) {
        if (!this.isInitialized || !this.model) {
            throw new Error("模型未初始化,请先调用 initialize()");
        }
        const vectors = [];
        const total = codes.length;
        // 分批处理以提高性能
        for (let i = 0; i < codes.length; i += config_1.CONFIG.BATCH_SIZE) {
            const batch = codes.slice(i, i + config_1.CONFIG.BATCH_SIZE);
            const batchFilePaths = filePaths ? filePaths.slice(i, i + config_1.CONFIG.BATCH_SIZE) : undefined;
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
    normalizeCode(code, filePath) {
        return this.codeExtractor.normalizeCode(code, filePath);
    }
    /**
     * 检查模型是否已初始化
     */
    isReady() {
        return this.isInitialized;
    }
    /**
     * 获取向量维度
     */
    getVectorDimension() {
        return config_1.CONFIG.VECTOR_DIMENSION;
    }
}
exports.EmbeddingEngine = EmbeddingEngine;
//# sourceMappingURL=embeddingEngine.js.map