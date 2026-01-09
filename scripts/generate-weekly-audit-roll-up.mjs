#!/usr/bin/env node
/**
 * Weekly Audit Roll-up — генерация сводного еженедельного отчёта
 * 
 * Собирает данные из всех проверок и формирует сводный отчёт:
 * - Link-map report (broken links)
 * - KB-linter report (lint quality)
 * - Stories-index report
 * - Diagnostics snapshot
 * - Stats (pages, statuses, issues)
 * - CI metrics (если доступны)
 * - Flaky tests report (если доступен)
 * 
 * Использование:
 *   node scripts/generate-weekly-audit-roll-up.mjs [--publish] [--output=path]
 * 
 * Переменные окружения:
 *   NOTION_API_KEY - API ключ Notion (для публикации)
 *   GITHUB_RUN_ID - ID workflow run (для ссылок)
 *   GITHUB_REPOSITORY - репозиторий (для ссылок)
 *   GITHUB_SERVER_URL - сервер GitHub (для ссылок)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const REPORTS_DIR = 'reports';
const PROTOTYPE_DIR = 'prototype';
const ROLL_UP_FILE = join(REPORTS_DIR, 'weekly-audit-roll-up.json');
const ROLL_UP_MD_FILE = join(REPORTS_DIR, 'weekly-audit-roll-up.md');
const ROLL_UP_HTML_FILE = join(PROTOTYPE_DIR, 'weekly-audit-roll-up.html');

const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'utemix-lab/vovaipetrova-core';
const GITHUB_SERVER_URL = process.env.GITHUB_SERVER_URL || 'https://github.com';
const WORKFLOW_URL = GITHUB_RUN_ID 
  ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
  : null;

// Создаём директории если их нет
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}
if (!existsSync(PROTOTYPE_DIR)) {
  mkdirSync(PROTOTYPE_DIR, { recursive: true });
}

/**
 * Загружает JSON файл
 */
function loadJSON(filePath, defaultValue = null) {
  if (!existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`⚠️  Failed to load ${filePath}: ${e.message}`);
    return defaultValue;
  }
}

/**
 * Загружает текстовый файл
 */
function loadText(filePath, defaultValue = '') {
  if (!existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch (e) {
    console.warn(`⚠️  Failed to load ${filePath}: ${e.message}`);
    return defaultValue;
  }
}

/**
 * Выполняет команду и возвращает вывод
 */
function runCommand(command, defaultValue = null) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    console.warn(`⚠️  Command failed: ${command}: ${e.message}`);
    return defaultValue;
  }
}

/**
 * Форматирует дату
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Форматирует время в секундах
 */
function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

/**
 * Собирает данные для сводного отчёта
 */
