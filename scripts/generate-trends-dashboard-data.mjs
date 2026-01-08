#!/usr/bin/env node
/**
 * Trends Dashboard Data Generator
 * Подготавливает данные для статического dashboard с трендами метрик CI
 * 
 * Использование:
 *   node scripts/generate-trends-dashboard-data.mjs [--input=.ci-metrics/ci-metrics.json] [--output=prototype/data/trends-dashboard.json]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CI_METRICS_FILE = process.argv.find(arg => arg.startsWith('--input='))?.split('=')[1] || 
  join('.ci-metrics', 'ci-metrics.json');
const OUTPUT_FILE = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
  join('prototype', 'data', 'trends-dashboard.json');

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
 * Группирует метрики по дням
 */
function groupByDay(runs) {
  const byDay = {};

  for (const run of runs) {
    if (!run.createdAt) continue;
    const date = new Date(run.createdAt);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!byDay[dayKey]) {
      byDay[dayKey] = {
        date: dayKey,
        runs: [],
        workflows: {},
        jobs: {}
      };
    }

    byDay[dayKey].runs.push(run);

    // Группируем по workflow
    const workflowName = run.workflowName || 'unknown';
    if (!byDay[dayKey].workflows[workflowName]) {
      byDay[dayKey].workflows[workflowName] = {
        name: workflowName,
        runs: 0,
        success: 0,
        failure: 0,
        totalDuration: 0
      };
    }
    byDay[dayKey].workflows[workflowName].runs++;
    if (run.conclusion === 'success') byDay[dayKey].workflows[workflowName].success++;
    if (run.conclusion === 'failure') byDay[dayKey].workflows[workflowName].failure++;
    if (run.duration) byDay[dayKey].workflows[workflowName].totalDuration += run.duration;

    // Группируем по jobs
    for (const job of run.jobs || []) {
      const jobName = job.name || 'unknown';
      if (!byDay[dayKey].jobs[jobName]) {
        byDay[dayKey].jobs[jobName] = {
          name: jobName,
          runs: 0,
          success: 0,
          failure: 0,
          totalDuration: 0
        };
      }
      byDay[dayKey].jobs[jobName].runs++;
      if (job.status === 'success') byDay[dayKey].jobs[jobName].success++;
      if (job.status === 'failure') byDay[dayKey].jobs[jobName].failure++;
      if (job.duration) byDay[dayKey].jobs[jobName].totalDuration += job.duration;
    }
  }

  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Вычисляет тренды метрик
 */
function calculateTrends(runs) {
  if (!runs || runs.length === 0) {
    return {
      workflowDuration: [],
      successRate: [],
      jobsCount: [],
      failureRate: []
    };
  }

  const byDay = groupByDay(runs);

  const workflowDuration = byDay.map(day => {
    const durations = day.runs.filter(r => r.duration).map(r => r.duration);
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
    return {
      date: day.date,
      value: Math.round(avgDuration / 1000), // в секундах
      count: durations.length
    };
  });

  const successRate = byDay.map(day => {
    const successfulRuns = day.runs.filter(r => r.conclusion === 'success').length;
    const totalRuns = day.runs.length;
    return {
      date: day.date,
      value: totalRuns > 0 ? (successfulRuns / totalRuns * 100) : 0,
      count: totalRuns
    };
  });

  const jobsCount = byDay.map(day => {
    const totalJobs = day.runs.reduce((sum, r) => sum + (r.jobsCount || 0), 0);
    const avgJobs = day.runs.length > 0 ? totalJobs / day.runs.length : 0;
    return {
      date: day.date,
      value: Math.round(avgJobs * 10) / 10,
      count: day.runs.length
    };
  });

  const failureRate = byDay.map(day => {
    const failedRuns = day.runs.filter(r => r.conclusion === 'failure').length;
    const totalRuns = day.runs.length;
    return {
      date: day.date,
      value: totalRuns > 0 ? (failedRuns / totalRuns * 100) : 0,
      count: totalRuns
    };
  });

  return {
    workflowDuration,
    successRate,
    jobsCount,
    failureRate
  };
}

