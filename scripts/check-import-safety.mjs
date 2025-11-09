// scripts/check-import-safety.mjs
// Проверяет, что импорт не перезапишет защищённые файлы
import { readFileSync, existsSync, statSync, appendFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { globSync } from 'glob';
import YAML from 'yaml';
import matter from 'gray-matter';

const IMPORT_MAP_PATH = 'docs/.import-map.yaml';
const MAX_CHANGED_FILES = 500;
const MAX_BINARY_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOC_EXTS = new Set(['.md', '.csv', '.png', '.jpg', '.jpeg', '.svg', '.gif']);

function appendOutput(key, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  appendFileSync(output, `${key}=${value}\n`);
}

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

  let changedFiles = [];
  let deletedFiles = [];
  let addedFiles = [];

  try {
    const diffOutput = execSync('git diff --name-status --find-renames HEAD', { encoding: 'utf8' });
    const lines = diffOutput.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const [status, ...rest] = line.split('\t');
      if (status.startsWith('D')) {
        const file = rest[0];
        deletedFiles.push(file);
      } else if (status.startsWith('A')) {
        const file = rest.join('\t');
        addedFiles.push(file);
        changedFiles.push(file);
      } else if (status.startsWith('R')) {
        const from = rest[0];
        const to = rest[1];
        deletedFiles.push(from);
        addedFiles.push(to);
        changedFiles.push(to);
      } else {
        const file = rest.join('\t');
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
  const guardHalts = [];

  const totalAffected = new Set([...changedFiles, ...deletedFiles]);
  if (totalAffected.size > MAX_CHANGED_FILES) {
    guardHalts.push(`too many files changed (${totalAffected.size} > ${MAX_CHANGED_FILES})`);
  }

  const isDocFile = (file) => file.startsWith('docs/');
  const hasAllowedDocExtension = (file) => {
    const idx = file.lastIndexOf('.');
    if (idx === -1) return false;
    const ext = file.slice(idx).toLowerCase();
    return ALLOWED_DOC_EXTS.has(ext);
  };

  for (const file of changedFiles) {
    if (isDocFile(file) && !hasAllowedDocExtension(file)) {
      violations.push({
        file,
        reason: `unsupported extension for docs (allowed: ${[...ALLOWED_DOC_EXTS].join(', ')})`
      });
    }
    if (!file.startsWith('uploads/') && existsSync(file)) {
      try {
        const size = statSync(file).size;
        if (size > MAX_BINARY_SIZE) {
          const mb = Math.round((size / 1024 / 1024) * 10) / 10;
          violations.push({
            file,
            reason: `file size ${mb}MB exceeds 10MB threshold (outside uploads/)`
          });
        }
      } catch {
        // ignore stat errors
      }
    }
  }

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

  if (guardHalts.length > 0) {
    const reason = guardHalts.join('; ');
    console.log('ℹ️ Import halted by safety guard:', reason);
    console.log('   Split the export or reduce the change set before retrying.');
    appendOutput('status', 'halt');
    appendOutput('halt_reason', reason);
    appendOutput('needs_review', 'true');
    writeFileSync('import-halt.txt', `Import halted: ${reason}\n`);
    process.exit(0);
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
    appendOutput('needs_review', 'true');
    process.exit(1);
  } else {
    console.log('✅ Import safety check passed');
    if (warnings.length > 0) {
      console.log(`   (${warnings.length} warnings)`);
    }
    appendOutput('needs_review', warnings.length > 0 ? 'true' : 'false');
    process.exit(0);
  }
}

main();

