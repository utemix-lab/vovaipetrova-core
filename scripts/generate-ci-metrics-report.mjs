#!/usr/bin/env node
/**
 * Генератор отчёта по метрикам CI
 * Создаёт сводный отчёт на основе собранных метрик CI
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CI_METRICS_DIR = '.ci-metrics';
const CI_METRICS_FILE = join(CI_METRICS_DIR, 'ci-metrics.json');
const REPORT_DIR = 'tests/composer/results';
const REPORT_FILE = join(REPORT_DIR, 'ci-metrics-report.md');

/**
 * Загружает метрики CI
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
 * Форматирует время в читаемый вид
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Форматирует дату
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Генерирует отчёт
 */
function generateReport() {
  const metrics = loadMetrics();
  
  if (!metrics.runs || metrics.runs.length === 0) {
    console.log('⚠️ Нет данных для генерации отчёта');
    return;
  }

  // Создаём директорию если её нет
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }

  const summary = metrics.summary || {};
  const runs = metrics.runs || [];

  // Группируем по workflow
  const workflows = {};
  for (const run of runs) {
    const workflowName = run.workflowName || 'unknown';
    if (!workflows[workflowName]) {
      workflows[workflowName] = {
        name: workflowName,
        runs: [],
        totalDuration: 0,
        successCount: 0,
        failureCount: 0
      };
    }
    workflows[workflowName].runs.push(run);
    if (run.duration) workflows[workflowName].totalDuration += run.duration;
    if (run.conclusion === 'success') workflows[workflowName].successCount++;
    if (run.conclusion === 'failure') workflows[workflowName].failureCount++;
  }

  // Группируем jobs по имени
  const jobsStats = {};
  for (const run of runs) {
    for (const job of run.jobs || []) {
      const jobName = job.name || 'unknown';
      if (!jobsStats[jobName]) {
        jobsStats[jobName] = {
          name: jobName,
          runs: 0,
          success: 0,
          failure: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      jobsStats[jobName].runs++;
      if (job.status === 'success') jobsStats[jobName].success++;
      if (job.status === 'failure') jobsStats[jobName].failure++;
      if (job.duration) jobsStats[jobName].totalDuration += job.duration;
    }
  }

  // Вычисляем средние значения для jobs
  for (const jobName in jobsStats) {
    const job = jobsStats[jobName];
    job.avgDuration = job.runs > 0 ? job.totalDuration / job.runs : 0;
  }

  // Сортируем jobs по средней длительности
  const sortedJobs = Object.values(jobsStats).sort((a, b) => b.avgDuration - a.avgDuration);

  const report = `# CI Metrics Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Runs**: ${summary.totalRuns || 0}
- **Successful Runs**: ${summary.successfulRuns || 0} (${summary.successRate || 0}%)
- **Failed Runs**: ${summary.failedRuns || 0}
- **Cancelled Runs**: ${summary.cancelledRuns || 0}
- **Total Jobs**: ${summary.totalJobs || 0}
- **Successful Jobs**: ${summary.totalJobsSuccess || 0}
- **Failed Jobs**: ${summary.totalJobsFailure || 0}
- **Average Workflow Duration**: ${formatDuration(summary.avgWorkflowDuration)}
- **Average Jobs per Run**: ${(summary.avgJobsPerRun || 0).toFixed(1)}

## Slowest Workflows

${summary.slowestWorkflow && summary.slowestWorkflow.duration > 0 ? 
  `- **${summary.slowestWorkflow.name}**: ${formatDuration(summary.slowestWorkflow.duration)}` : 
  'No data available'}

## Slowest Jobs

${summary.slowestJob && summary.slowestJob.duration > 0 ? 
  `- **${summary.slowestJob.name}**: ${formatDuration(summary.slowestJob.duration)}` : 
  'No data available'}

## Workflows Breakdown

${Object.values(workflows).map(wf => {
  const avgDuration = wf.runs.length > 0 ? wf.totalDuration / wf.runs.length : 0;
  const successRate = wf.runs.length > 0 ? (wf.successCount / wf.runs.length * 100).toFixed(1) : 0;
  return `### ${wf.name}

- **Runs**: ${wf.runs.length}
- **Success Rate**: ${successRate}%
- **Average Duration**: ${formatDuration(avgDuration)}
- **Total Duration**: ${formatDuration(wf.totalDuration)}
`;
}).join('\n')}

## Jobs Performance

${sortedJobs.length > 0 ? sortedJobs.slice(0, 20).map(job => {
  const successRate = job.runs > 0 ? (job.success / job.runs * 100).toFixed(1) : 0;
  return `- **${job.name}**: ${formatDuration(job.avgDuration)} avg (${job.success}/${job.runs} success, ${successRate}%)`;
}).join('\n') : 'No job data available'}

## Recent Runs

${runs.slice(-10).reverse().map(run => {
  const jobsSummary = run.jobsSummary || {};
  return `### ${run.workflowName} (${run.runId})

- **Status**: ${run.status} (${run.conclusion || 'in_progress'})
- **Duration**: ${formatDuration(run.duration)}
- **Jobs**: ${run.jobsCount} (${jobsSummary.success} success, ${jobsSummary.failure} failure)
- **Created**: ${formatDate(run.createdAt)}
${run.prNumber ? `- **PR**: #${run.prNumber}` : ''}
`;
}).join('\n')}

## Recommendations

${summary.failedRuns > 0 ? `- ⚠️ Address ${summary.failedRuns} failed run(s) to improve CI reliability` : '- ✅ No failed runs detected'}
${summary.slowestWorkflow && summary.slowestWorkflow.duration > 300000 ? `- ⚠️ Consider optimizing **${summary.slowestWorkflow.name}** (${formatDuration(summary.slowestWorkflow.duration)})` : ''}
${summary.slowestJob && summary.slowestJob.duration > 300000 ? `- ⚠️ Consider optimizing **${summary.slowestJob.name}** (${formatDuration(summary.slowestJob.duration)})` : ''}
${summary.successRate && parseFloat(summary.successRate) < 80 ? `- ⚠️ Success rate is ${summary.successRate}%. Consider investigating failures.` : ''}
`;

  writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`✅ CI metrics report generated: ${REPORT_FILE}`);
  
  return report;
}

generateReport();

