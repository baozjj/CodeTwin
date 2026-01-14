import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, 'models');

const MODEL_URLS = {
  'qwen2.5-coder': {
    name: 'Qwen2.5-Coder-0.5B-Instruct',
    files: [
      {
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
        filename: 'qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
        size: '~352MB'
      }
    ]
  },
  'minilm': {
    name: 'all-MiniLM-L6-v2',
    files: [
      {
        url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx',
        filename: 'all-MiniLM-L6-v2-model.onnx',
        size: '~90MB'
      },
      {
        url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json',
        filename: 'all-MiniLM-L6-v2-tokenizer.json',
        size: '~466KB'
      },
      {
        url: 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json',
        filename: 'all-MiniLM-L6-v2-tokenizer_config.json',
        size: '~1KB'
      }
    ]
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  }
}

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    console.log(`\nDownloading: ${path.basename(filepath)}`);
    console.log(`From: ${url}`);
    
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        file.close();
        fs.unlinkSync(filepath);
        const redirectUrl = new URL(response.headers.location, url).href;
        return downloadFile(redirectUrl, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastPercent = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = Math.floor((downloadedSize / totalSize) * 100);
        
        if (percent !== lastPercent && percent % 5 === 0) {
          const downloaded = (downloadedSize / 1024 / 1024).toFixed(2);
          const total = (totalSize / 1024 / 1024).toFixed(2);
          process.stdout.write(`\rProgress: ${percent}% (${downloaded}MB / ${total}MB)`);
          lastPercent = percent;
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`\n✓ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('=== CodeTwin Model Downloader ===\n');
  
  ensureDir(MODELS_DIR);
  
  for (const [key, model] of Object.entries(MODEL_URLS)) {
    console.log(`\n📦 Downloading ${model.name}...`);
    
    for (const file of model.files) {
      const filepath = path.join(MODELS_DIR, file.filename);
      
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Skipping ${file.filename} (already exists)`);
        continue;
      }
      
      try {
        await downloadFile(file.url, filepath);
      } catch (error) {
        console.error(`\n❌ Error downloading ${file.filename}:`, error.message);
        throw error;
      }
    }
  }
  
  console.log('\n\n✅ All models downloaded successfully!');
  console.log('\nDownloaded files:');
  const files = fs.readdirSync(MODELS_DIR);
  files.forEach(file => {
    const stats = fs.statSync(path.join(MODELS_DIR, file));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`  - ${file} (${sizeMB} MB)`);
  });
  
  console.log('\n🚀 Ready to run: npm test');
}

downloadModels().catch(error => {
  console.error('\n❌ Download failed:', error);
  process.exit(1);
});
