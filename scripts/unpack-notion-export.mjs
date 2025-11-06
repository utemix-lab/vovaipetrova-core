// scripts/unpack-notion-export.mjs
// Распаковывает ZIP из uploads/ и применяет маппинг путей
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, createWriteStream } from 'fs';
import { join, dirname } from 'path';
import YAML from 'yaml';
import yauzl from 'yauzl';

const UPLOADS_DIR = 'uploads';
const IMPORT_MAP_PATH = 'docs/.import-map.yaml';
const TARGET_DIR = 'docs';

function loadImportMap() {
  if (!existsSync(IMPORT_MAP_PATH)) {
    return { mappings: {} };
  }
  try {
    return YAML.parse(readFileSync(IMPORT_MAP_PATH, 'utf8'));
  } catch (e) {
    console.error('⚠️ Failed to parse .import-map.yaml:', e?.message);
    return { mappings: {} };
  }
}

function findZipFile() {
  if (!existsSync(UPLOADS_DIR)) {
    console.error(`❌ Directory ${UPLOADS_DIR} not found`);
    process.exit(1);
  }
  
  const files = readdirSync(UPLOADS_DIR);
  const zipFiles = files.filter(f => f.endsWith('.zip') || f.endsWith('.ZIP'));
  
  if (zipFiles.length === 0) {
    console.error(`❌ No ZIP files found in ${UPLOADS_DIR}`);
    process.exit(1);
  }
  
  if (zipFiles.length > 1) {
    console.warn(`⚠️ Multiple ZIP files found, using: ${zipFiles[0]}`);
  }
  
  return join(UPLOADS_DIR, zipFiles[0]);
}

function mapPath(notionPath, mappings) {
  // Убираем ведущие слеши и нормализуем путь
  const cleanPath = notionPath.replace(/^\/+/, '').replace(/\\/g, '/');
  
  for (const [pattern, config] of Object.entries(mappings)) {
    const cleanPattern = pattern.replace(/\*\*/g, '').replace(/\\/g, '/');
    if (cleanPath.startsWith(cleanPattern)) {
      const rest = cleanPath.slice(cleanPattern.length).replace(/^\/+/, '');
      return join(config.to || 'docs/', rest);
    }
  }
  // По умолчанию в docs/
  return join(TARGET_DIR, cleanPath);
}

function extractZip(zipPath, config) {
  return new Promise((resolve, reject) => {
    console.log(`📦 Extracting ${zipPath}...`);
    const extractedFiles = [];
    
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          zipfile.readEntry();
        } else if (entry.fileName.endsWith('.md')) {
          // Markdown file
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              console.error(`⚠️ Failed to read ${entry.fileName}:`, err.message);
              zipfile.readEntry();
              return;
            }
            
            const targetPath = mapPath(entry.fileName, config.mappings || {});
            const targetDir = dirname(targetPath);
            mkdirSync(targetDir, { recursive: true });
            
            const writeStream = createWriteStream(targetPath);
            readStream.pipe(writeStream);
            
            writeStream.on('close', () => {
              extractedFiles.push({ source: entry.fileName, target: targetPath });
              zipfile.readEntry();
            });
            
            writeStream.on('error', (err) => {
              console.error(`⚠️ Failed to write ${targetPath}:`, err.message);
              zipfile.readEntry();
            });
          });
        } else {
          // Skip non-md files
          zipfile.readEntry();
        }
      });
      
      zipfile.on('end', () => {
        console.log(`✅ Extracted ${extractedFiles.length} .md files`);
        resolve(extractedFiles);
      });
      
      zipfile.on('error', reject);
    });
  });
}

async function main() {
  const config = loadImportMap();
  const zipPath = findZipFile();
  const files = await extractZip(zipPath, config);
  
  console.log('\n📋 Extracted files:');
  for (const f of files) {
    console.log(`  ${f.source} → ${f.target}`);
  }
  
  console.log('\n✅ Extraction complete. Run normalize next.');
}

main().catch(err => {
  console.error('❌ Extraction failed:', err.message);
  process.exit(1);
});

