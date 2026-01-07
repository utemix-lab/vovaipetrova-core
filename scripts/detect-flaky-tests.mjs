#!/usr/bin/env node
/**
 * Flaky Tests Detector: обнаружение нестабильных тестов в CI
 * 
 * Анализирует историю выполнения CI jobs и определяет flaky tests по паттернам:
 * - Job падает и проходит на одном и том же коммите
 * - Job имеет высокий процент неудачных запусков без изменений в коде
 * - Job падает периодически без видимых причин
 * 
 * Использование:
 *   node scripts/detect-flaky-tests.mjs [--workflow=<name>] [--days=<N>] [--threshold=<percent>]
 * 
 * Переменные окружения:
 *   GITHUB_TOKEN - токен для доступа к GitHub API
 *   GITHUB_REPO - репозиторий (по умолчанию: utemix-lab/vovaipetrova-core)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const FLAKY_REPORTS_DIR = '.flaky-reports';
const CI_METRICS_FILE = join('.ci-metrics', 'ci-metrics.json');
const FLAKY_REPORT_FILE = join(FLAKY_REPORTS_DIR, 'flaky-tests-report.json');

// Параметры командной строки
const args = process.argv.slice(2);
const workflowFilter = args.find(arg => arg.startsWith('--workflow='))?.split('=')[1];
const daysFilter = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '7');
const failureThreshold = parseFloat(args.find(arg => arg.startsWith('--threshold='))?.split('=')[1] || '30'); // Процент неудачных запусков

if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN is not set.');
  console.error('   Set it via environment variable or use gh auth token');
  process.exit(1);
}

// Создаём директорию для отчётов
if (!existsSync(FLAKY_REPORTS_DIR)) {
  mkdirSync(FLAKY_REPORTS_DIR, { recursive: true });
}

/**
 * Загружает метрики CI
 */
function loadCiMetrics() {
  if (!existsSync(CI_METRICS_FILE)) {
    console.warn(`⚠️  CI metrics file not found: ${CI_METRICS_FILE}`);
    console.warn('   Run "npm run ci:metrics:collect" first to collect CI metrics');
    return [];
  }
  
  try {
    const data = JSON.parse(readFileSync(CI_METRICS_FILE, 'utf8'));
    return Array.isArray(data) ? data : (data.runs || []);
  } catch (e) {
    console.error(`❌ Error reading CI metrics: ${e.message}`);
    return [];
  }
}

/**
 * Группирует runs по коммиту и job name
 */
function groupRunsByCommitAndJob(runs) {
  const groups = {};
  
  for (const run of runs) {
    // Фильтруем по workflow если указан
    if (workflowFilter && run.workflow_name !== workflowFilter) {
      continue;
    }
    
    // Фильтруем по дате
    const runDate = new Date(run.created_at);
    const daysAgo = (Date.now() - runDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo > daysFilter) {
      continue;
    }
    
    // Получаем коммит (head_sha или run_number как идентификатор)
    const commitSha = run.head_sha || run.head_commit?.id || `run-${run.run_number}`;
    
    for (const job of run.jobs || []) {
      const key = `${commitSha}:${job.name}`;
      
      if (!groups[key]) {
        groups[key] = {
          commit: commitSha,
          jobName: job.name,
          workflowName: run.workflow_name,
          runs: []
        };
      }
      
      groups[key].runs.push({
        runId: run.id,
        runNumber: run.run_number,
        createdAt: run.created_at,
        conclusion: job.conclusion || run.conclusion,
        status: job.status || run.status,
        duration: job.duration_ms || run.duration_ms
      });
    }
  }
  
  return Object.values(groups);
}

/**
 * Определяет, является ли группа flaky
 */
function isFlaky(group) {
  if (group.runs.length < 2) {
    return false; // Нужно минимум 2 запуска для определения flaky
  }
  
  const conclusions = group.runs.map(r => r.conclusion);
  const hasSuccess = conclusions.includes('success');
  const hasFailure = conclusions.includes('failure') || conclusions.includes('cancelled');
  
  // Flaky: есть и успешные, и неудачные запуски на одном коммите
  if (hasSuccess && hasFailure) {
    return true;
  }
  
  // Высокий процент неудач без изменений в коде
  const failureRate = conclusions.filter(c => c === 'failure' || c === 'cancelled').length / conclusions.length * 100;
  if (failureRate >= failureThreshold && group.runs.length >= 3) {
    return true;
  }
  
  return false;
}

