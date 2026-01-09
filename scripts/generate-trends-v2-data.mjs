#!/usr/bin/env node
/**
 * Trends Dashboard Data Generator v2
 * Подготавливает данные для dashboard с динамикой за 14/30 дней
 * Графики draft/ready/re-run со скользящим средним и медианой
 * 
 * Использование:
 *   node scripts/generate-trends-v2-data.mjs [--input=.ci-metrics/ci-metrics.json] [--output=prototype/data/trends-v2-dashboard.json] [--days=14|30]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const CI_METRICS_FILE = process.argv.find(arg => arg.startsWith('--input='))?.split('=')[1] || 
  join('.ci-metrics', 'ci-metrics.json');
const OUTPUT_FILE = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
  join('prototype', 'data', 'trends-v2-dashboard.json');
const DAYS_FILTER = parseInt(process.argv.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';

/**
 * Загружает метрики CI
 */
function loadMetrics() {
  if (!existsSync(CI_METRICS_FILE)) {
    console.warn(`⚠️  CI metrics file not found: ${CI_METRICS_FILE}`);
    return { runs: [], summary: null };
  }

  try {
    return JSON.parse(readFileSync(CI_METRICS_FILE, 'utf8'));
  } catch (e) {
    console.error(`❌ Error reading CI metrics: ${e.message}`);
    return { runs: [], summary: null };
  }
}

/**
 * Кэш для информации о PR (избегаем повторных запросов)
 */
const prCache = {};

/**
 * Получает информацию о PR через GitHub API
 */
function getPRInfo(prNumber) {
  if (!GITHUB_TOKEN || !prNumber) return null;
  
  try {
    const output = execSync(
      `gh api repos/${GITHUB_REPO}/pulls/${prNumber}`,
      { 
        encoding: 'utf8', 
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    return JSON.parse(output);
  } catch (error) {
    // PR может быть удалён или недоступен - это нормально
    return null;
  }
}

/**
 * Определяет тип run (draft/ready/re-run)
 * Использует эвристику для определения типов без необходимости запрашивать каждый PR через API
 */
function getRunType(run) {
  // Re-run определяется по event (workflow_run - это обычно re-run)
  // или по повторным запускам одного и того же workflow для одного PR
  if (run.event === 'workflow_run') {
    return 're-run';
  }

  // Если это pull_request event
  if (run.event === 'pull_request') {
    // Пытаемся получить информацию о PR (с кэшированием)
    if (run.prNumber) {
      if (!prCache[run.prNumber]) {
        const prInfo = getPRInfo(run.prNumber);
        prCache[run.prNumber] = prInfo ? {
          draft: prInfo.draft === true,
          state: prInfo.state
        } : null;
      }
      
      const prInfo = prCache[run.prNumber];
      if (prInfo) {
        return prInfo.draft ? 'draft' : 'ready';
      }
    }
    
    // Если не удалось получить информацию о PR, используем эвристику:
    // Если workflow запускался ранее для того же PR (по headSha или headBranch),
    // это может быть re-run
    // Для простоты, если это PR event без возможности определить draft - считаем ready
    return 'ready';
  }

  return 'other';
}

/**
 * Фильтрует runs по периоду (последние N дней)
 */
function filterByPeriod(runs, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);

  return runs.filter(run => {
    if (!run.createdAt) return false;
    const runDate = new Date(run.createdAt);
    return runDate >= cutoffDate;
  });
}

/**
 * Группирует метрики по дням с разбивкой по типам (draft/ready/re-run)
 */
function groupByDayWithTypes(runs) {
  const byDay = {};

  for (const run of runs) {
    if (!run.createdAt) continue;
    const date = new Date(run.createdAt);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!byDay[dayKey]) {
      byDay[dayKey] = {
        date: dayKey,
        draft: [],
        ready: [],
        're-run': [],
        other: []
      };
    }

    const runType = getRunType(run);
    byDay[dayKey][runType].push(run);
  }

  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Вычисляет скользящее среднее для массива значений
 */
function movingAverage(values, windowSize = 7) {
  if (values.length === 0) return [];
  
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    const avg = window.reduce((sum, v) => sum + (v.value || 0), 0) / window.length;
    result.push({
      date: values[i].date,
      value: avg,
      originalValue: values[i].value
    });
  }
  return result;
}

/**
 * Вычисляет медиану для массива значений за период
 */
function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Вычисляет медиану для каждого дня с учётом скользящего окна
 */
function movingMedian(values, windowSize = 7) {
  if (values.length === 0) return [];
  
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end);
    const medianValue = median(window.map(v => v.value || 0));
    result.push({
      date: values[i].date,
      value: medianValue,
      originalValue: values[i].value
    });
  }
  return result;
}

/**
 * Вычисляет тренды с разбивкой по типам (draft/ready/re-run)
 */
