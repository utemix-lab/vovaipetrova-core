// scripts/check-import-safety.mjs
// Проверяет, что импорт не перезапишет защищённые файлы
import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import YAML from 'yaml';

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

function main() {
  const config = loadImportMap();
  const denyPaths = config.deny_paths || [];
  const allowedPaths = config.allowed_paths || ['docs/**'];

  // Получаем список изменённых файлов из git
  const { execSync } = require('child_process');
  let changedFiles = [];
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    changedFiles = output.trim().split('\n').filter(Boolean);
  } catch (e) {
    console.warn('⚠️ Could not get changed files from git, checking all files in docs/');
    changedFiles = globSync('docs/**/*.md', { nodir: true });
  }

  const violations = [];
  for (const file of changedFiles) {
    if (matchesPattern(file, denyPaths)) {
      violations.push({
        file,
        reason: 'matches deny_paths'
      });
    } else if (!matchesPattern(file, allowedPaths)) {
      violations.push({
        file,
        reason: 'not in allowed_paths'
      });
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
    process.exit(0);
  }
}

main();

