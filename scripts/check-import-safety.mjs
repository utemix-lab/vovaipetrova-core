// scripts/check-import-safety.mjs
// Проверяет, что импорт не перезапишет защищённые файлы
import { readFileSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { globSync } from 'glob';
import YAML from 'yaml';
import matter from 'gray-matter';

const IMPORT_MAP_PATH = 'docs/.import-map.yaml';

function loadImportMap() {
  if (!existsSync(IMPORT_MAP_PATH)) {
    return { deny_paths: [], allowed_paths: ['docs/**'] };
  }
  try {
    return YAML.parse(readFileSync(IMPORT_MAP_PATH, 'utf8'));
  } catch (e) {
    console.error('⚠️ Failed to parse .import-map.yaml:', e?.message);
    return { deny_paths: [], allowed_paths: ['docs/**'] };
  }
}

function matchesPattern(path, patterns) {
  for (const pattern of patterns) {
    const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
    if (regex.test(path)) return true;
  }
  return false;
}

function getNotionPageId(file) {
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, 'utf8');
    const fm = matter(raw).data || {};
    return fm.notion_page_id || null;
  } catch {
    return null;
  }
}

function getLastEditedTime(file) {
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, 'utf8');
    const fm = matter(raw).data || {};
    return fm.last_edited_time || null;
  } catch {
    return null;
  }
}

function main() {
  const config = loadImportMap();
  const denyPaths = config.deny_paths || [];
  const allowedPaths = config.allowed_paths || ['docs/**'];

  // Получаем список изменённых файлов из git
  let changedFiles = [];
  let deletedFiles = [];
  let addedFiles = [];
  
  try {
    const diffOutput = execSync('git diff --name-status HEAD', { encoding: 'utf8' });
    const lines = diffOutput.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const [status, ...rest] = line.split('\t');
      const file = rest.join('\t');
      if (status.startsWith('D')) {
        deletedFiles.push(file);
      } else if (status.startsWith('A')) {
        addedFiles.push(file);
      } else {
        changedFiles.push(file);
      }
    }
    changedFiles = [...changedFiles, ...addedFiles];
  } catch (e) {
    console.warn('⚠️ Could not get changed files from git, checking all files in docs/');
    changedFiles = globSync('docs/**/*.md', { nodir: true });
  }

  const violations = [];
  const warnings = [];

  // Жёсткая проверка: изменения только в allowed_paths
  for (const file of changedFiles) {
    if (matchesPattern(file, denyPaths)) {
      violations.push({
        file,
        reason: 'matches deny_paths (запрещено)'
      });
    } else if (!matchesPattern(file, allowedPaths)) {
      violations.push({
        file,
        reason: 'not in allowed_paths (за пределами разрешённой зоны)'
      });
    }
  }

  // Проверка: удалённые файлы с notion_page_id должны быть заменены git mv
  for (const deleted of deletedFiles) {
    const notionId = getNotionPageId(deleted);
    if (notionId) {
      // Проверяем, есть ли файл с таким же notion_page_id в добавленных
      const found = addedFiles.find(f => {
        const newId = getNotionPageId(f);
        return newId === notionId;
      });
      if (!found) {
        violations.push({
          file: deleted,
          reason: `deleted file with notion_page_id=${notionId} without git mv replacement`
        });
      }
    }
  }

  // Предупреждение: если last_edited_time в Notion старее, чем в репо
  for (const file of changedFiles) {
    if (!file.endsWith('.md')) continue;
    const notionTime = getLastEditedTime(file);
    if (notionTime && existsSync(file)) {
      try {
        const repoTime = statSync(file).mtime.toISOString();
        if (new Date(notionTime) < new Date(repoTime)) {
          warnings.push({
            file,
            reason: `last_edited_time в Notion (${notionTime}) старее, чем в репо (${repoTime})`
          });
        }
      } catch (e) {
        // Игнорируем ошибки stat
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    for (const w of warnings) {
      console.warn(`  - ${w.file}: ${w.reason}`);
    }
  }

  if (violations.length > 0) {
    console.error('❌ Import safety check failed:');
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.reason}`);
    }
    process.exit(1);
  } else {
    console.log('✅ Import safety check passed');
    if (warnings.length > 0) {
      console.log(`   (${warnings.length} warnings)`);
    }
    process.exit(0);
  }
}

main();

