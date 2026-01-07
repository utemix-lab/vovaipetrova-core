#!/usr/bin/env node
/**
 * Генератор отчёта о flaky tests в читаемом формате Markdown
 * 
 * Использование:
 *   node scripts/generate-flaky-report.mjs [--output=<path>]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const FLAKY_REPORTS_DIR = '.flaky-reports';
const FLAKY_REPORT_JSON = join(FLAKY_REPORTS_DIR, 'flaky-tests-report.json');
const FLAKY_REPORT_MD = join(FLAKY_REPORTS_DIR, 'flaky-tests-report.md');

const args = process.argv.slice(2);
const outputArg = args.find(arg => arg.startsWith('--output='));
const outputPath = outputArg ? outputArg.split('=', 2)[1] : FLAKY_REPORT_MD;

/**
 * Форматирует длительность
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
function formatDate(isoString) {
  return new Date(isoString).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Генерирует Markdown отчёт
 */
function generateReport() {
  if (!existsSync(FLAKY_REPORT_JSON)) {
    console.error(`❌ Flaky report JSON not found: ${FLAKY_REPORT_JSON}`);
    console.error('   Run "npm run flaky:detect" first to generate the report');
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(FLAKY_REPORT_JSON, 'utf8'));

  let md = `# Flaky Tests Report\n\n`;
  md += `**Generated:** ${formatDate(report.generatedAt)}\n`;
  md += `**Period:** Last ${report.period.days} days\n`;
  md += `**Workflow:** ${report.period.workflow}\n\n`;

  if (report.flakyJobs.length === 0) {
    md += `## ✅ No Flaky Tests Detected\n\n`;
    md += `Great! No flaky tests were found in the analyzed period.\n`;
    writeFileSync(outputPath, md, 'utf8');
    console.log(`✅ Report generated: ${outputPath}`);
    return;
  }

  md += `## Summary\n\n`;
  md += `- **Total flaky jobs:** ${report.summary.total}\n`;
  md += `- **By workflow:**\n`;
  for (const [workflow, count] of Object.entries(report.summary.byWorkflow)) {
    md += `  - \`${workflow}\`: ${count} job(s)\n`;
  }
  md += `\n`;

  // Группируем по workflow
  const byWorkflow = {};
  for (const job of report.flakyJobs) {
    if (!byWorkflow[job.workflow]) {
      byWorkflow[job.workflow] = [];
    }
    byWorkflow[job.workflow].push(job);
  }

  md += `## Flaky Jobs by Workflow\n\n`;

  for (const [workflow, jobs] of Object.entries(byWorkflow)) {
    md += `### ${workflow}\n\n`;
    
    // Сортируем по failure rate
    const sortedJobs = [...jobs].sort((a, b) => b.failureRate - a.failureRate);
    
    for (const job of sortedJobs) {
      md += `#### ${job.job}\n\n`;
      md += `- **Commit:** \`${job.commit.substring(0, 7)}\`\n`;
      md += `- **Total runs:** ${job.totalRuns}\n`;
      md += `- **Success rate:** ${job.successRate}% (${job.successCount}/${job.totalRuns})\n`;
      md += `- **Failure rate:** ${job.failureRate}% (${job.failureCount}/${job.totalRuns})\n`;
      if (job.avgDurationMs) {
        md += `- **Avg duration:** ${formatDuration(job.avgDurationMs)}\n`;
      }
      md += `- **First seen:** ${formatDate(job.firstSeen)}\n`;
      md += `- **Last seen:** ${formatDate(job.lastSeen)}\n`;
      md += `- **Run numbers:** ${job.runNumbers.join(', ')}\n`;
      md += `\n`;
    }
  }

  // Топ-10 самых проблемных
  md += `## Top 10 Most Flaky Jobs\n\n`;
  const topFlaky = [...report.flakyJobs]
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 10);

  md += `| Workflow | Job | Failure Rate | Total Runs | Runs |\n`;
  md += `|----------|-----|--------------|------------|------|\n`;
  for (const job of topFlaky) {
    md += `| \`${job.workflow}\` | \`${job.job}\` | ${job.failureRate}% | ${job.totalRuns} | ${job.runNumbers.join(', ')} |\n`;
  }
  md += `\n`;

  md += `---\n\n`;
  md += `*Report generated automatically by flaky tests detector*\n`;

  writeFileSync(outputPath, md, 'utf8');
  console.log(`✅ Report generated: ${outputPath}`);
}

generateReport();

