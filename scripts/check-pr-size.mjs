#!/usr/bin/env node
/**
 * Проверка размера PR (size guard v2)
 * 
 * Проверяет размер PR по количеству файлов, добавлений и удалений.
 * Исключает автоматически генерируемые файлы из подсчёта.
 * 
 * Использование: node scripts/check-pr-size.mjs [--max-files=N] [--max-additions=N] [--max-deletions=N]
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка конфигурации порогов
const THRESHOLDS_CONFIG_PATH = join(__dirname, '..', 'config', 'ci-thresholds.json');

/**
 * Загружает конфигурацию порогов из config/ci-thresholds.json
 */
function loadThresholdsConfig() {
  if (!existsSync(THRESHOLDS_CONFIG_PATH)) {
    return null;
  }

  try {
    const configContent = readFileSync(THRESHOLDS_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);
    return config;
  } catch (error) {
    console.warn(`⚠️  Failed to load thresholds config: ${error.message}`);
    return null;
  }
}

const thresholdsConfig = loadThresholdsConfig();

// Настраиваемые лимиты (из конфига, env переменных или дефолтные)
const prSizeConfig = thresholdsConfig?.prSize || {};
const MAX_FILES = parseInt(
  process.env.PR_SIZE_MAX_FILES || prSizeConfig.maxFiles?.toString() || '50',
  10
);
const MAX_ADDITIONS = parseInt(
  process.env.PR_SIZE_MAX_ADDITIONS || prSizeConfig.maxAdditions?.toString() || '2000',
  10
);
const MAX_DELETIONS = parseInt(
  process.env.PR_SIZE_MAX_DELETIONS || prSizeConfig.maxDeletions?.toString() || '1000',
  10
);
const WARNING_MULTIPLIER = prSizeConfig.warningMultiplier || 0.5;

// Настройки оповещений
const ALERTS_ENABLED = thresholdsConfig?.alerts?.prSize?.comments?.enabled !== false;

// Паттерны файлов, которые исключаются из подсчёта (автоматически генерируемые)
const EXCLUDED_PATTERNS = [
  /^prototype\/page\/.*\.html$/,
  /^prototype\/data\/.*\.json$/,
  /^tmp-.*$/,
  /^\.env$/,
  /^node_modules\//,
  /^\.git\//
];

function isExcluded(filePath) {
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath));
}

function getPRDiffStats(baseRef = 'main') {
  try {
    // Получаем статистику изменений через git diff
    const command = `git diff --numstat ${baseRef}...HEAD`;
    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: join(__dirname, '..')
    });
    
    let totalFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    const fileStats = [];
    
    const lines = output.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const additions = parseInt(parts[0], 10) || 0;
        const deletions = parseInt(parts[1], 10) || 0;
        const filePath = parts[2];
        
        // Пропускаем исключённые файлы
        if (isExcluded(filePath)) {
          continue;
        }
        
        totalFiles++;
        totalAdditions += additions;
        totalDeletions += deletions;
        
        fileStats.push({
          file: filePath,
          additions,
          deletions,
          total: additions + deletions
        });
      }
    }
    
    return {
      files: totalFiles,
      additions: totalAdditions,
      deletions: totalDeletions,
      fileStats: fileStats.sort((a, b) => b.total - a.total) // Сортируем по размеру изменений
    };
  } catch (error) {
    console.error(`❌ Ошибка при получении статистики diff: ${error.message}`);
    throw error;
  }
}

function formatSize(size) {
  if (size >= 1000) {
    return `${(size / 1000).toFixed(1)}k`;
  }
  return size.toString();
}

