#!/usr/bin/env node
/**
 * CI Metrics Collector: сбор метрик из GitHub Actions workflows
 * 
 * Собирает метрики:
 * - Время выполнения jobs и workflows
 * - Статусы jobs (success/failure/cancelled/skipped)
 * - Количество шагов в каждом job
 * - Размер артефактов (если доступно)
 * - Время выполнения каждого шага (если доступно)
 * 
 * Использование:
 *   node scripts/collect-ci-metrics.mjs [--workflow=<name>] [--run-id=<id>] [--pr=<number>] [--output=<path>]
 * 
 * Переменные окружения:
 *   GITHUB_TOKEN - токен для доступа к GitHub API
 *   GITHUB_REPO - репозиторий (по умолчанию: utemix-lab/vovaipetrova-core)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const CI_METRICS_DIR = '.ci-metrics';
const CI_METRICS_FILE = join(CI_METRICS_DIR, 'ci-metrics.json');

// Создаём директорию если её нет
if (!existsSync(CI_METRICS_DIR)) {
  mkdirSync(CI_METRICS_DIR, { recursive: true });
}

/**
 * Загружает существующие метрики или создаёт новые
 */
function loadMetrics() {
  if (existsSync(CI_METRICS_FILE)) {
    try {
      return JSON.parse(readFileSync(CI_METRICS_FILE, 'utf8'));
    } catch (e) {
      return { runs: [], summary: null };
    }
  }
  return { runs: [], summary: null };
}

/**
 * Сохраняет метрики
 */
function saveMetrics(metrics) {
  writeFileSync(CI_METRICS_FILE, JSON.stringify(metrics, null, 2), 'utf8');
}

/**
 * Получает информацию о workflow run через GitHub API (использует gh CLI)
 */
