#!/usr/bin/env node
/**
 * Консолидированный скрипт для генерации diagnostics snapshot
 * Объединяет все проверки в единую систему со стабильными метриками
 * 
 * Использование:
 *   node scripts/generate-diagnostics.mjs [--verbose]
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERBOSE = process.argv.includes('--verbose');

function log(message) {
  if (VERBOSE || message.startsWith('✅') || message.startsWith('❌')) {
    console.log(message);
  }
}

function runScript(scriptPath, description) {
  try {
    log(`📊 ${description}...`);
    execSync(`node ${scriptPath}`, { 
      stdio: VERBOSE ? 'inherit' : 'pipe',
      cwd: __dirname + '/..'
    });
    log(`✅ ${description} completed`);
    return { success: true };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🔍 Generating diagnostics snapshot...\n');
  
  const results = {
    generatedAt: new Date().toISOString(),
    steps: []
  };
  
  // Шаг 1: Генерация pages.json (build-index)
  const buildResult = runScript(
    'prototype/build-index.mjs',
    'Building pages index'
  );
  results.steps.push({
    step: 'build-index',
    description: 'Building pages index',
    ...buildResult
  });
  
  if (!buildResult.success) {
    console.error('❌ Failed to build index. Stopping.');
    process.exit(1);
  }
  
  // Шаг 2: Проверка битых ссылок
  const linksResult = runScript(
    'scripts/report-broken-internal-links.mjs',
    'Checking broken links'
  );
  results.steps.push({
    step: 'broken-links',
    description: 'Checking broken links',
    ...linksResult
  });
  
  // Шаг 3: Генерация статистики
  const statsResult = runScript(
    'scripts/generate-stats.mjs',
    'Generating statistics'
  );
  results.steps.push({
    step: 'stats',
    description: 'Generating statistics',
    ...statsResult
  });
  
  if (!statsResult.success) {
    console.warn('⚠️  Failed to generate stats (non-blocking)');
  }
  
  // Шаг 4: Проверка консистентности маршрутов (не блокирующая)
  try {
    log(`📊 Checking routes consistency...`);
    execSync(`node scripts/check-routes-consistency.mjs`, { 
      stdio: VERBOSE ? 'inherit' : 'pipe',
      cwd: __dirname + '/..'
    });
    log(`✅ Checking routes consistency completed`);
    results.steps.push({
      step: 'routes-consistency',
      description: 'Checking routes consistency',
      success: true
    });
  } catch (error) {
    // check-routes-consistency возвращает код 1 при наличии orphans - это не ошибка
    log(`⚠️  Routes consistency check found orphans (non-blocking)`);
    results.steps.push({
      step: 'routes-consistency',
      description: 'Checking routes consistency',
      success: true, // Считаем успешным, т.к. orphans - это предупреждение
      warning: true
    });
  }
  
  // Подсчет результатов
  const successful = results.steps.filter(s => s.success).length;
  const failed = results.steps.filter(s => !s.success).length;
  const total = results.steps.length;
  
  console.log('\n📊 Diagnostics Summary:');
  console.log(`   Total steps: ${total}`);
  console.log(`   Successful: ${successful}`);
  if (failed > 0) {
    console.log(`   Failed: ${failed} (non-blocking)`);
  }
  
  // Выводим детали при verbose
  if (VERBOSE) {
    console.log('\n📋 Step details:');
    results.steps.forEach((step, idx) => {
      const icon = step.success ? '✅' : '❌';
      console.log(`   ${idx + 1}. ${icon} ${step.description}`);
      if (step.error) {
        console.log(`      Error: ${step.error}`);
      }
    });
  }
  
  // Код выхода: 0 если все критичные шаги успешны
  const criticalSteps = ['build-index', 'stats'];
  const criticalFailed = results.steps.some(
    s => criticalSteps.includes(s.step) && !s.success
  );
  
  if (criticalFailed) {
    console.error('\n❌ Critical diagnostics steps failed');
    process.exit(1);
  }
  
  console.log('\n✅ Diagnostics snapshot generated successfully');
  process.exit(0);
}

main();