function main() {
  const baseRef = process.env.GITHUB_BASE_REF || 'main';
  
  console.log(`📊 Проверка размера PR (базовая ветка: ${baseRef})`);
  console.log(`   Лимиты: файлы ≤ ${MAX_FILES}, добавления ≤ ${formatSize(MAX_ADDITIONS)}, удаления ≤ ${formatSize(MAX_DELETIONS)}\n`);
  
  const stats = getPRDiffStats(baseRef);
  
  console.log(`📈 Статистика изменений:`);
  console.log(`   Файлов изменено: ${stats.files}`);
  console.log(`   Строк добавлено: ${formatSize(stats.additions)}`);
  console.log(`   Строк удалено: ${formatSize(stats.deletions)}`);
  console.log(`   Всего изменений: ${formatSize(stats.additions + stats.deletions)}\n`);
  
  const warnings = [];
  const errors = [];
  
  // Проверка количества файлов
  if (stats.files > MAX_FILES) {
    const diff = stats.files - MAX_FILES;
    const message = `Количество файлов (${stats.files}) превышает лимит (${MAX_FILES}) на ${diff}`;
    if (diff > MAX_FILES * WARNING_MULTIPLIER) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  // Проверка добавлений
  if (stats.additions > MAX_ADDITIONS) {
    const diff = stats.additions - MAX_ADDITIONS;
    const message = `Количество добавлений (${formatSize(stats.additions)}) превышает лимит (${formatSize(MAX_ADDITIONS)}) на ${formatSize(diff)}`;
    if (diff > MAX_ADDITIONS * WARNING_MULTIPLIER) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  // Проверка удалений
  if (stats.deletions > MAX_DELETIONS) {
    const diff = stats.deletions - MAX_DELETIONS;
    const message = `Количество удалений (${formatSize(stats.deletions)}) превышает лимит (${formatSize(MAX_DELETIONS)}) на ${formatSize(diff)}`;
    if (diff > MAX_DELETIONS * WARNING_MULTIPLIER) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }
  
  // Показываем топ-10 самых больших файлов
  if (stats.fileStats.length > 0) {
    console.log(`📋 Топ-10 файлов с наибольшими изменениями:`);
    stats.fileStats.slice(0, 10).forEach((fileStat, idx) => {
      console.log(`   ${idx + 1}. ${fileStat.file}: +${formatSize(fileStat.additions)}/-${formatSize(fileStat.deletions)}`);
    });
    console.log('');
  }
  
  // Выводим предупреждения и ошибки
  if (warnings.length > 0) {
    console.log('⚠️  Предупреждения:');
    warnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ Ошибки (критическое превышение лимитов):');
    errors.forEach(e => console.log(`   - ${e}`));
    console.log('');
    console.log('💡 Рекомендация: разбейте изменения на несколько меньших PR для упрощения ревью.');
    
    // Добавляем комментарий в PR при критическом превышении
    addPRComment(warnings, errors, stats);
    
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('💡 Рекомендация: рассмотрите возможность разбить изменения на несколько PR.');
    console.log('   Проверка не блокирует PR, но рекомендуется уменьшить размер для упрощения ревью.\n');
    
    // Добавляем комментарий в PR при предупреждениях
    addPRComment(warnings, errors, stats);
    
    process.exit(0);
  }

  console.log('✅ Размер PR в пределах лимитов');
  process.exit(0);
}

function addPRComment(warnings, errors, stats) {
  // Проверяем, включены ли оповещения в конфиге
  if (!ALERTS_ENABLED) {
    return;
  }

  const prNumber = process.env.GITHUB_PR_NUMBER || process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
  const repo = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
  const token = process.env.GITHUB_TOKEN;
  
  if (!prNumber || !token) {
    return; // Пропускаем, если нет PR номера или токена
  }
  
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  
  if (!hasErrors && !hasWarnings) {
    return; // Нет проблем, не добавляем комментарий
  }
  
  const topFiles = stats.fileStats.slice(0, 10).map((fileStat, idx) => {
    return `${idx + 1}. \`${fileStat.file}\`: +${formatSize(fileStat.additions)}/-${formatSize(fileStat.deletions)}`;
  }).join('\n');
  
  const comment = [
    hasErrors ? '## ❌ PR Size Exceeds Limits' : '## ⚠️ PR Size Warning',
    '',
    `**Статистика изменений:**`,
    `- Файлов изменено: ${stats.files}`,
    `- Строк добавлено: ${formatSize(stats.additions)}`,
    `- Строк удалено: ${formatSize(stats.deletions)}`,
    `- Всего изменений: ${formatSize(stats.additions + stats.deletions)}`,
    '',
    hasErrors ? '**Критические превышения лимитов:**' : '**Предупреждения:**',
    ...(hasErrors ? errors : warnings).map(w => `- ${w}`),
    '',
    '**Топ-10 файлов с наибольшими изменениями:**',
    topFiles,
    '',
    '**Рекомендация:** Рассмотрите возможность разбить изменения на несколько меньших PR для упрощения ревью.',
    '',
    `_Generated at ${new Date().toISOString()}_`
  ].join('\n');
  
  try {
    const tmpFile = join(__dirname, '../tmp-pr-size-comment.txt');
    writeFileSync(tmpFile, comment, 'utf8');
    
    execSync(
      `gh pr comment ${prNumber} --repo ${repo} --body-file "${tmpFile}"`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
        env: { ...process.env, GITHUB_TOKEN: token }
      }
    );
    console.log('✅ Comment added to PR');
    
    // Удаляем временный файл
    try {
      unlinkSync(tmpFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
  } catch (error) {
    console.warn('⚠️  Failed to add comment:', error.message);
    // Не блокируем CI
  }
}

main();