function calculateTrendsByType(runs, days) {
  const filteredRuns = filterByPeriod(runs, days);
  const byDay = groupByDayWithTypes(filteredRuns);

  const trends = {
    draft: [],
    ready: [],
    're-run': [],
    all: []
  };

  for (const day of byDay) {
    const dayTrends = {
      date: day.date,
      draft: { count: day.draft.length, success: day.draft.filter(r => r.conclusion === 'success').length },
      ready: { count: day.ready.length, success: day.ready.filter(r => r.conclusion === 'success').length },
      're-run': { count: day['re-run'].length, success: day['re-run'].filter(r => r.conclusion === 'success').length }
    };

    trends.draft.push({ date: day.date, value: dayTrends.draft.count });
    trends.ready.push({ date: day.date, value: dayTrends.ready.count });
    trends['re-run'].push({ date: day.date, value: dayTrends['re-run'].count });
    trends.all.push({ 
      date: day.date, 
      value: dayTrends.draft.count + dayTrends.ready.count + dayTrends['re-run'].count 
    });
  }

  // Вычисляем скользящее среднее и медиану
  const windowSize = Math.min(7, Math.floor(days / 4)); // Окно примерно 25% от периода

  return {
    draft: {
      raw: trends.draft,
      movingAverage: movingAverage(trends.draft, windowSize),
      movingMedian: movingMedian(trends.draft, windowSize)
    },
    ready: {
      raw: trends.ready,
      movingAverage: movingAverage(trends.ready, windowSize),
      movingMedian: movingMedian(trends.ready, windowSize)
    },
    're-run': {
      raw: trends['re-run'],
      movingAverage: movingAverage(trends['re-run'], windowSize),
      movingMedian: movingMedian(trends['re-run'], windowSize)
    },
    all: {
      raw: trends.all,
      movingAverage: movingAverage(trends.all, windowSize),
      movingMedian: movingMedian(trends.all, windowSize)
    }
  };
}

/**
 * Главная функция
 */
function main() {
  console.log(`📊 Generating trends v2 dashboard data (${DAYS_FILTER} days)...`);
  console.log(`   Input: ${CI_METRICS_FILE}`);
  console.log(`   Output: ${OUTPUT_FILE}`);

  const metrics = loadMetrics();
  const runs = metrics.runs || [];

  if (runs.length === 0) {
    console.warn('⚠️  No CI metrics found. Dashboard will be empty.');
  } else {
    console.log(`   Found ${runs.length} workflow runs`);
  }

  // Вычисляем тренды для обоих периодов
  const trends14 = calculateTrendsByType(runs, 14);
  const trends30 = calculateTrendsByType(runs, 30);

  // Сводка по типам (используем глобальный prCache)
  const filtered14 = filterByPeriod(runs, 14);
  const filtered30 = filterByPeriod(runs, 30);

  // Сначала определяем типы для всех runs (чтобы заполнить prCache)
  runs.forEach(r => getRunType(r));

  const summary14 = {
    draft: filtered14.filter(r => getRunType(r) === 'draft').length,
    ready: filtered14.filter(r => getRunType(r) === 'ready').length,
    're-run': filtered14.filter(r => getRunType(r) === 're-run').length,
    other: filtered14.filter(r => getRunType(r) === 'other').length
  };

  const summary30 = {
    draft: filtered30.filter(r => getRunType(r) === 'draft').length,
    ready: filtered30.filter(r => getRunType(r) === 'ready').length,
    're-run': filtered30.filter(r => getRunType(r) === 're-run').length,
    other: filtered30.filter(r => getRunType(r) === 'other').length
  };

  const dashboardData = {
    generatedAt: new Date().toISOString(),
    period: DAYS_FILTER,
    summary: {
      '14days': summary14,
      '30days': summary30,
      total: {
        draft: runs.filter(r => getRunType(r) === 'draft').length,
        ready: runs.filter(r => getRunType(r) === 'ready').length,
        're-run': runs.filter(r => getRunType(r) === 're-run').length,
        other: runs.filter(r => getRunType(r) === 'other').length
      }
    },
    trends: {
      '14days': trends14,
      '30days': trends30
    }
  };

  // Создаём директорию если её нет
  const outputDir = OUTPUT_FILE.split('/').slice(0, -1).join('/');
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(dashboardData, null, 2), 'utf8');
  console.log(`✅ Trends v2 dashboard data saved to: ${OUTPUT_FILE}`);
  console.log(`   14 days: ${trends14.all.raw.length} data points`);
  console.log(`   30 days: ${trends30.all.raw.length} data points`);
  console.log(`   Summary (last 14 days): draft=${summary14.draft}, ready=${summary14.ready}, re-run=${summary14['re-run']}`);
  console.log(`   Summary (last 30 days): draft=${summary30.draft}, ready=${summary30.ready}, re-run=${summary30['re-run']}`);
}

main();