/**
 * Вычисляет метрики для flaky группы
 */
function calculateFlakyMetrics(group) {
  const conclusions = group.runs.map(r => r.conclusion);
  const successCount = conclusions.filter(c => c === 'success').length;
  const failureCount = conclusions.filter(c => c === 'failure' || c === 'cancelled').length;
  const totalRuns = group.runs.length;
  
  const successRate = (successCount / totalRuns) * 100;
  const failureRate = (failureCount / totalRuns) * 100;
  
  const durations = group.runs
    .filter(r => r.duration)
    .map(r => r.duration);
  const avgDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : null;
  
  return {
    totalRuns,
    successCount,
    failureCount,
    successRate: Math.round(successRate * 10) / 10,
    failureRate: Math.round(failureRate * 10) / 10,
    avgDurationMs: avgDuration ? Math.round(avgDuration) : null,
    firstSeen: group.runs[0].createdAt,
    lastSeen: group.runs[group.runs.length - 1].createdAt,
    runIds: group.runs.map(r => r.runId),
    runNumbers: group.runs.map(r => r.runNumber)
  };
}

/**
 * Основная функция детекции
 */
function detectFlakyTests() {
  console.log('🔍 Detecting flaky tests...');
  console.log(`   Workflow filter: ${workflowFilter || 'all'}`);
  console.log(`   Days filter: ${daysFilter}`);
  console.log(`   Failure threshold: ${failureThreshold}%`);
  console.log('');
  
  const runs = loadCiMetrics();
  
  if (runs.length === 0) {
    console.error('❌ No CI metrics found. Run "npm run ci:metrics:collect" first.');
    process.exit(1);
  }
  
  console.log(`📊 Analyzing ${runs.length} workflow runs...`);
  
  const groups = groupRunsByCommitAndJob(runs);
  console.log(`   Grouped into ${groups.length} commit+job combinations`);
  
  const flakyGroups = groups.filter(isFlaky);
  console.log(`   Found ${flakyGroups.length} potentially flaky jobs`);
  console.log('');
  
  if (flakyGroups.length === 0) {
    console.log('✅ No flaky tests detected!');
    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        days: daysFilter,
        workflow: workflowFilter || 'all'
      },
      flakyJobs: [],
      summary: {
        total: 0,
        byWorkflow: {}
      }
    };
    writeFileSync(FLAKY_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📄 Report saved to: ${FLAKY_REPORT_FILE}`);
    return;
  }
  
  // Вычисляем метрики для каждого flaky job
  const flakyJobs = flakyGroups.map(group => ({
    workflow: group.workflowName,
    job: group.jobName,
    commit: group.commit,
    ...calculateFlakyMetrics(group)
  }));
  
  // Группируем по workflow для summary
  const byWorkflow = {};
  for (const job of flakyJobs) {
    if (!byWorkflow[job.workflow]) {
      byWorkflow[job.workflow] = [];
    }
    byWorkflow[job.workflow].push(job);
  }
  
  const report = {
    generatedAt: new Date().toISOString(),
    period: {
      days: daysFilter,
      workflow: workflowFilter || 'all'
    },
    flakyJobs,
    summary: {
      total: flakyJobs.length,
      byWorkflow: Object.fromEntries(
        Object.entries(byWorkflow).map(([wf, jobs]) => [wf, jobs.length])
      )
    }
  };
  
  // Сохраняем отчёт
  writeFileSync(FLAKY_REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  
  // Выводим summary
  console.log('📋 Flaky Tests Report');
  console.log('═'.repeat(60));
  console.log(`Total flaky jobs: ${flakyJobs.length}`);
  console.log('');
  
  for (const [workflow, count] of Object.entries(report.summary.byWorkflow)) {
    console.log(`  ${workflow}: ${count} job(s)`);
  }
  console.log('');
  
  // Топ-5 самых проблемных
  const topFlaky = flakyJobs
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 5);
  
  console.log('🔴 Top 5 most flaky jobs:');
  for (const job of topFlaky) {
    console.log(`   ${job.workflow} / ${job.job}`);
    console.log(`      Failure rate: ${job.failureRate}% (${job.failureCount}/${job.totalRuns})`);
    console.log(`      Runs: ${job.runNumbers.join(', ')}`);
    console.log('');
  }
  
  console.log(`📄 Full report saved to: ${FLAKY_REPORT_FILE}`);
}

detectFlakyTests();

