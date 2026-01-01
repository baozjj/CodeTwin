"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
/**
 * 配置常量 - 适配 CodeBERT 语义引擎
 */
exports.CONFIG = {
    // 模型配置
    // 建议从 all-MiniLM-L6-v2 升级到针对代码优化的 codebert
    MODEL_NAME: "onnx-community/codebert-javascript-ONNX",
    // 关键：CodeBERT 输出的是 768 维向量，而 MiniLM 是 384 维
    VECTOR_DIMENSION: 768,
    // CodeBERT 的标准上下文窗口是 512 tokens
    MAX_TOKEN_LENGTH: 512,
    // 相似度配置
    // 更好的模型通常特征更聚焦，0.80-0.85 是识别“逻辑相似”的黄金区间
    DEFAULT_THRESHOLD: 0.82,
    MIN_THRESHOLD: 0.5,
    MAX_THRESHOLD: 1.0,
    // 性能配置 (针对大模型优化)
    // CodeBERT 比 MiniLM 重很多，建议减小批处理大小以防阻塞 VS Code 渲染进程
    BATCH_SIZE: 5,
    ENABLE_CACHE: true,
    // 新增：模型加载超时时间（大模型下载慢，建议设置长一点）
    LOAD_TIMEOUT: 60000,
    // 新增：代码预处理开关
    // 开启后会在向量化前抹除变量名干扰
    ENABLE_ANONYMIZATION: true,
};
//# sourceMappingURL=config.js.map