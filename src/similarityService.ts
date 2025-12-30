import { CodeUnit, CodeVector, SimilarPair } from "./types";
import { CONFIG } from "./config";

/**
 * 相似度服务 - 计算和管理代码向量的相似度
 */
export class SimilarityService {
  private vectors: Map<string, CodeVector> = new Map();

  /**
   * 添加代码向量
   */
  addVector(unit: CodeUnit, vector: Float32Array): void {
    const key = this.generateKey(unit);
    this.vectors.set(key, { unit, vector });
  }

  /**
   * 批量添加向量
   */
  addVectors(units: CodeUnit[], vectors: Float32Array[]): void {
    if (units.length !== vectors.length) {
      throw new Error("代码单元数量与向量数量不匹配");
    }

    for (let i = 0; i < units.length; i++) {
      this.addVector(units[i], vectors[i]);
    }
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(v1: Float32Array, v2: Float32Array): number {
    if (v1.length !== v2.length) {
      throw new Error("向量维度不匹配");
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * 查找所有重复代码
   */
  findDuplicates(threshold: number = CONFIG.DEFAULT_THRESHOLD): SimilarPair[] {
    const pairs: SimilarPair[] = [];
    const entries = Array.from(this.vectors.values());

    // 遍历所有向量对
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        // 跳过同一文件中的代码(可能是同一个函数)
        if (
          entry1.unit.filePath === entry2.unit.filePath &&
          entry1.unit.name === entry2.unit.name
        ) {
          continue;
        }

        // 计算相似度
        const similarity = this.cosineSimilarity(entry1.vector, entry2.vector);

        // 如果相似度超过阈值,添加到结果
        if (similarity >= threshold) {
          pairs.push({
            source: entry1.unit,
            target: entry2.unit,
            similarity: similarity,
          });
        }
      }
    }

    // 按相似度降序排序
    pairs.sort((a, b) => b.similarity - a.similarity);

    return pairs;
  }

  /**
   * 查找与目标向量相似的代码单元
   */
  findSimilar(
    targetVector: Float32Array,
    threshold: number = CONFIG.DEFAULT_THRESHOLD,
    excludeUnit?: CodeUnit
  ): Array<{ unit: CodeUnit; similarity: number }> {
    const results: Array<{ unit: CodeUnit; similarity: number }> = [];

    for (const entry of this.vectors.values()) {
      // 排除指定的单元 (精确匹配: 文件路径 + 起始位置)
      // 或者如果是同一个对象引用
      if (excludeUnit) {
        const isSameFile = entry.unit.filePath === excludeUnit.filePath;
        const isSameLocation =
          entry.unit.startLine === excludeUnit.startLine &&
          entry.unit.startColumn === excludeUnit.startColumn;

        if (entry.unit === excludeUnit || (isSameFile && isSameLocation)) {
          continue;
        }
      }

      const similarity = this.cosineSimilarity(targetVector, entry.vector);

      if (similarity >= threshold) {
        results.push({
          unit: entry.unit,
          similarity: similarity,
        });
      }
    }

    // 按相似度降序排序
    results.sort((a, b) => b.similarity - a.similarity);

    return results;
  }

  /**
   * 获取存储的向量数量
   */
  getVectorCount(): number {
    return this.vectors.size;
  }

  /**
   * 清空所有向量
   */
  clear(): void {
    this.vectors.clear();
  }

  /**
   * 更新特定文件的向量缓存
   */
  updateFileVectors(filePath: string, newVectors: CodeVector[]): void {
    // 1. 删除该文件的旧向量
    for (const [key, value] of this.vectors.entries()) {
      if (value.unit.filePath === filePath) {
        this.vectors.delete(key);
      }
    }

    // 2. 添加新向量
    for (const cv of newVectors) {
      this.addVector(cv.unit, cv.vector);
    }
  }

  /**
   * 查找特定文件的重复项
   */
  findDuplicatesForFile(
    filePath: string,
    threshold: number = CONFIG.DEFAULT_THRESHOLD
  ): SimilarPair[] {
    const pairs: SimilarPair[] = [];

    // 获取目标文件的所有向量
    const targetVectors: CodeVector[] = [];
    for (const cv of this.vectors.values()) {
      if (cv.unit.filePath === filePath) {
        targetVectors.push(cv);
      }
    }

    // 与其他所有向量比较
    for (const target of targetVectors) {
      const candidates = this.findSimilar(
        target.vector,
        threshold,
        target.unit
      );

      for (const candidate of candidates) {
        pairs.push({
          source: target.unit,
          target: candidate.unit,
          similarity: candidate.similarity,
        });
      }
    }

    // 按相似度降序排序
    pairs.sort((a, b) => b.similarity - a.similarity);

    return pairs;
  }

  /**
   * 生成代码单元的唯一键
   */
  private generateKey(unit: CodeUnit): string {
    return `${unit.filePath}:${unit.name}:${unit.startLine}`;
  }
}