function collectRollUpData() {
  console.log('📊 Collecting weekly audit roll-up data...\n');

  const rollUp = {
    generatedAt: new Date().toISOString(),
    period: {
      start: null, // Можно вычислить из даты последнего аудита
      end: new Date().toISOString()
    },
    reports: {},
    summary: {
      health: 'unknown',
      totalIssues: 0,
      totalWarnings: 0,
      metrics: {}
    },
    recommendations: []
  };

  // 1. Link-map report (broken links)
  const brokenLinks = loadJSON('prototype/data/broken-links.json', { issues: [], brokenCount: 0 });
  rollUp.reports.linkMap = {
    totalBroken: brokenLinks.brokenCount || brokenLinks.issues?.length || 0,
    internalMissing: brokenLinks.issues?.filter(i => i.reason === 'missing' && !i.link.startsWith('http')).length || 0,
    external: brokenLinks.issues?.filter(i => i.link.startsWith('http')).length || 0,
    service: brokenLinks.issues?.filter(i => i.reason === 'service' || i.link.includes('service')).length || 0,
    issues: brokenLinks.issues?.slice(0, 20) || [] // Топ 20
  };
  rollUp.summary.totalIssues += rollUp.reports.linkMap.internalMissing;

  // 2. Stats report
  const stats = loadJSON('prototype/data/stats.json', { totals: {}, topProblems: [] });
  rollUp.reports.stats = {
    totalPages: stats.totals?.pages || 0,
    ready: stats.totals?.statuses?.ready || 0,
    review: stats.totals?.statuses?.review || 0,
    draft: stats.totals?.statuses?.draft || 0,
    readyRate: stats.totals?.pages > 0 
      ? ((stats.totals?.statuses?.ready || 0) / stats.totals.pages * 100).toFixed(1)
      : 0,
    totalIssues: stats.totals?.issues_total || 0,
    topProblems: stats.topProblems?.slice(0, 10) || []
  };

  // 3. KB-linter report (lint quality)
  const lintReport = loadText(join(REPORTS_DIR, 'kb-linter-report.txt'), '');
  const lintMatches = lintReport.match(/(\d+)\s+error/i) || [];
  const lintErrors = lintMatches[1] ? parseInt(lintMatches[1]) : 0;
  const lintWarnings = (lintReport.match(/(\d+)\s+warning/i) || [])[1] 
    ? parseInt((lintReport.match(/(\d+)\s+warning/i) || [])[1]) 
    : 0;
  
  rollUp.reports.lint = {
    errors: lintErrors,
    warnings: lintWarnings,
    hasErrors: lintErrors > 0,
    hasWarnings: lintWarnings > 0
  };
  rollUp.summary.totalIssues += lintErrors;
  rollUp.summary.totalWarnings += lintWarnings;

  // 4. Stories-index report
  const storiesIndex = loadJSON('prototype/data/stories-index.json', { stories: [] });
  rollUp.reports.stories = {
    total: storiesIndex.stories?.length || 0,
    ready: storiesIndex.stories?.filter(s => s.status === 'ready').length || 0,
    review: storiesIndex.stories?.filter(s => s.status === 'review').length || 0,
    draft: storiesIndex.stories?.filter(s => s.status === 'draft').length || 0
  };

  // 7. KB Index report (для Terms секции)
  const kbIndex = loadJSON('prototype/data/kb-index.json', { totalPages: 0, letters: [] });
  rollUp.reports.kbIndex = {
    totalPages: kbIndex.totalPages || 0,
    letters: kbIndex.letters || [],
    termsCount: Object.keys(kbIndex).reduce((sum, key) => {
      if (key !== 'generatedAt' && key !== 'totalPages' && key !== 'letters' && Array.isArray(kbIndex[key])) {
        return sum + kbIndex[key].length;
      }
      return sum;
    }, 0)
  };

  // 5. CI Metrics (если доступны)
  const ciMetrics = loadJSON('.ci-metrics/ci-metrics.json', { runs: [], summary: null });
  if (ciMetrics.summary) {
    rollUp.reports.ciMetrics = {
      totalRuns: ciMetrics.summary.totalRuns || 0,
      successfulRuns: ciMetrics.summary.successfulRuns || 0,
      failedRuns: ciMetrics.summary.failedRuns || 0,
      successRate: ciMetrics.summary.successRate || 0,
      avgWorkflowDuration: ciMetrics.summary.avgWorkflowDuration || 0
    };
  }

  // 6. Flaky Tests Report (если доступен)
  const flakyReport = loadJSON('.flaky-reports/flaky-tests-report.json', { flakyJobs: [], summary: {} });
  if (flakyReport.flakyJobs && flakyReport.flakyJobs.length > 0) {
    rollUp.reports.flakyTests = {
      totalFlaky: flakyReport.summary?.total || 0,
      topFlaky: flakyReport.flakyJobs
        .sort((a, b) => b.failureRate - a.failureRate)
        .slice(0, 5)
        .map(job => ({
          workflow: job.workflow,
          job: job.job,
          failureRate: job.failureRate,
          totalRuns: job.totalRuns
        }))
    };
  }

  // Вычисляем общее здоровье системы
  const hasCriticalIssues = rollUp.reports.linkMap.internalMissing > 0 || rollUp.reports.lint.errors > 0;
  const hasWarnings = rollUp.summary.totalWarnings > 0 || rollUp.reports.linkMap.totalBroken > rollUp.reports.linkMap.internalMissing;
  const hasFlakyTests = rollUp.reports.flakyTests && rollUp.reports.flakyTests.totalFlaky > 0;

  if (hasCriticalIssues) {
    rollUp.summary.health = 'critical';
  } else if (hasWarnings || hasFlakyTests) {
    rollUp.summary.health = 'warning';
  } else {
    rollUp.summary.health = 'healthy';
  }

  // Формируем метрики
  rollUp.summary.metrics = {
    pages: rollUp.reports.stats.totalPages,
    readyRate: rollUp.reports.stats.readyRate,
    brokenLinks: rollUp.reports.linkMap.internalMissing,
    lintErrors: rollUp.reports.lint.errors,
    flakyJobs: rollUp.reports.flakyTests?.totalFlaky || 0,
    ciSuccessRate: rollUp.reports.ciMetrics?.successRate || null
  };

  // Формируем рекомендации
  if (rollUp.reports.linkMap.internalMissing > 0) {
    rollUp.recommendations.push({
      priority: 'high',
      category: 'links',
      message: `Исправить ${rollUp.reports.linkMap.internalMissing} битых внутренних ссылок`
    });
  }

  if (rollUp.reports.lint.errors > 0) {
    rollUp.recommendations.push({
      priority: 'high',
      category: 'quality',
      message: `Исправить ${rollUp.reports.lint.errors} ошибок линтера`
    });
  }

  if (parseFloat(rollUp.reports.stats.readyRate) < 40) {
    rollUp.recommendations.push({
      priority: 'medium',
      category: 'content',
      message: `Низкий процент готового контента (${rollUp.reports.stats.readyRate}%). Увеличить количество страниц в статусе ready`
    });
  }

  if (rollUp.reports.flakyTests && rollUp.reports.flakyTests.totalFlaky > 0) {
    rollUp.recommendations.push({
      priority: 'medium',
      category: 'ci',
      message: `Обнаружено ${rollUp.reports.flakyTests.totalFlaky} flaky тестов. Необходимо исследовать и исправить`
    });
  }

  if (rollUp.reports.ciMetrics && parseFloat(rollUp.reports.ciMetrics.successRate) < 90) {
    rollUp.recommendations.push({
      priority: 'medium',
      category: 'ci',
      message: `Низкий success rate CI (${rollUp.reports.ciMetrics.successRate}%). Необходимо улучшить стабильность pipeline`
    });
  }

  return rollUp;
}

