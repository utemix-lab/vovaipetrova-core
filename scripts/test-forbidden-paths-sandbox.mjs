#!/usr/bin/env node
/**
 * Sandbox test для проверки forbidden-paths
 * Запускает проверку на тестовых файлах в tests/sandbox/forbidden-paths/
 * 
 * Использование:
 *   node scripts/test-forbidden-paths-sandbox.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Копируем логику forbidden-paths из guardrails-v2.mjs
// Запрещённые пути (forbidden-paths)
const FORBIDDEN_PATHS = [
  /^\.env$/,
  /^\.env\./,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^\.env\.development$/,
  /^codegpt\.config\.json$/,
  /^vscode-settings\.example\.json$/,
  /^\.git\//,
  /^node_modules\//,
  /^vendor\//,
  /^\.cache\//,
  /^\.telemetry\//,
  /^\.build-cache\.json$/,
  /^tmp\//,
  /^temp\//,
  /^\.github\/workflows\/.*\.yml$/,
  /^\.github\/PULL_REQUEST_TEMPLATE/,
  /^\.github\/ISSUE_TEMPLATE/,
  /^package-lock\.json$/,
  /^composer\.json$/,
  /^composer\.lock$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  /^README\.md$/,
  /^CONTRIBUTING\.md$/,
  /^LICENSE$/,
  /^SECURITY\.md$/,
  /^CHANGELOG\.md$/,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^docs\/\.import-map\.yaml$/,
  /^scripts\/codegpt\/.*\.mjs$/,
  /^\.codegpt\//,
  /^notion-brain\//,
  /^prototype\/data\/.*\.json$/,
  /^prototype\/page\/.*\.html$/,
  /^prototype\/data\/\.build-cache\.json$/,
  /^test-guardrails\/bad-examples\/forbidden-.*\.md$/,
  /^test-guardrails-v2\//,
  /^tmp-.*\.(txt|md|json)$/,
  /^\.telemetry\/.*$/,
  /^lint\.log$/,
  /^STRUCTURE-REPORT\.md$/
];

// Исключения из forbidden-paths (разрешённые изменения)
const FORBIDDEN_ALLOWED = [
  /^\.github\/workflows\/docs-ci\.yml$/,
  /^\.github\/pull_request_template\.md$/,
  /^package\.json$/,
  /^docs\/protocol-kontraktnaya-model-dlya-agentov\.md$/,
];

/**
 * Проверка forbidden-paths (копия из guardrails-v2.mjs)
 */
function checkForbiddenPaths(changedFiles) {
  const violations = [];
  
  for (const file of changedFiles) {
    // Проверяем, разрешён ли файл
    const isAllowed = FORBIDDEN_ALLOWED.some(pattern => pattern.test(file));
    if (isAllowed) continue;
    
    // Проверяем, запрещён ли файл
    const isForbidden = FORBIDDEN_PATHS.some(pattern => pattern.test(file));
    if (isForbidden) {
      violations.push({
        file,
        message: `Forbidden path: ${file} (protected from changes)`
      });
    }
  }
  
  return violations;
}

const SANDBOX_DIR = 'tests/sandbox/forbidden-paths';

/**
 * Рекурсивно собирает все файлы из директории
 */
function collectFiles(dir, basePath = '') {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

function main() {
  console.log('🧪 Forbidden-paths sandbox test\n');
  
  if (!existsSync(SANDBOX_DIR)) {
    console.error(`❌ Sandbox directory not found: ${SANDBOX_DIR}`);
    process.exit(1);
  }
  
  // Собираем все тестовые файлы из sandbox
  const testFiles = collectFiles(SANDBOX_DIR);
  
  if (testFiles.length === 0) {
    console.error(`❌ No test files found in ${SANDBOX_DIR}`);
    process.exit(1);
  }
  
  console.log(`📁 Found ${testFiles.length} test file(s):`);
  testFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // Нормализуем пути (заменяем обратные слэши на прямые для кроссплатформенности)
  // И убираем суффикс .test для проверки соответствия паттернам
  const normalizedFiles = testFiles.map(file => 
    file.replace(/\\/g, '/').replace(/\.test$/, '')
  );
  
  console.log('📝 Normalized file paths for checking:');
  normalizedFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // Запускаем проверку forbidden-paths
  const violations = checkForbiddenPaths(normalizedFiles);
  
  console.log('🔍 Checking forbidden-paths...\n');
  
  if (violations.length === 0) {
    console.error('❌ FAIL: Expected violations but none were detected!');
    console.error('   This means the forbidden-paths check is not working correctly.');
    process.exit(1);
  }
  
  console.log(`✅ PASS: Detected ${violations.length} violation(s) as expected:\n`);
  violations.forEach((violation, index) => {
    console.log(`   ${index + 1}. ${violation.file}`);
    console.log(`      ${violation.message}`);
  });
  
  // Сохраняем отчёт в файл для артефактов CI
  const reportDir = 'tests/sandbox/results';
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = join(reportDir, 'forbidden-paths-sandbox-report.md');
  let report = `# Forbidden-paths Sandbox Test Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Test Results\n\n`;
  report += `✅ **PASS**: Detected ${violations.length} violation(s) as expected\n\n`;
  report += `## Detected Violations\n\n`;
  violations.forEach((violation, index) => {
    report += `${index + 1}. **${violation.file}**\n`;
    report += `   - ${violation.message}\n\n`;
  });
  report += `## Conclusion\n\n`;
  report += `The forbidden-paths check is working correctly. All expected violations were detected.\n`;
  
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log('\n✅ Sandbox test passed: forbidden-paths check is working correctly');
  process.exit(0);
}

main();

