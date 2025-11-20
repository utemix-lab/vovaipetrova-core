#!/usr/bin/env node
/**
 * Guardrails v2: size-guard, PII-scrub, forbidden-paths
 * Усиленная защита для задач Composer от опасных правок и утечек
 * 
 * Использование:
 *   node scripts/guardrails-v2.mjs [--base=main] [--verbose]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

const VERBOSE = process.argv.includes('--verbose');
const BASE_REF = process.argv.find(arg => arg.startsWith('--base='))?.split('=')[1] || 'main';

// Пороги size-guard по типам задач
const SIZE_LIMITS = {
  'composer': {
    maxFiles: 20,
    maxAdditions: 500,
    maxDeletions: 200,
    criticalMultiplier: 1.5 // Критическое превышение на 50%
  },
  'docs': {
    maxFiles: 30,
    maxAdditions: 1000,
    maxDeletions: 500,
    criticalMultiplier: 1.5
  },
  'scripts': {
    maxFiles: 15,
    maxAdditions: 800,
    maxDeletions: 300,
    criticalMultiplier: 1.5
  },
  'prototype': {
    maxFiles: 25,
    maxAdditions: 1200,
    maxDeletions: 600,
    criticalMultiplier: 1.5
  },
  'default': {
    maxFiles: 50,
    maxAdditions: 2000,
    maxDeletions: 1000,
    criticalMultiplier: 1.5
  }
};

// Запрещённые пути (forbidden-paths)
const FORBIDDEN_PATHS = [
  /^\.env$/,
  /^\.env\./,
  /^\.git\//,
  /^node_modules\//,
  /^vendor\//,
  /^\.github\/workflows\/.*\.yml$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^composer\.json$/,
  /^composer\.lock$/,
  /^README\.md$/,
  /^\.gitignore$/,
  /^\.github\/PULL_REQUEST_TEMPLATE/,
  /^docs\/\.import-map\.yaml$/,
  /^scripts\/codegpt\/.*\.mjs$/,
  /^\.codegpt\//,
  /^notion-brain\//
];

// Исключения из forbidden-paths (разрешённые изменения)
const FORBIDDEN_ALLOWED = [
  /^\.github\/workflows\/docs-ci\.yml$/, // Можно изменять docs-ci.yml
  /^package\.json$/, // Можно изменять package.json (но с осторожностью)
];

// Улучшенные паттерны PII
const PII_PATTERNS = [
  {
    name: 'windows_user_path',
    regex: /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)/g,
    kind: 'path',
    severity: 'error'
  },
  {
    name: 'unix_home_path',
    regex: /\/(?:home|Users)\/([A-Za-z0-9.-]+)/g,
    kind: 'path',
    severity: 'error'
  },
  {
    name: 'email',
    regex: /[A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    kind: 'email',
    severity: 'error'
  },
  {
    name: 'phone',
    regex: /\+?\d{1,3}[\s\-()]\d{2,4}[\s\-()]\d{2,4}[\s\-()]?\d{2,4}/g,
    kind: 'phone',
    severity: 'error'
  },
  {
    name: 'full_name',
    regex: /\b([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\b/g,
    kind: 'name',
    severity: 'warning', // Может быть ложным срабатыванием
    context: 'docs/stories/' // Только для stories
  },
  {
    name: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    kind: 'ip',
    severity: 'warning'
  },
  {
    name: 'api_key_pattern',
    regex: /(?:api[_-]?key|secret|token)\s*[:=]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi,
    kind: 'secret',
    severity: 'error'
  }
];

// Исключения из PII проверки (уже санитизированные)
const PII_EXCLUSIONS = [
  /<user>/i,
  /<email>/i,
  /<phone>/i,
  /<name>/i,
  /placeholder/i,
  /example\.com/i,
  /test@/i,
  /localhost/i,
  /127\.0\.0\.1/i
];

/**
 * Определяет тип задачи по изменённым файлам
 */
function detectTaskType(changedFiles) {
  const composerFiles = changedFiles.filter(f => f.startsWith('composer/') || f.includes('composer'));
  const docsFiles = changedFiles.filter(f => f.startsWith('docs/'));
  const scriptsFiles = changedFiles.filter(f => f.startsWith('scripts/'));
  const prototypeFiles = changedFiles.filter(f => f.startsWith('prototype/'));
  
  if (composerFiles.length > 0) return 'composer';
  if (docsFiles.length > 0 && docsFiles.length > scriptsFiles.length) return 'docs';
  if (scriptsFiles.length > 0) return 'scripts';
  if (prototypeFiles.length > 0) return 'prototype';
  
  return 'default';
}

