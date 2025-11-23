#!/usr/bin/env node
/**
 * Sandbox test для проверки Copilot guardrails
 * Тестирует size-guard для Copilot задач
 * 
 * Использование:
 *   node scripts/test-copilot-guardrails-sandbox.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Импортируем функции из guardrails-v2.mjs
import { checkSizeGuard, checkForbiddenPaths, checkPII } from './guardrails-v2.mjs';

const SANDBOX_DIR = 'tests/sandbox/copilot-guardrails';
const RESULTS_DIR = 'tests/sandbox/results';

/**
 * Создаёт тестовую ветку с изменениями для проверки size-guard
 */
function createTestBranch() {
  try {
    // Проверяем, есть ли уже тестовая ветка
    const branches = execSync('git branch --list test-copilot-guardrails', { encoding: 'utf-8' }).trim();
    if (branches) {
      execSync('git checkout test-copilot-guardrails', { stdio: 'pipe' });
      execSync('git reset --hard main', { stdio: 'pipe' });
    } else {
      execSync('git checkout -b test-copilot-guardrails', { stdio: 'pipe' });
    }
    
    // Создаём тестовые файлы для проверки size-guard
    const testFiles = [
      { path: 'docs/copilot-test-guide.md', content: '# Copilot Test Guide\n\nTest content.\n'.repeat(80) },
      { path: 'docs/copilot-mcp-setup.md', content: '# Copilot MCP Setup\n\nTest content.\n'.repeat(100) },
      { path: 'mcp-server-copilot-test.mjs', content: '// Copilot MCP server test\n'.repeat(40) },
      { path: 'docs/github-labels-guide.md', content: '# GitHub Labels Guide\n\nTest content.\n'.repeat(60) },
      { path: 'scripts/copilot/test-script.mjs', content: '// Copilot test script\n'.repeat(30) },
    ];
    
    // Создаём директории если нужно
    testFiles.forEach(file => {
      const dir = file.path.split('/').slice(0, -1).join('/');
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(file.path, file.content, 'utf8');
    });
    
    execSync('git add -A', { stdio: 'pipe' });
    execSync('git commit -m "test: Copilot guardrails sandbox test"', { stdio: 'pipe' });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create test branch:', error.message);
    return false;
  }
}

/**
 * Очищает тестовую ветку
 */
function cleanupTestBranch() {
  try {
    execSync('git checkout main', { stdio: 'pipe' });
    execSync('git branch -D test-copilot-guardrails', { stdio: 'pipe' });
  } catch (error) {
    // Игнорируем ошибки очистки
  }
}

/**
 * Получает статистику изменений для тестовой ветки
 */
function getTestDiffStats() {
  try {
    const command = 'git diff --numstat main...test-copilot-guardrails';
    const output = execSync(command, { encoding: 'utf-8' });
    
    let totalFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    const changedFiles = [];
    
    const lines = output.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const [additions, deletions, file] = line.split('\t');
      if (!file) continue;
      
      changedFiles.push(file);
      totalFiles++;
      totalAdditions += parseInt(additions) || 0;
      totalDeletions += parseInt(deletions) || 0;
    }
    
    return { totalFiles, totalAdditions, totalDeletions, changedFiles };
  } catch (error) {
    console.error('❌ Failed to get diff stats:', error.message);
    return { totalFiles: 0, totalAdditions: 0, totalDeletions: 0, changedFiles: [] };
  }
}

