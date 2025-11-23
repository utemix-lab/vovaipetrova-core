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
  'codegpt': {
    maxFiles: 25,
    maxAdditions: 800,
    maxDeletions: 300,
    criticalMultiplier: 1.5 // CodeGPT задачи могут быть немного больше, чем Composer
  },
  'copilot': {
    maxFiles: 30,
    maxAdditions: 1000,
    maxDeletions: 400,
    criticalMultiplier: 1.5 // Copilot задачи могут быть больше, чем CodeGPT (больше документации и инфраструктуры)
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
// Обновлено: актуализирован список после последних изменений в репозитории (2025-11-20)
const FORBIDDEN_PATHS = [
  // Секреты и конфигурация
  /^\.env$/,
  /^\.env\./,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^\.env\.development$/,
  /^codegpt\.config\.json$/, // Конфигурация CodeGPT может содержать секреты
  /^vscode-settings\.example\.json$/, // Пример настроек VS Code
  
  // Системные директории
  /^\.git\//,
  /^node_modules\//,
  /^vendor\//,
  /^\.cache\//,
  /^\.telemetry\//,
  /^\.build-cache\.json$/,
  /^tmp\//, // Временная директория
  /^temp\//, // Временная директория
  
  // GitHub конфигурация (защищено от случайных изменений)
  /^\.github\/workflows\/.*\.yml$/, // Все workflow файлы защищены
  /^\.github\/PULL_REQUEST_TEMPLATE/,
  /^\.github\/ISSUE_TEMPLATE/,
  
  // Зависимости и конфигурация проекта
  /^package-lock\.json$/, // package.json можно изменять через FORBIDDEN_ALLOWED
  /^composer\.json$/, // Защищено от изменений Composer
  /^composer\.lock$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  
  // Корневые файлы проекта
  /^README\.md$/,
  /^CONTRIBUTING\.md$/,
  /^LICENSE$/,
  /^SECURITY\.md$/,
  /^CHANGELOG\.md$/, // Changelog обновляется автоматически
  /^\.gitignore$/,
  /^\.gitattributes$/,
  
  // Критические конфигурационные файлы
  /^docs\/\.import-map\.yaml$/, // Защита от перезаписи при импорте из Notion
  /^scripts\/codegpt\/.*\.mjs$/, // Защита API ключей и интеграций
  /^\.codegpt\//,
  /^notion-brain\//,
  
  // Автоматически генерируемые файлы (не должны изменяться вручную)
  /^prototype\/data\/.*\.json$/, // Генерируются автоматически (pages.json, stats.json, broken-links.json, orphans.json, routes.json)
  /^prototype\/page\/.*\.html$/, // Генерируются автоматически
  /^prototype\/data\/\.build-cache\.json$/, // Кэш сборки
  
  // Тестовые и временные файлы (не должны коммититься)
  /^test-guardrails\/bad-examples\/forbidden-.*\.md$/, // Тестовые файлы с нарушениями
  /^test-guardrails-v2\//, // Тестовые файлы guardrails v2
  /^tmp-.*\.(txt|md|json)$/, // Временные файлы
  /^\.telemetry\/.*$/,
  /^lint\.log$/, // Логи линтинга
  /^STRUCTURE-REPORT\.md$/ // Автоматически генерируемый отчёт
];

// Исключения из forbidden-paths (разрешённые изменения)
// Важно: изменения в этих файлах требуют особой осторожности
// Обновлено: актуализирован список разрешённых файлов (2025-11-20)
const FORBIDDEN_ALLOWED = [
  /^\.github\/workflows\/docs-ci\.yml$/, // Можно изменять docs-ci.yml для добавления новых проверок
  /^\.github\/pull_request_template\.md$/, // Можно обновлять шаблон PR
  /^package\.json$/, // Можно изменять package.json (но с осторожностью - проверяется через guardrails)
  /^docs\/protocol-kontraktnaya-model-dlya-agentov\.md$/, // Можно обновлять протокол для агентов
];

// Улучшенные паттерны PII (актуализировано)
// Обновлено: расширены паттерны для лучшего обнаружения персональных данных
const PII_PATTERNS = [
  {
    name: 'windows_user_path',
    regex: /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)/g,
    kind: 'path',
    severity: 'error',
    description: 'Windows user directory path'
  },
  {
    name: 'unix_home_path',
    regex: /\/(?:home|Users)\/([A-Za-z0-9.-]+)/g,
    kind: 'path',
    severity: 'error',
    description: 'Unix/Linux home directory path'
  },
  {
    name: 'email',
    regex: /[A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    kind: 'email',
    severity: 'error',
    description: 'Email address'
  },
  {
    name: 'phone',
    regex: /\+?\d{1,3}[\s\-()]\d{2,4}[\s\-()]\d{2,4}[\s\-()]?\d{2,4}/g,
    kind: 'phone',
    severity: 'error',
    description: 'Phone number'
  },
  {
    name: 'phone_compact',
    regex: /\b\d{10,15}\b/g, // Компактный формат без разделителей
    kind: 'phone',
    severity: 'warning', // Может быть ложным срабатыванием (номера версий, хеши)
    description: 'Compact phone number format'
  },
  {
    name: 'full_name',
    regex: /\b([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\b/g,
    kind: 'name',
    severity: 'warning', // Может быть ложным срабатыванием
    context: 'docs/stories/', // Только для stories
    description: 'Full name (Russian)'
  },
  {
    name: 'full_name_english',
    regex: /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g,
    kind: 'name',
    severity: 'warning', // Может быть ложным срабатыванием
    context: 'docs/stories/', // Только для stories
    description: 'Full name (English)'
  },
  {
    name: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    kind: 'ip',
    severity: 'warning', // Может быть версией или примером
    description: 'IP address'
  },
  {
    name: 'api_key_pattern',
    regex: /(?:api[_-]?key|secret|token|password|pwd)\s*[:=]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi,
    kind: 'secret',
    severity: 'error',
    description: 'API key, secret, or token pattern'
  },
  {
    name: 'github_token',
    regex: /ghp_[A-Za-z0-9]{36}/g,
    kind: 'secret',
    severity: 'error',
    description: 'GitHub personal access token'
  },
  {
    name: 'notion_token',
    regex: /(?:secret_|ntn_)[A-Za-z0-9_-]{32,}/g,
    kind: 'secret',
    severity: 'error',
    description: 'Notion API token'
  },
  {
    name: 'aws_access_key',
    regex: /AKIA[0-9A-Z]{16}/g,
    kind: 'secret',
    severity: 'error',
    description: 'AWS access key ID'
  },
  {
    name: 'credit_card',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    kind: 'financial',
    severity: 'error',
    description: 'Credit card number pattern'
  },
  {
    name: 'mac_address',
    regex: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
    kind: 'device',
    severity: 'warning', // Может быть примером в документации
    description: 'MAC address'
  },
  {
    name: 'windows_path_with_username',
    regex: /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)\\Documents/g,
    kind: 'path',
    severity: 'error',
    description: 'Windows Documents path with username'
  },
  {
    name: 'windows_path_with_username_desktop',
    regex: /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)\\Desktop/g,
    kind: 'path',
    severity: 'error',
    description: 'Windows Desktop path with username'
  },
  {
    name: 'windows_path_with_username_downloads',
    regex: /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)\\Downloads/g,
    kind: 'path',
    severity: 'error',
    description: 'Windows Downloads path with username'
  }
];