/**
 * Получает статистику изменений из git diff
 */
function getDiffStats(baseRef) {
  try {
    const command = `git diff --numstat ${baseRef}...HEAD`;
    const output = execSync(command, { encoding: 'utf-8' });
    
    let totalFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    const changedFiles = [];
    
    const lines = output.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const [additions, deletions, file] = line.split('\t');
      if (!file) continue;
      
      // Исключаем автоматически генерируемые файлы
      if (file.match(/^prototype\/(page|data)\//)) continue;
      if (file.match(/^tmp-/)) continue;
      
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

/**
 * Проверка size-guard с порогами по типам задач
 */
function checkSizeGuard(stats, taskType) {
  const limits = SIZE_LIMITS[taskType] || SIZE_LIMITS.default;
  const violations = [];
  const warnings = [];
  
  // Проверка файлов
  if (stats.totalFiles > limits.maxFiles * limits.criticalMultiplier) {
    violations.push({
      type: 'files',
      actual: stats.totalFiles,
      limit: limits.maxFiles,
      message: `Too many files changed: ${stats.totalFiles} (limit: ${limits.maxFiles}, critical: ${Math.ceil(limits.maxFiles * limits.criticalMultiplier)})`
    });
  } else if (stats.totalFiles > limits.maxFiles) {
    warnings.push({
      type: 'files',
      actual: stats.totalFiles,
      limit: limits.maxFiles,
      message: `Many files changed: ${stats.totalFiles} (limit: ${limits.maxFiles})`
    });
  }
  
  // Проверка добавлений
  if (stats.totalAdditions > limits.maxAdditions * limits.criticalMultiplier) {
    violations.push({
      type: 'additions',
      actual: stats.totalAdditions,
      limit: limits.maxAdditions,
      message: `Too many additions: ${stats.totalAdditions} (limit: ${limits.maxAdditions}, critical: ${Math.ceil(limits.maxAdditions * limits.criticalMultiplier)})`
    });
  } else if (stats.totalAdditions > limits.maxAdditions) {
    warnings.push({
      type: 'additions',
      actual: stats.totalAdditions,
      limit: limits.maxAdditions,
      message: `Many additions: ${stats.totalAdditions} (limit: ${limits.maxAdditions})`
    });
  }
  
  // Проверка удалений
  if (stats.totalDeletions > limits.maxDeletions * limits.criticalMultiplier) {
    violations.push({
      type: 'deletions',
      actual: stats.totalDeletions,
      limit: limits.maxDeletions,
      message: `Too many deletions: ${stats.totalDeletions} (limit: ${limits.maxDeletions}, critical: ${Math.ceil(limits.maxDeletions * limits.criticalMultiplier)})`
    });
  } else if (stats.totalDeletions > limits.maxDeletions) {
    warnings.push({
      type: 'deletions',
      actual: stats.totalDeletions,
      limit: limits.maxDeletions,
      message: `Many deletions: ${stats.totalDeletions} (limit: ${limits.maxDeletions})`
    });
  }
  
  return { violations, warnings, limits, taskType };
}

/**
 * Проверка forbidden-paths
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

/**
 * Проверка PII в изменённых файлах
 */
function checkPII(changedFiles) {
  const violations = [];
  const warnings = [];
  
  for (const file of changedFiles) {
    // Проверяем только текстовые файлы
    if (!file.match(/\.(md|txt|json|yaml|yml|js|mjs|ts)$/)) continue;
    if (!existsSync(file)) continue;
    
    try {
      const content = readFileSync(file, 'utf8');
      
      // Пропускаем код блоки и уже санитизированные значения
      const codeBlockRegex = /```[\s\S]*?```/g;
      const sanitizedContent = content.replace(codeBlockRegex, '');
      
      for (const pattern of PII_PATTERNS) {
        const matches = [...sanitizedContent.matchAll(pattern.regex)];
        
        for (const match of matches) {
          const matchedText = match[0];
          
          // Проверяем исключения
          if (PII_EXCLUSIONS.some(exclusion => exclusion.test(matchedText))) {
            continue;
          }
          
          // Проверяем контекст (для некоторых паттернов)
          if (pattern.context && !file.includes(pattern.context)) {
            continue;
          }
          
          const issue = {
            file,
            pattern: pattern.name,
            kind: pattern.kind,
            match: matchedText.substring(0, 100),
            severity: pattern.severity
          };
          
          if (pattern.severity === 'error') {
            violations.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      }
    } catch (error) {
      if (VERBOSE) {
        console.warn(`⚠️  Failed to check PII in ${file}:`, error.message);
      }
    }
  }
  
  return { violations, warnings };
}

/**
 * Генерация отчёта
 */
function generateReport(sizeCheck, forbiddenCheck, piiCheck) {
  let report = '## Guardrails v2 Report\n\n';
  
  // Size-guard
  report += `### Size Guard (Task Type: ${sizeCheck.taskType})\n\n`;
  report += `**Limits:** ${sizeCheck.limits.maxFiles} files, ${sizeCheck.limits.maxAdditions} additions, ${sizeCheck.limits.maxDeletions} deletions\n\n`;
  
  if (sizeCheck.violations.length > 0) {
    report += '❌ **Violations (blocking):**\n';
    for (const violation of sizeCheck.violations) {
      report += `- ${violation.message}\n`;
    }
    report += '\n';
  }
  
  if (sizeCheck.warnings.length > 0) {
    report += '⚠️  **Warnings:**\n';
    for (const warning of sizeCheck.warnings) {
      report += `- ${warning.message}\n`;
    }
    report += '\n';
  }
  
  if (sizeCheck.violations.length === 0 && sizeCheck.warnings.length === 0) {
    report += '✅ **Size guard passed**\n\n';
  }
  
  // Forbidden-paths
  report += '### Forbidden Paths\n\n';
  if (forbiddenCheck.length > 0) {
    report += '❌ **Violations (blocking):**\n';
    for (const violation of forbiddenCheck) {
      report += `- ${violation.message}\n`;
    }
    report += '\n';
  } else {
    report += '✅ **No forbidden paths detected**\n\n';
  }
  
  // PII-scrub
  report += '### PII Detection\n\n';
  if (piiCheck.violations.length > 0) {
    report += '❌ **PII Violations (blocking):**\n';
    for (const violation of piiCheck.violations) {
      report += `- **${violation.file}**: ${violation.kind} detected: "${violation.match}"\n`;
    }
    report += '\n';
  }
  
  if (piiCheck.warnings.length > 0) {
    report += '⚠️  **PII Warnings:**\n';
    for (const warning of piiCheck.warnings) {
      report += `- **${warning.file}**: ${warning.kind} detected: "${warning.match}"\n`;
    }
    report += '\n';
  }
  
  if (piiCheck.violations.length === 0 && piiCheck.warnings.length === 0) {
    report += '✅ **No PII detected**\n\n';
  }
  
  // Summary
  const totalViolations = sizeCheck.violations.length + forbiddenCheck.length + piiCheck.violations.length;
  const totalWarnings = sizeCheck.warnings.length + piiCheck.warnings.length;
  
  report += '### Summary\n\n';
  report += `- **Violations:** ${totalViolations} (blocking)\n`;
  report += `- **Warnings:** ${totalWarnings} (non-blocking)\n\n`;
  
  if (totalViolations > 0) {
    report += '❌ **Guardrails failed!** Please fix violations before merging.\n';
  } else {
    report += '✅ **All guardrails passed!**\n';
  }
  
  return report;
}

function main() {
  console.log('🛡️  Guardrails v2: size-guard, PII-scrub, forbidden-paths\n');
  
  // Получаем статистику изменений
  const stats = getDiffStats(BASE_REF);
  const taskType = detectTaskType(stats.changedFiles);
  
  if (VERBOSE) {
    console.log(`📊 Changed files: ${stats.totalFiles}`);
    console.log(`📊 Additions: ${stats.totalAdditions}, Deletions: ${stats.totalDeletions}`);
    console.log(`📊 Detected task type: ${taskType}\n`);
  }
  
  // Проверки
  const sizeCheck = checkSizeGuard(stats, taskType);
  const forbiddenCheck = checkForbiddenPaths(stats.changedFiles);
  const piiCheck = checkPII(stats.changedFiles);
  
  // Генерация отчёта
  const report = generateReport(sizeCheck, forbiddenCheck, piiCheck);
  console.log(report);
  
  // Вывод в консоль
  if (sizeCheck.violations.length > 0) {
    console.log('❌ Size guard violations detected');
  }
  if (forbiddenCheck.length > 0) {
    console.log('❌ Forbidden paths detected');
  }
  if (piiCheck.violations.length > 0) {
    console.log('❌ PII violations detected');
  }
  
  // Код выхода
  const totalViolations = sizeCheck.violations.length + forbiddenCheck.length + piiCheck.violations.length;
  process.exit(totalViolations > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith('guardrails-v2.mjs')) {
  main();
}

export { checkSizeGuard, checkForbiddenPaths, checkPII };

