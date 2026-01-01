/**
 * 下载模型到本地
 * 使用: node scripts/download-models.js
 */

const fs = require("fs");
const path = require("path");
const { pipeline, env } = require("@xenova/transformers");

const MODEL_NAME = "onnx-community/codebert-javascript-ONNX";
const MODEL_DIR = path.join(__dirname, "../models");

// 确保模型目录存在
if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
    console.log(`已创建模型目录: ${MODEL_DIR}`);
}

async function downloadFile(url, dest) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
    console.log(`✓ Downloaded ${path.basename(dest)}`);
}

async function downloadModel() {
    try {
        console.log(`\n开始下载模型: ${MODEL_NAME}`);
        console.log(`目标目录: ${MODEL_DIR}\n`);

        const modelParam = MODEL_NAME;
        const localPath = path.join(MODEL_DIR, modelParam);

        // Ensure nested directory exists
        if (!fs.existsSync(localPath)) {
            fs.mkdirSync(localPath, { recursive: true });
        }

        const baseUrl = `https://huggingface.co/${modelParam}/resolve/main`;
        const robertaUrl = `https://huggingface.co/Xenova/roberta-base/resolve/main`;

        // Download model weights and config from original source
        const modelFiles = [
            "config.json",
            "onnx/model_quantized.onnx"
        ];

        for (const file of modelFiles) {
            const fileUrl = `${baseUrl}/${file}`;
            const destPath = path.join(localPath, file);

            const fileDir = path.dirname(destPath);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            console.log(`Downloading ${file}...`);
            await downloadFile(fileUrl, destPath);
        }

        // Download tokenizer files from Xenova/roberta-base (compatible and working)
        const tokenizerFiles = [
            "tokenizer.json",
            "tokenizer_config.json",
            "vocab.json",
            "merges.txt"
        ];

        for (const file of tokenizerFiles) {
            const destPath = path.join(localPath, file);
            const fileUrl = `${robertaUrl}/${file}`;

            console.log(`Downloading ${file} (from Xenova/roberta-base)...`);
            await downloadFile(fileUrl, destPath);
        }

        // Configure env to use local model for verification
        env.localModelPath = MODEL_DIR;
        env.cacheDir = MODEL_DIR;
        env.allowRemoteModels = false; // Force local usage

        console.log("\nVerifying model loading...");
        // Verify loading
        await pipeline("feature-extraction", MODEL_NAME);

        console.log("\n✓ 模型下载完成！");
        console.log("现在可以在插件中使用本地模型了。");
        process.exit(0);
    } catch (error) {
        console.error("\n✗ 模型下载失败:");
        console.error(error);
        process.exit(1);
    }
}

downloadModel();