// Исключения из PII проверки (уже санитизированные)
// Обновлено: расширен список исключений для уменьшения ложных срабатываний
const PII_EXCLUSIONS = [
  // Санитизированные плейсхолдеры
  /<user>/i,
  /<email>/i,
  /<phone>/i,
  /<name>/i,
  /<path>/i,
  /placeholder/i,
  /example/i,
  
  // Тестовые и примерные адреса
  /example\.com/i,
  /test@/i,
  /test@example/i,
  /user@example/i,
  /admin@localhost/i,
  
  // Локальные адреса и примеры
  /localhost/i,
  /127\.0\.0\.1/i,
  /0\.0\.0\.0/i,
  /192\.168\./i, // Частные IP сети (обычно примеры)
  /10\./i, // Частные IP сети
  /172\.(1[6-9]|2[0-9]|3[01])\./i, // Частные IP сети
  
  // Известные примеры в документации
  /john\.doe@example\.com/i,
  /jane\.doe@example\.com/i,
  /test@test\.com/i,
  
  // Версии и хеши (могут совпадать с паттернами телефонов)
  /v?\d+\.\d+\.\d+/i, // Версии типа 1.2.3
  /[0-9a-f]{32,}/i, // Хеши (MD5, SHA256 и т.д.)
  
  // Известные публичные примеры
  /github\.com/i,
  /gitlab\.com/i,
  /bitbucket\.org/i
];

