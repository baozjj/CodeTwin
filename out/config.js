"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
/**
 * 配置常量
 */
exports.CONFIG = {
    // 模型配置
    MODEL_NAME: 'Xenova/all-MiniLM-L6-v2',
    VECTOR_DIMENSION: 384,
    MAX_TOKEN_LENGTH: 512,
    // 相似度配置
    DEFAULT_THRESHOLD: 0.85,
    MIN_THRESHOLD: 0.5,
    MAX_THRESHOLD: 1.0,
    // 性能配置
    BATCH_SIZE: 10,
    ENABLE_CACHE: true
};
//# sourceMappingURL=config.js.map