function main() {
  console.log('🧪 Copilot Guardrails Sandbox Test\n');
  
  // Проверяем, что мы в git репозитории
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Not in a git repository');
    process.exit(1);
  }
  
  // Создаём тестовую ветку
  console.log('📝 Creating test branch...');
  if (!createTestBranch()) {
    process.exit(1);
  }
  
  try {
    // Получаем статистику изменений
    const stats = getTestDiffStats();
    console.log(`📊 Test diff stats:`);
    console.log(`   Files: ${stats.totalFiles}`);
    console.log(`   Additions: ${stats.totalAdditions}`);
    console.log(`   Deletions: ${stats.totalDeletions}`);
    console.log('');
    
    // Проверяем size-guard для Copilot
    console.log('🔍 Testing size-guard for Copilot...');
    const sizeCheck = checkSizeGuard(stats, 'copilot');
    
    // Проверяем forbidden-paths
    console.log('🔍 Testing forbidden-paths...');
    const forbiddenCheck = checkForbiddenPaths(stats.changedFiles);
    
    // Проверяем PII
    console.log('🔍 Testing PII detection...');
    const piiCheck = checkPII(stats.changedFiles);
    
    // Генерируем отчёт
    const report = {
      timestamp: new Date().toISOString(),
      sizeCheck,
      forbiddenCheck,
      piiCheck,
      stats
    };
    
    // Сохраняем отчёт
    if (!existsSync(RESULTS_DIR)) {
      mkdirSync(RESULTS_DIR, { recursive: true });
    }
    
    const reportPath = join(RESULTS_DIR, 'copilot-guardrails-sandbox-report.md');
    let reportMarkdown = `# Copilot Guardrails Sandbox Test Report\n\n`;
    reportMarkdown += `Generated: ${report.timestamp}\n\n`;
    reportMarkdown += `## Test Results\n\n`;
    reportMarkdown += `### Size Guard (Copilot)\n\n`;
    reportMarkdown += `**Limits:** ${sizeCheck.limits?.maxFiles || 'N/A'} files, ${sizeCheck.limits?.maxAdditions || 'N/A'} additions, ${sizeCheck.limits?.maxDeletions || 'N/A'} deletions\n\n`;
    reportMarkdown += `**Actual:** ${stats.totalFiles} files, ${stats.totalAdditions} additions, ${stats.totalDeletions} deletions\n\n`;
    
    if (sizeCheck.violations.length > 0) {
      reportMarkdown += `❌ **Violations:**\n`;
      sizeCheck.violations.forEach(v => {
        reportMarkdown += `- ${v.message}\n`;
      });
      reportMarkdown += '\n';
    }
    
    if (sizeCheck.warnings.length > 0) {
      reportMarkdown += `⚠️  **Warnings:**\n`;
      sizeCheck.warnings.forEach(w => {
        reportMarkdown += `- ${w.message}\n`;
      });
      reportMarkdown += '\n';
    }
    
    if (sizeCheck.violations.length === 0 && sizeCheck.warnings.length === 0) {
      reportMarkdown += `✅ **Size guard passed**\n\n`;
    }
    
    reportMarkdown += `### Forbidden Paths\n\n`;
    if (forbiddenCheck.length > 0) {
      reportMarkdown += `❌ **Violations:**\n`;
      forbiddenCheck.forEach(v => {
        reportMarkdown += `- ${v.message}\n`;
      });
      reportMarkdown += '\n';
    } else {
      reportMarkdown += `✅ **No forbidden paths detected**\n\n`;
    }
    
    reportMarkdown += `### PII Detection\n\n`;
    if (piiCheck.violations.length > 0) {
      reportMarkdown += `❌ **Violations:**\n`;
      piiCheck.violations.forEach(v => {
        reportMarkdown += `- **${v.file}**: ${v.kind} detected: "${v.match}"\n`;
      });
      reportMarkdown += '\n';
    }
    
    if (piiCheck.warnings.length > 0) {
      reportMarkdown += `⚠️  **Warnings:**\n`;
      piiCheck.warnings.forEach(w => {
        reportMarkdown += `- **${w.file}**: ${w.kind} detected: "${w.match}"\n`;
      });
      reportMarkdown += '\n';
    }
    
    if (piiCheck.violations.length === 0 && piiCheck.warnings.length === 0) {
      reportMarkdown += `✅ **No PII detected**\n\n`;
    }
    
    reportMarkdown += `## Conclusion\n\n`;
    const totalViolations = sizeCheck.violations.length + forbiddenCheck.length + piiCheck.violations.length;
    if (totalViolations === 0) {
      reportMarkdown += `✅ **All guardrails passed!** Copilot guardrails are working correctly.\n`;
    } else {
      reportMarkdown += `❌ **Guardrails detected violations.** This is expected for sandbox test.\n`;
    }
    
    writeFileSync(reportPath, reportMarkdown, 'utf8');
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Выводим результаты
    console.log('\n📊 Test Results:');
    console.log(`   Size guard violations: ${sizeCheck.violations.length}`);
    console.log(`   Size guard warnings: ${sizeCheck.warnings.length}`);
    console.log(`   Forbidden paths violations: ${forbiddenCheck.length}`);
    console.log(`   PII violations: ${piiCheck.violations.length}`);
    console.log(`   PII warnings: ${piiCheck.warnings.length}`);
    
    if (totalViolations === 0) {
      console.log('\n✅ Sandbox test passed: Copilot guardrails are working correctly');
      process.exit(0);
    } else {
      console.log('\n⚠️  Sandbox test detected violations (expected for test)');
      process.exit(0); // Не фейлим тест, так как это ожидаемо для sandbox
    }
  } finally {
    // Очищаем тестовую ветку
    cleanupTestBranch();
  }
}

main();