/**
 * Определяет тип задачи по изменённым файлам и PR labels
 */
function detectTaskType(changedFiles, prLabels = []) {
  // Проверяем PR labels для определения типа задачи
  const copilotLabels = prLabels.filter(l => l.startsWith('lane:copilot'));
  if (copilotLabels.length > 0) return 'copilot';
  
  const codegptLabels = prLabels.filter(l => l.startsWith('lane:codegpt:'));
  if (codegptLabels.length > 0) return 'codegpt';
  
  const composerFiles = changedFiles.filter(f => f.startsWith('composer/') || f.includes('composer'));
  const codegptFiles = changedFiles.filter(f => 
    f.startsWith('.codegpt/') || 
    f.includes('codegpt') || 
    f.startsWith('scripts/codegpt/')
  );
  const copilotFiles = changedFiles.filter(f => 
    f.includes('copilot') || 
    f.includes('COPILOT') ||
    f.startsWith('mcp-server-') ||
    f.includes('mcp-server')
  );
  const docsFiles = changedFiles.filter(f => f.startsWith('docs/'));
  const scriptsFiles = changedFiles.filter(f => f.startsWith('scripts/'));
  const prototypeFiles = changedFiles.filter(f => f.startsWith('prototype/'));
  
  if (copilotFiles.length > 0) return 'copilot';
  if (codegptFiles.length > 0) return 'codegpt';
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

/**
 * Получает PR labels через GitHub API
 */
function getPRLabels() {
  const prNumber = process.env.GITHUB_PR_NUMBER;
  const repo = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
  const token = process.env.GITHUB_TOKEN;
  
  if (!prNumber || !token) {
    return [];
  }
  
  try {
    const command = `gh api repos/${repo}/pulls/${prNumber} --jq '.labels[].name'`;
    const output = execSync(command, { 
      encoding: 'utf-8',
      stdio: 'pipe',
      env: { ...process.env, GITHUB_TOKEN: token }
    });
    
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    if (VERBOSE) {
      console.warn('⚠️  Failed to get PR labels:', error.message);
    }
    return [];
  }
}

function main() {
  console.log('🛡️  Guardrails v2: size-guard, PII-scrub, forbidden-paths\n');
  
  // Получаем статистику изменений
  const stats = getDiffStats(BASE_REF);
  const prLabels = getPRLabels();
  const taskType = detectTaskType(stats.changedFiles, prLabels);
  
  if (VERBOSE) {
    console.log(`📊 Changed files: ${stats.totalFiles}`);
    console.log(`📊 Additions: ${stats.totalAdditions}, Deletions: ${stats.totalDeletions}`);
    if (prLabels.length > 0) {
      console.log(`📊 PR labels: ${prLabels.join(', ')}`);
    }
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