/**
 * Генерирует HTML отчёт с якорями для разделов
 */
function generateHTMLReport(rollUp) {
  const healthEmoji = {
    healthy: '✅',
    warning: '⚠️',
    critical: '❌'
  }[rollUp.summary.health] || '❓';

  const healthColor = {
    healthy: '#0f9960',
    warning: '#d9822b',
    critical: '#db3737'
  }[rollUp.summary.health] || '#64748b';

  const dateStr = formatDate(rollUp.generatedAt);

  let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Weekly Audit Roll-up — ${dateStr} — Vova &amp; Petrova</title>
  <link rel="stylesheet" href="styles.css" />
  <style>
    .audit-roll-up {
      padding: 2rem clamp(1.5rem, 4vw, 3rem);
      max-width: 1200px;
      margin: 0 auto;
    }
    .audit-roll-up__header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid var(--border);
    }
    .audit-roll-up__title {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text);
    }
    .audit-roll-up__meta {
      color: var(--muted);
      font-size: 0.9rem;
    }
    .health-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      background: ${healthColor}20;
      color: ${healthColor};
      border: 1px solid ${healthColor};
    }
    .nav-anchors {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2rem;
      padding: 1rem;
      background: var(--chip-bg);
      border-radius: 8px;
    }
    .nav-anchors a {
      color: var(--text);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 4px;
      transition: all 0.2s;
    }
    .nav-anchors a:hover {
      background: var(--card-bg);
      border-color: var(--text);
    }
    .section {
      margin-bottom: 3rem;
      padding: 1.5rem;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: var(--shadow);
    }
    .section__title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    .section__content {
      line-height: 1.6;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .metric-card {
      padding: 1rem;
      background: var(--chip-bg);
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .metric-card__label {
      font-size: 0.875rem;
      color: var(--muted);
      margin-bottom: 0.25rem;
    }
    .metric-card__value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
    }
    .recommendations {
      list-style: none;
      padding: 0;
    }
    .recommendations li {
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      background: var(--chip-bg);
      border-left: 3px solid var(--text);
      border-radius: 4px;
    }
    .recommendations li[data-priority="high"] {
      border-left-color: #db3737;
    }
    .recommendations li[data-priority="medium"] {
      border-left-color: #d9822b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    table th,
    table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    table th {
      background: var(--chip-bg);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="audit-roll-up">
    <header class="audit-roll-up__header">
      <h1 class="audit-roll-up__title">Weekly Audit Roll-up Report</h1>
      <div class="audit-roll-up__meta">
        <span>Generated: ${dateStr}</span>
        ${WORKFLOW_URL ? ` | <a href="${WORKFLOW_URL}">View Workflow Run</a>` : ''}
        | <span class="health-badge">${healthEmoji} ${rollUp.summary.health.toUpperCase()}</span>
      </div>
    </header>

    <nav class="nav-anchors">
      <a href="#summary">Summary</a>
      <a href="#ci">CI Metrics</a>
      <a href="#kb">KB Report</a>
      <a href="#backlinks">Backlinks</a>
      <a href="#terms">Terms</a>
      <a href="#recommendations">Recommendations</a>
    </nav>

    <section id="summary" class="section">
      <h2 class="section__title">Summary</h2>
      <div class="section__content">
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Total Issues</div>
            <div class="metric-card__value">${rollUp.summary.totalIssues}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Total Warnings</div>
            <div class="metric-card__value">${rollUp.summary.totalWarnings}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Pages</div>
            <div class="metric-card__value">${rollUp.summary.metrics.pages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Ready Rate</div>
            <div class="metric-card__value">${rollUp.summary.metrics.readyRate}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Broken Links</div>
            <div class="metric-card__value">${rollUp.summary.metrics.brokenLinks}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Lint Errors</div>
            <div class="metric-card__value">${rollUp.summary.metrics.lintErrors}</div>
          </div>
        </div>
      </div>
    </section>

    <section id="ci" class="section">
      <h2 class="section__title">CI Metrics</h2>
      <div class="section__content">
`;

  if (rollUp.reports.ciMetrics) {
    html += `
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Total Runs</div>
            <div class="metric-card__value">${rollUp.reports.ciMetrics.totalRuns}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Success Rate</div>
            <div class="metric-card__value">${rollUp.reports.ciMetrics.successRate}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Failed Runs</div>
            <div class="metric-card__value">${rollUp.reports.ciMetrics.failedRuns}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Avg Duration</div>
            <div class="metric-card__value">${formatDuration(rollUp.reports.ciMetrics.avgWorkflowDuration / 1000)}</div>
          </div>
        </div>`;

    if (rollUp.reports.flakyTests && rollUp.reports.flakyTests.totalFlaky > 0) {
      html += `
        <h3>Flaky Tests</h3>
        <p>Total Flaky: ${rollUp.reports.flakyTests.totalFlaky}</p>
        <table>
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Job</th>
              <th>Failure Rate</th>
              <th>Total Runs</th>
            </tr>
          </thead>
          <tbody>`;
      rollUp.reports.flakyTests.topFlaky.forEach(job => {
        html += `
            <tr>
              <td>${job.workflow}</td>
              <td>${job.job}</td>
              <td>${job.failureRate}%</td>
              <td>${job.totalRuns}</td>
            </tr>`;
      });
      html += `
          </tbody>
        </table>`;
    }
  } else {
    html += `<p>CI metrics not available</p>`;
  }

  html += `
      </div>
    </section>

    <section id="kb" class="section">
      <h2 class="section__title">KB Report</h2>
      <div class="section__content">
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Total Pages</div>
            <div class="metric-card__value">${rollUp.reports.stats.totalPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Ready</div>
            <div class="metric-card__value">${rollUp.reports.stats.ready}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Review</div>
            <div class="metric-card__value">${rollUp.reports.stats.review}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Draft</div>
            <div class="metric-card__value">${rollUp.reports.stats.draft}</div>
          </div>
        </div>
        <h3>Lint Quality</h3>
        <p>Errors: ${rollUp.reports.lint.errors} | Warnings: ${rollUp.reports.lint.warnings}</p>
`;

  if (rollUp.reports.stats.topProblems.length > 0) {
    html += `
        <h3>Top Problems</h3>
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>Score</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>`;
    rollUp.reports.stats.topProblems.slice(0, 10).forEach(problem => {
      html += `
            <tr>
              <td>${problem.title}</td>
              <td>${problem.score}</td>
              <td>${problem.issues_total}</td>
            </tr>`;
    });
    html += `
          </tbody>
        </table>`;
  }

  html += `
      </div>
    </section>

    <section id="backlinks" class="section">
      <h2 class="section__title">Backlinks</h2>
      <div class="section__content">
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">Total Broken</div>
            <div class="metric-card__value">${rollUp.reports.linkMap.totalBroken}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Internal Missing</div>
            <div class="metric-card__value">${rollUp.reports.linkMap.internalMissing}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">External</div>
            <div class="metric-card__value">${rollUp.reports.linkMap.external}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Service</div>
            <div class="metric-card__value">${rollUp.reports.linkMap.service}</div>
          </div>
        </div>`;

  if (rollUp.reports.linkMap.issues.length > 0) {
    html += `
        <h3>Top Issues</h3>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Link</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>`;
    rollUp.reports.linkMap.issues.slice(0, 20).forEach(issue => {
      html += `
            <tr>
              <td><code>${issue.file || 'N/A'}</code></td>
              <td>${issue.link || 'N/A'}</td>
              <td>${issue.reason || 'N/A'}</td>
            </tr>`;
    });
    html += `
          </tbody>
        </table>`;
  }

  html += `
      </div>
    </section>

    <section id="terms" class="section">
      <h2 class="section__title">Terms</h2>
      <div class="section__content">
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-card__label">KB Pages</div>
            <div class="metric-card__value">${rollUp.reports.kbIndex?.totalPages || 0}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Terms Count</div>
            <div class="metric-card__value">${rollUp.reports.kbIndex?.termsCount || 0}</div>
          </div>
          <div class="metric-card">
            <div class="metric-card__label">Letters</div>
            <div class="metric-card__value">${rollUp.reports.kbIndex?.letters?.length || 0}</div>
          </div>
        </div>
        <h3>Stories</h3>
        <p>Total: ${rollUp.reports.stories.total || 0}</p>
        <p>Ready: ${rollUp.reports.stories.ready || 0} | Review: ${rollUp.reports.stories.review || 0} | Draft: ${rollUp.reports.stories.draft || 0}</p>
      </div>
    </section>`;

  if (rollUp.recommendations.length > 0) {
    html += `
    <section id="recommendations" class="section">
      <h2 class="section__title">Recommendations</h2>
      <div class="section__content">
        <ul class="recommendations">`;
    rollUp.recommendations.forEach(rec => {
      html += `
          <li data-priority="${rec.priority}">
            <strong>${rec.category}</strong>: ${rec.message}
          </li>`;
    });
    html += `
        </ul>
      </div>
    </section>`;
  }

  html += `
    <footer style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.875rem;">
      <p>Generated by Weekly Audit Roll-up at ${rollUp.generatedAt}</p>
    </footer>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Генерирует Markdown отчёт
 */
function generateMarkdownReport(rollUp) {
  const healthEmoji = {
    healthy: '✅',
    warning: '⚠️',
    critical: '❌'
  }[rollUp.summary.health] || '❓';

  let md = `# Weekly Audit Roll-up Report\n\n`;
  md += `**Generated:** ${formatDate(rollUp.generatedAt)}\n`;
  if (WORKFLOW_URL) {
    md += `**Workflow:** [View Run](${WORKFLOW_URL})\n`;
  }
  md += `**Health Status:** ${healthEmoji} ${rollUp.summary.health.toUpperCase()}\n\n`;

  md += `## Summary\n\n`;
  md += `- **Total Issues:** ${rollUp.summary.totalIssues}\n`;
  md += `- **Total Warnings:** ${rollUp.summary.totalWarnings}\n`;
  md += `- **Health Status:** ${healthEmoji} ${rollUp.summary.health}\n\n`;

  md += `### Key Metrics\n\n`;
  md += `- **Pages:** ${rollUp.summary.metrics.pages}\n`;
  md += `- **Ready Rate:** ${rollUp.summary.metrics.readyRate}%\n`;
  md += `- **Broken Links:** ${rollUp.summary.metrics.brokenLinks}\n`;
  md += `- **Lint Errors:** ${rollUp.summary.metrics.lintErrors}\n`;
  if (rollUp.summary.metrics.flakyJobs > 0) {
    md += `- **Flaky Jobs:** ${rollUp.summary.metrics.flakyJobs}\n`;
  }
  if (rollUp.summary.metrics.ciSuccessRate !== null) {
    md += `- **CI Success Rate:** ${rollUp.summary.metrics.ciSuccessRate}%\n`;
  }
  md += `\n`;

  // Link-map report
  md += `## Link-map Report\n\n`;
  md += `- **Total Broken:** ${rollUp.reports.linkMap.totalBroken}\n`;
  md += `- **Internal Missing:** ${rollUp.reports.linkMap.internalMissing}\n`;
  md += `- **External:** ${rollUp.reports.linkMap.external}\n`;
  md += `- **Service:** ${rollUp.reports.linkMap.service}\n`;
  if (rollUp.reports.linkMap.internalMissing > 0) {
    md += `\n**Top Issues:**\n`;
    rollUp.reports.linkMap.issues.slice(0, 10).forEach(issue => {
      md += `- \`${issue.file}\`: ${issue.link} (${issue.reason})\n`;
    });
  }
  md += `\n`;

  // Stats report
  md += `## Stats Report\n\n`;
  md += `- **Total Pages:** ${rollUp.reports.stats.totalPages}\n`;
  md += `- **Ready:** ${rollUp.reports.stats.ready} (${rollUp.reports.stats.readyRate}%)\n`;
  md += `- **Review:** ${rollUp.reports.stats.review}\n`;
  md += `- **Draft:** ${rollUp.reports.stats.draft}\n`;
  if (rollUp.reports.stats.topProblems.length > 0) {
    md += `\n**Top Problems:**\n`;
    rollUp.reports.stats.topProblems.slice(0, 5).forEach(problem => {
      md += `- ${problem.title} (score: ${problem.score}, issues: ${problem.issues_total})\n`;
    });
  }
  md += `\n`;

  // Lint report
  md += `## Lint Quality Report\n\n`;
  md += `- **Errors:** ${rollUp.reports.lint.errors}\n`;
  md += `- **Warnings:** ${rollUp.reports.lint.warnings}\n`;
  md += `- **Status:** ${rollUp.reports.lint.hasErrors ? '❌ Has Errors' : rollUp.reports.lint.hasWarnings ? '⚠️ Has Warnings' : '✅ OK'}\n\n`;

  // Stories report
  if (rollUp.reports.stories.total > 0) {
    md += `## Stories Index Report\n\n`;
    md += `- **Total:** ${rollUp.reports.stories.total}\n`;
    md += `- **Ready:** ${rollUp.reports.stories.ready}\n`;
    md += `- **Review:** ${rollUp.reports.stories.review}\n`;
    md += `- **Draft:** ${rollUp.reports.stories.draft}\n\n`;
  }

  // CI Metrics
  if (rollUp.reports.ciMetrics) {
    md += `## CI Metrics Report\n\n`;
    md += `- **Total Runs:** ${rollUp.reports.ciMetrics.totalRuns}\n`;
    md += `- **Success Rate:** ${rollUp.reports.ciMetrics.successRate}%\n`;
    md += `- **Failed Runs:** ${rollUp.reports.ciMetrics.failedRuns}\n`;
    md += `- **Avg Duration:** ${formatDuration(rollUp.reports.ciMetrics.avgWorkflowDuration / 1000)}\n\n`;
  }

  // Flaky Tests
  if (rollUp.reports.flakyTests && rollUp.reports.flakyTests.totalFlaky > 0) {
    md += `## Flaky Tests Report\n\n`;
    md += `- **Total Flaky:** ${rollUp.reports.flakyTests.totalFlaky}\n`;
    md += `\n**Top Flaky Jobs:**\n`;
    rollUp.reports.flakyTests.topFlaky.forEach(job => {
      md += `- ${job.workflow} / ${job.job} (failure rate: ${job.failureRate}%, runs: ${job.totalRuns})\n`;
    });
    md += `\n`;
  }

  // Recommendations
  if (rollUp.recommendations.length > 0) {
    md += `## Recommendations\n\n`;
    const byPriority = {
      high: rollUp.recommendations.filter(r => r.priority === 'high'),
      medium: rollUp.recommendations.filter(r => r.priority === 'medium')
    };

    if (byPriority.high.length > 0) {
      md += `### High Priority\n\n`;
      byPriority.high.forEach(rec => {
        md += `- **${rec.category}**: ${rec.message}\n`;
      });
      md += `\n`;
    }

    if (byPriority.medium && byPriority.medium.length > 0) {
      md += `### Medium Priority\n\n`;
      byPriority.medium.forEach(rec => {
        md += `- **${rec.category}**: ${rec.message}\n`;
      });
      md += `\n`;
    }
  }

  md += `---\n\n`;
  md += `_Generated by Weekly Audit Roll-up at ${rollUp.generatedAt}_\n`;

  return md;
}

/**
 * Главная функция
 */
function main() {
  const args = process.argv.slice(2);
  const shouldPublish = args.includes('--publish');
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const outputPath = outputArg ? outputArg.split('=', 2)[1] : null;

  console.log('📊 Generating Weekly Audit Roll-up...\n');

  // Собираем данные
  const rollUp = collectRollUpData();

  // Сохраняем JSON
  const jsonPath = outputPath ? join(outputPath, 'weekly-audit-roll-up.json') : ROLL_UP_FILE;
  writeFileSync(jsonPath, JSON.stringify(rollUp, null, 2), 'utf8');
  console.log(`✅ JSON report saved: ${jsonPath}`);

  // Генерируем Markdown
  const md = generateMarkdownReport(rollUp);
  const mdPath = outputPath ? join(outputPath, 'weekly-audit-roll-up.md') : ROLL_UP_MD_FILE;
  writeFileSync(mdPath, md, 'utf8');
  console.log(`✅ Markdown report saved: ${mdPath}`);

  // Генерируем HTML
  const html = generateHTMLReport(rollUp);
  const htmlPath = ROLL_UP_HTML_FILE;
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`✅ HTML report saved: ${htmlPath}`);

  // Формируем URL для GitHub Pages (используем в публикации)
  const GITHUB_PAGES_URL = `https://utemix-lab.github.io/vovaipetrova-core/weekly-audit-roll-up.html`;
  rollUp.htmlUrl = GITHUB_PAGES_URL;

  // Выводим краткую сводку
  console.log('\n📋 Summary:');
  console.log(`   Health: ${rollUp.summary.health}`);
  console.log(`   Total Issues: ${rollUp.summary.totalIssues}`);
  console.log(`   Total Warnings: ${rollUp.summary.totalWarnings}`);
  console.log(`   Pages: ${rollUp.summary.metrics.pages} (Ready: ${rollUp.summary.metrics.readyRate}%)`);
  console.log(`   Broken Links: ${rollUp.summary.metrics.brokenLinks}`);
  console.log(`   Lint Errors: ${rollUp.summary.metrics.lintErrors}`);
  if (rollUp.recommendations.length > 0) {
    console.log(`   Recommendations: ${rollUp.recommendations.length}`);
  }

  // Публикуем в Notion, если требуется
  if (shouldPublish) {
    console.log('\n📤 Publishing to Notion...');
    try {
      const NOTION_API_KEY = process.env.NOTION_API_KEY;
      if (!NOTION_API_KEY) {
        console.warn('⚠️  NOTION_API_KEY not found, skipping Notion publish');
        return;
      }

      // Формируем payload для notion-report.mjs
      const reportPayload = {
        title: `📊 Weekly Audit Roll-up — ${formatDate(rollUp.generatedAt)}`,
        executor: 'Weekly Audit',
        status: rollUp.summary.health === 'healthy' ? 'completed' : 
                rollUp.summary.health === 'warning' ? 'warning' : 'alert',
        timestamp: rollUp.generatedAt,
        message: `Health: ${rollUp.summary.health.toUpperCase()} | Issues: ${rollUp.summary.totalIssues} | Warnings: ${rollUp.summary.totalWarnings}\n\n📄 Full Report: ${rollUp.htmlUrl || GITHUB_PAGES_URL}`,
        content: `${md}\n\n---\n\n📄 [View Full HTML Report](${rollUp.htmlUrl || GITHUB_PAGES_URL})`,
        summary: {
          health: rollUp.summary.health,
          totalIssues: rollUp.summary.totalIssues,
          totalWarnings: rollUp.summary.totalWarnings,
          metrics: rollUp.summary.metrics,
          recommendations: rollUp.recommendations,
          htmlUrl: rollUp.htmlUrl || GITHUB_PAGES_URL
        },
        workflowUrl: WORKFLOW_URL,
        htmlUrl: rollUp.htmlUrl || GITHUB_PAGES_URL
      };

      // Сохраняем payload во временный файл
      const tmpFile = join(REPORTS_DIR, `notion-roll-up-payload-${Date.now()}.json`);
      writeFileSync(tmpFile, JSON.stringify(reportPayload, null, 2), 'utf8');

      // Вызываем notion-report.mjs с ссылкой на HTML
      const notionReportContent = `Health: ${rollUp.summary.health.toUpperCase()} | Issues: ${rollUp.summary.totalIssues} | Warnings: ${rollUp.summary.totalWarnings}

📄 [View Full HTML Report](${rollUp.htmlUrl || GITHUB_PAGES_URL})`;

      reportPayload.message = notionReportContent;
      reportPayload.content = notionReportContent;

      execSync(
        `node scripts/notion-report.mjs --file "${tmpFile}" --title "${reportPayload.title}"`,
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            NOTION_API_KEY: NOTION_API_KEY
          }
        }
      );

      // Удаляем временный файл
      if (existsSync(tmpFile)) {
        unlinkSync(tmpFile);
      }

      console.log('✅ Published to Notion successfully');
    } catch (err) {
      console.warn(`⚠️  Failed to publish to Notion: ${err.message}`);
    }
  }
}

main();