/**
 * Генерирует сводку по workflow
 */
function generateWorkflowSummary(runs) {
  const workflows = {};

  for (const run of runs) {
    const workflowName = run.workflowName || 'unknown';
    if (!workflows[workflowName]) {
      workflows[workflowName] = {
        name: workflowName,
        runs: 0,
        success: 0,
        failure: 0,
        totalDuration: 0,
        avgDuration: 0,
        jobsCount: 0
      };
    }

    workflows[workflowName].runs++;
    if (run.conclusion === 'success') workflows[workflowName].success++;
    if (run.conclusion === 'failure') workflows[workflowName].failure++;
    if (run.duration) workflows[workflowName].totalDuration += run.duration;
    if (run.jobsCount) workflows[workflowName].jobsCount += run.jobsCount;
  }

  // Вычисляем средние значения
  for (const workflowName in workflows) {
    const wf = workflows[workflowName];
    wf.avgDuration = wf.runs > 0 ? wf.totalDuration / wf.runs : 0;
    wf.successRate = wf.runs > 0 ? (wf.success / wf.runs * 100) : 0;
    wf.avgJobsPerRun = wf.runs > 0 ? wf.jobsCount / wf.runs : 0;
  }

  return Object.values(workflows);
}

/**
 * Генерирует сводку по jobs
 */
function generateJobSummary(runs) {
  const jobs = {};

  for (const run of runs) {
    for (const job of run.jobs || []) {
      const jobName = job.name || 'unknown';
      if (!jobs[jobName]) {
        jobs[jobName] = {
          name: jobName,
          runs: 0,
          success: 0,
          failure: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }

      jobs[jobName].runs++;
      if (job.status === 'success') jobs[jobName].success++;
      if (job.status === 'failure') jobs[jobName].failure++;
      if (job.duration) jobs[jobName].totalDuration += job.duration;
    }
  }

  // Вычисляем средние значения
  for (const jobName in jobs) {
    const job = jobs[jobName];
    job.avgDuration = job.runs > 0 ? job.totalDuration / job.runs : 0;
    job.successRate = job.runs > 0 ? (job.success / job.runs * 100) : 0;
  }

  return Object.values(jobs).sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 20);
}

/**
 * Главная функция
 */
function main() {
  console.log('📊 Generating trends dashboard data...');
  console.log(`   Input: ${CI_METRICS_FILE}`);
  console.log(`   Output: ${OUTPUT_FILE}`);

  const metrics = loadMetrics();
  const runs = metrics.runs || [];

  if (runs.length === 0) {
    console.warn('⚠️  No CI metrics found. Dashboard will be empty.');
  } else {
    console.log(`   Found ${runs.length} workflow runs`);
  }

  const trends = calculateTrends(runs);
  const workflowSummary = generateWorkflowSummary(runs);
  const jobSummary = generateJobSummary(runs);

  const dashboardData = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRuns: runs.length,
      successfulRuns: runs.filter(r => r.conclusion === 'success').length,
      failedRuns: runs.filter(r => r.conclusion === 'failure').length,
      dateRange: {
        start: runs.length > 0 ? runs.map(r => r.createdAt).sort()[0] : null,
        end: runs.length > 0 ? runs.map(r => r.createdAt).sort().reverse()[0] : null
      }
    },
    trends,
    workflows: workflowSummary,
    topJobs: jobSummary
  };

  // Создаём директорию если её нет
  const outputDir = OUTPUT_FILE.split('/').slice(0, -1).join('/');
  if (outputDir && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(dashboardData, null, 2), 'utf8');
  console.log(`✅ Trends dashboard data saved to: ${OUTPUT_FILE}`);
  console.log(`   Trends data points: ${trends.workflowDuration.length}`);
  console.log(`   Workflows: ${workflowSummary.length}`);
  console.log(`   Top jobs: ${jobSummary.length}`);
}

main();
