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
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Настраиваемые лимиты (можно переопределить через переменные окружения)
const MAX_FILES = parseInt(process.env.PR_SIZE_MAX_FILES || '50', 10);
const MAX_ADDITIONS = parseInt(process.env.PR_SIZE_MAX_ADDITIONS || '2000', 10);
const MAX_DELETIONS = parseInt(process.env.PR_SIZE_MAX_DELETIONS || '1000', 10);

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
    if (diff > MAX_FILES * 0.5) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }
  
  // Проверка добавлений
  if (stats.additions > MAX_ADDITIONS) {
    const diff = stats.additions - MAX_ADDITIONS;
    const message = `Количество добавлений (${formatSize(stats.additions)}) превышает лимит (${formatSize(MAX_ADDITIONS)}) на ${formatSize(diff)}`;
    if (diff > MAX_ADDITIONS * 0.5) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }
  
  // Проверка удалений
  if (stats.deletions > MAX_DELETIONS) {
    const diff = stats.deletions - MAX_DELETIONS;
    const message = `Количество удалений (${formatSize(stats.deletions)}) превышает лимит (${formatSize(MAX_DELETIONS)}) на ${formatSize(diff)}`;
    if (diff > MAX_DELETIONS * 0.5) {
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
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.log('💡 Рекомендация: рассмотрите возможность разбить изменения на несколько PR.');
    console.log('   Проверка не блокирует PR, но рекомендуется уменьшить размер для упрощения ревью.\n');
    process.exit(0);
  }
  
  console.log('✅ Размер PR в пределах лимитов');
  process.exit(0);
}

main();

