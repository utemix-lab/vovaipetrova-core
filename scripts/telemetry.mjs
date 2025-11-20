#!/usr/bin/env node
/**
 * Telemetry: сбор минимальных метрик для улучшения Composer
 * Собирает: время выполнения, размер диффа, причины фейлов
 * 
 * Использование:
 *   node scripts/telemetry.mjs [--step=step-name] [--start|--end] [--fail=reason]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const TELEMETRY_DIR = '.telemetry';
const METRICS_FILE = join(TELEMETRY_DIR, 'metrics.json');
const STEP_TIMINGS_FILE = join(TELEMETRY_DIR, 'step-timings.json');

// Создаём директорию если её нет
if (!existsSync(TELEMETRY_DIR)) {
  mkdirSync(TELEMETRY_DIR, { recursive: true });
}

/**
 * Загружает существующие метрики или создаёт новые
 */
function loadMetrics() {
  if (existsSync(METRICS_FILE)) {
    try {
      return JSON.parse(readFileSync(METRICS_FILE, 'utf8'));
    } catch (e) {
      return { steps: [], failures: [], diff: null };
    }
  }
  return { steps: [], failures: [], diff: null };
}

/**
 * Загружает тайминги шагов
 */
function loadStepTimings() {
  if (existsSync(STEP_TIMINGS_FILE)) {
    try {
      return JSON.parse(readFileSync(STEP_TIMINGS_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Сохраняет метрики
 */
function saveMetrics(metrics) {
  writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2), 'utf8');
}

/**
 * Сохраняет тайминги шагов
 */
function saveStepTimings(timings) {
  writeFileSync(STEP_TIMINGS_FILE, JSON.stringify(timings, null, 2), 'utf8');
}

/**
 * Получает размер диффа
 */
function getDiffMetrics() {
  try {
    // Пытаемся получить дифф относительно main или HEAD
    let baseRef = 'main';
    try {
      execSync('git rev-parse --verify origin/main', { stdio: 'pipe' });
    } catch {
      baseRef = 'HEAD';
    }
    
    const output = execSync(`git diff --stat ${baseRef}...HEAD`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const lines = output.trim().split('\n');
    let totalAdditions = 0;
    let totalDeletions = 0;
    let filesChanged = 0;
    
    for (const line of lines) {
      if (line.includes('|')) {
        filesChanged++;
        // Формат: "file.md | 10 ++++++++++ 5 -----"
        const match = line.match(/(\d+)\s+\+\+\+.*?(\d+)\s+---/);
        if (match) {
          totalAdditions += parseInt(match[1]) || 0;
          totalDeletions += parseInt(match[2]) || 0;
        } else {
          // Альтернативный формат: "file.md | 15 ++++++++++"
          const addMatch = line.match(/(\d+)\s+\+/);
          const delMatch = line.match(/(\d+)\s+-/);
          if (addMatch) totalAdditions += parseInt(addMatch[1]) || 0;
          if (delMatch) totalDeletions += parseInt(delMatch[1]) || 0;
        }
      }
    }
    
    return {
      additions: totalAdditions,
      deletions: totalDeletions,
      filesChanged,
      baseRef
    };
  } catch (error) {
    // Если нет изменений или ошибка git, возвращаем нули
    return {
      additions: 0,
      deletions: 0,
      filesChanged: 0,
      baseRef: 'HEAD',
      error: error.message
    };
  }
}

/**
 * Главная функция
 */
function main() {
  const args = process.argv.slice(2);
  const stepArg = args.find(arg => arg.startsWith('--step='));
  const stepName = stepArg ? stepArg.split('=')[1] : null;
  const isStart = args.includes('--start');
  const isEnd = args.includes('--end');
  const failArg = args.find(arg => arg.startsWith('--fail='));
  const failReason = failArg ? failArg.split('=')[1] : null;
  const collectDiff = args.includes('--collect-diff');
  
  const metrics = loadMetrics();
  const timings = loadStepTimings();
  
  // Обработка таймингов шагов
  if (stepName) {
    if (isStart) {
      timings[stepName] = {
        start: Date.now(),
        end: null,
        duration: null
      };
      saveStepTimings(timings);
      console.log(`⏱️  Started: ${stepName}`);
    } else if (isEnd) {
      if (timings[stepName] && timings[stepName].start) {
        const duration = Date.now() - timings[stepName].start;
        timings[stepName].end = Date.now();
        timings[stepName].duration = duration;
        saveStepTimings(timings);
        
        // Добавляем в метрики
        metrics.steps.push({
          name: stepName,
          duration,
          timestamp: new Date().toISOString()
        });
        saveMetrics(metrics);
        
        console.log(`✅ Completed: ${stepName} (${duration}ms)`);
      }
    }
  }
  
  // Обработка фейлов
  if (failReason) {
    metrics.failures.push({
      reason: failReason,
      step: stepName || 'unknown',
      timestamp: new Date().toISOString()
    });
    saveMetrics(metrics);
    console.log(`❌ Failure recorded: ${failReason}`);
  }
  
  // Сбор метрик диффа
  if (collectDiff) {
    const diffMetrics = getDiffMetrics();
    metrics.diff = diffMetrics;
    saveMetrics(metrics);
    console.log(`📊 Diff metrics: +${diffMetrics.additions} -${diffMetrics.deletions} (${diffMetrics.filesChanged} files)`);
  }
  
  // Вывод сводки
  if (args.includes('--summary')) {
    const totalDuration = metrics.steps.reduce((sum, s) => sum + (s.duration || 0), 0);
    console.log('\n📊 Telemetry Summary:');
    console.log(`   Steps executed: ${metrics.steps.length}`);
    console.log(`   Total duration: ${totalDuration}ms`);
    console.log(`   Failures: ${metrics.failures.length}`);
    if (metrics.diff) {
      console.log(`   Diff: +${metrics.diff.additions} -${metrics.diff.deletions} (${metrics.diff.filesChanged} files)`);
    }
  }
}

main();