function getWorkflowRun(runId) {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN не установлен');
    return null;
  }

  try {
    const output = execSync(
      `gh api repos/${GITHUB_REPO}/actions/runs/${runId}`,
      { 
        encoding: 'utf8', 
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    return JSON.parse(output);
  } catch (error) {
    console.error(`❌ Ошибка получения workflow run ${runId}:`, error.message);
    return null;
  }
}

/**
 * Получает информацию о jobs для workflow run (использует gh CLI)
 */
function getWorkflowJobs(runId) {
  if (!GITHUB_TOKEN) {
    return [];
  }

  try {
    const output = execSync(
      `gh api repos/${GITHUB_REPO}/actions/runs/${runId}/jobs`,
      { 
        encoding: 'utf8', 
        env: { ...process.env, GH_TOKEN: GITHUB_TOKEN },
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    const data = JSON.parse(output);
    return data.jobs || [];
  } catch (error) {
    console.error(`❌ Ошибка получения jobs для run ${runId}:`, error.message);
    return [];
  }
}

/**
 * Вычисляет длительность в миллисекундах
 */
function calculateDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  return end.getTime() - start.getTime();
}

/**
 * Форматирует время в читаемый вид
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Собирает метрики для workflow run
 */
function collectRunMetrics(runId, workflowName = null, prNumber = null) {
  console.log(`📊 Сбор метрик для workflow run ${runId}...`);

  const run = getWorkflowRun(runId);
  if (!run) {
    console.error(`❌ Не удалось получить информацию о run ${runId}`);
    return null;
  }

  const jobs = getWorkflowJobs(runId);
  
  const workflowDuration = calculateDuration(run.created_at, run.updated_at);
  const jobsMetrics = jobs.map(job => {
    const jobDuration = calculateDuration(job.started_at, job.completed_at);
    const stepsMetrics = (job.steps || []).map(step => {
      const stepDuration = calculateDuration(step.started_at, step.completed_at);
      return {
        name: step.name,
        status: step.conclusion || step.status,
        duration: stepDuration,
        number: step.number
      };
    });

    return {
      name: job.name,
      status: job.conclusion || job.status,
      duration: jobDuration,
      stepsCount: job.steps?.length || 0,
      steps: stepsMetrics,
      runnerName: job.runner_name,
      runnerLabels: job.labels || []
    };
  });

  const metrics = {
    runId: runId,
    workflowId: run.workflow_id,
    workflowName: workflowName || run.name || 'unknown',
    workflowPath: run.path || null,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    duration: workflowDuration,
    prNumber: prNumber || (run.pull_requests?.[0]?.number || null),
    event: run.event,
    headBranch: run.head_branch,
    headSha: run.head_sha,
    jobsCount: jobs.length,
    jobs: jobsMetrics,
    jobsSummary: {
      success: jobsMetrics.filter(j => j.status === 'success').length,
      failure: jobsMetrics.filter(j => j.status === 'failure').length,
      cancelled: jobsMetrics.filter(j => j.status === 'cancelled').length,
      skipped: jobsMetrics.filter(j => j.status === 'skipped').length,
      totalDuration: jobsMetrics.reduce((sum, j) => sum + (j.duration || 0), 0)
    },
    collectedAt: new Date().toISOString()
  };

  return metrics;
}

/**
 * Генерирует сводку метрик
 */
function generateSummary(metrics) {
  if (!metrics.runs || metrics.runs.length === 0) {
    return null;
  }

  const runs = metrics.runs;
  const totalRuns = runs.length;
  const successfulRuns = runs.filter(r => r.conclusion === 'success').length;
  const failedRuns = runs.filter(r => r.conclusion === 'failure').length;
  const cancelledRuns = runs.filter(r => r.conclusion === 'cancelled').length;

  const totalJobs = runs.reduce((sum, r) => sum + (r.jobsCount || 0), 0);
  const totalJobsSuccess = runs.reduce((sum, r) => sum + (r.jobsSummary?.success || 0), 0);
  const totalJobsFailure = runs.reduce((sum, r) => sum + (r.jobsSummary?.failure || 0), 0);

  const avgWorkflowDuration = runs
    .filter(r => r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0) / runs.filter(r => r.duration).length;

  const avgJobsPerRun = totalJobs / totalRuns;

  // Находим самый медленный workflow
  const slowestRun = runs.reduce((max, r) => 
    (r.duration || 0) > (max.duration || 0) ? r : max,
    { workflowName: 'none', duration: 0 }
  );

  // Находим самый медленный job
  const allJobs = runs.flatMap(r => r.jobs || []);
  const slowestJob = allJobs.reduce((max, j) => 
    (j.duration || 0) > (max.duration || 0) ? j : max,
    { name: 'none', duration: 0 }
  );

  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    cancelledRuns,
    successRate: totalRuns > 0 ? (successfulRuns / totalRuns * 100).toFixed(1) : 0,
    totalJobs,
    totalJobsSuccess,
    totalJobsFailure,
    avgWorkflowDuration: avgWorkflowDuration || 0,
    avgJobsPerRun: avgJobsPerRun || 0,
    slowestWorkflow: {
      name: slowestRun.workflowName,
      duration: slowestRun.duration
    },
    slowestJob: {
      name: slowestJob.name,
      duration: slowestJob.duration
    },
    generatedAt: new Date().toISOString()
  };
}

/**
 * Главная функция
 */
function main() {
  const args = process.argv.slice(2);
  const runIdArg = args.find(arg => arg.startsWith('--run-id='));
  const workflowArg = args.find(arg => arg.startsWith('--workflow='));
  const prArg = args.find(arg => arg.startsWith('--pr='));
  const outputArg = args.find(arg => arg.startsWith('--output='));

  const runId = runIdArg ? runIdArg.split('=', 2)[1] : null;
  const workflowName = workflowArg ? workflowArg.split('=', 2)[1] : null;
  const prNumber = prArg ? parseInt(prArg.split('=', 2)[1]) : null;
  const outputPath = outputArg ? outputArg.split('=', 2)[1] : CI_METRICS_FILE;

  if (!runId && !process.env.GITHUB_RUN_ID) {
    console.error('❌ Не указан run-id. Используйте --run-id=<id> или установите GITHUB_RUN_ID');
    process.exit(1);
  }

  const targetRunId = runId || process.env.GITHUB_RUN_ID;
  const metrics = loadMetrics();

  // Собираем метрики для указанного run
  const runMetrics = collectRunMetrics(targetRunId, workflowName, prNumber);
  if (!runMetrics) {
    process.exit(1);
  }

  // Добавляем в список runs (если еще нет)
  const existingIndex = metrics.runs.findIndex(r => r.runId === targetRunId);
  if (existingIndex >= 0) {
    metrics.runs[existingIndex] = runMetrics;
    console.log(`📝 Обновлены метрики для run ${targetRunId}`);
  } else {
    metrics.runs.push(runMetrics);
    console.log(`✅ Добавлены метрики для run ${targetRunId}`);
  }

  // Генерируем сводку
  metrics.summary = generateSummary(metrics);
  if (metrics.summary) {
    console.log('\n📊 Сводка метрик:');
    console.log(`   Всего runs: ${metrics.summary.totalRuns}`);
    console.log(`   Успешных: ${metrics.summary.successfulRuns} (${metrics.summary.successRate}%)`);
    console.log(`   Провалившихся: ${metrics.summary.failedRuns}`);
    console.log(`   Всего jobs: ${metrics.summary.totalJobs}`);
    console.log(`   Средняя длительность workflow: ${formatDuration(metrics.summary.avgWorkflowDuration)}`);
    console.log(`   Самый медленный workflow: ${metrics.summary.slowestWorkflow.name} (${formatDuration(metrics.summary.slowestWorkflow.duration)})`);
    console.log(`   Самый медленный job: ${metrics.summary.slowestJob.name} (${formatDuration(metrics.summary.slowestJob.duration)})`);
  }

  // Сохраняем метрики
  saveMetrics(metrics);
  console.log(`\n✅ Метрики сохранены в ${outputPath}`);

  // Выводим детали текущего run
  console.log(`\n📋 Детали текущего run:`);
  console.log(`   Workflow: ${runMetrics.workflowName}`);
  console.log(`   Статус: ${runMetrics.status} (${runMetrics.conclusion || 'in_progress'})`);
  console.log(`   Длительность: ${formatDuration(runMetrics.duration)}`);
  console.log(`   Jobs: ${runMetrics.jobsCount}`);
  console.log(`   Успешных jobs: ${runMetrics.jobsSummary.success}`);
  console.log(`   Провалившихся jobs: ${runMetrics.jobsSummary.failure}`);
}

main();

