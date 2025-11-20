#!/usr/bin/env node
/**
 * Генератор сводного отчёта телеметрии
 * Агрегирует метрики из .telemetry/ и создаёт сводный отчёт
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TELEMETRY_DIR = '.telemetry';
const METRICS_FILE = join(TELEMETRY_DIR, 'metrics.json');
const STEP_TIMINGS_FILE = join(TELEMETRY_DIR, 'step-timings.json');
const REPORT_DIR = 'tests/composer/results';
const REPORT_FILE = join(REPORT_DIR, 'telemetry-report.md');

/**
 * Загружает метрики
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
 * Форматирует время в читаемый вид
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Генерирует сводный отчёт
 */
function generateReport() {
  const metrics = loadMetrics();
  const timings = loadStepTimings();
  
  // Создаём директорию если её нет
  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true });
  }
  
  const totalDuration = metrics.steps.reduce((sum, s) => sum + (s.duration || 0), 0);
  const avgDuration = metrics.steps.length > 0 ? totalDuration / metrics.steps.length : 0;
  
  // Находим самый медленный шаг
  const slowestStep = metrics.steps.reduce((max, s) => 
    (s.duration || 0) > (max.duration || 0) ? s : max, 
    { name: 'none', duration: 0 }
  );
  
  // Группируем фейлы по причинам
  const failuresByReason = {};
  for (const failure of metrics.failures) {
    const reason = failure.reason || 'unknown';
    failuresByReason[reason] = (failuresByReason[reason] || 0) + 1;
  }
  
  const report = `# Telemetry Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Steps**: ${metrics.steps.length}
- **Total Duration**: ${formatDuration(totalDuration)}
- **Average Step Duration**: ${formatDuration(avgDuration)}
- **Failures**: ${metrics.failures.length}
${metrics.diff ? `- **Diff**: +${metrics.diff.additions} -${metrics.diff.deletions} (${metrics.diff.filesChanged} files)` : '- **Diff**: Not collected'}

## Step Timings

${metrics.steps.length > 0 ? metrics.steps.map(s => 
  `- **${s.name}**: ${formatDuration(s.duration || 0)}`
).join('\n') : 'No steps recorded'}

${slowestStep.duration > 0 ? `\n**Slowest Step**: ${slowestStep.name} (${formatDuration(slowestStep.duration)})` : ''}

## Failures

${metrics.failures.length > 0 ? 
  Object.entries(failuresByReason).map(([reason, count]) => 
    `- **${reason}**: ${count} occurrence(s)`
  ).join('\n') + '\n\n### Failure Details\n\n' + 
  metrics.failures.map((f, i) => 
    `${i + 1}. **${f.step}**: ${f.reason} (${f.timestamp})`
  ).join('\n')
  : 'No failures recorded ✅'}

## Diff Metrics

${metrics.diff ? `
- **Additions**: ${metrics.diff.additions}
- **Deletions**: ${metrics.diff.deletions}
- **Files Changed**: ${metrics.diff.filesChanged}
- **Base Ref**: ${metrics.diff.baseRef}
` : 'Diff metrics not collected'}

## Recommendations

${slowestStep.duration > 5000 ? `- ⚠️ Consider optimizing **${slowestStep.name}** (${formatDuration(slowestStep.duration)})` : ''}
${metrics.failures.length > 0 ? `- ⚠️ Address ${metrics.failures.length} failure(s) to improve CI reliability` : '- ✅ No failures detected'}
${metrics.diff && metrics.diff.additions > 500 ? `- ⚠️ Large diff detected (+${metrics.diff.additions} lines). Consider splitting into smaller PRs.` : ''}
`;

  writeFileSync(REPORT_FILE, report, 'utf8');
  console.log(`✅ Telemetry report generated: ${REPORT_FILE}`);
  
  return report;
}

generateReport();

