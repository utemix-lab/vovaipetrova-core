#!/usr/bin/env node
/**
 * Генерирует краткую сводку диагностик для PR комментария
 * Использование: node scripts/generate-pr-diagnostics-summary.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATS_JSON = join(__dirname, '../prototype/data/stats.json');

function generateSummary() {
  if (!existsSync(STATS_JSON)) {
    console.error(`⚠️  ${STATS_JSON} not found. Run diagnostics first.`);
    // В CI это не должно блокировать, возвращаем пустую строку
    if (process.env.CI) {
      return '';
    }
    process.exit(1);
  }

  try {
    const stats = JSON.parse(readFileSync(STATS_JSON, 'utf8'));
    const totals = stats.totals || {};
    const statuses = totals.statuses || {};
    
    // Проверяем версию для обратной совместимости
    const version = stats.version || '2.0';
    
    const readyCount = statuses.ready || 0;
    const issuesTotal = totals.issues_total || 0;
    const internalMissing = totals.issues_internal_missing || 0;
    const pagesTotal = totals.pages || 0;
    const draftCount = statuses.draft || 0;
    const reviewCount = statuses.review || 0;
    
    // Вычисляем процент готовности
    const readyPercent = pagesTotal > 0 ? Math.round((readyCount / pagesTotal) * 100) : 0;
    
    // Формируем более информативную сводку
    const summary = [
      '## 📊 Diagnostics Snapshot',
      '',
      `**Version:** ${version}`,
      '',
      `### Content Status`,
      `- **Ready pages:** ${readyCount} / ${pagesTotal} (${readyPercent}%)`,
      `- **Review pages:** ${reviewCount}`,
      `- **Draft pages:** ${draftCount}`,
      '',
      `### Issues`,
      `- **Total issues:** ${issuesTotal}`,
      `- **Internal missing:** ${internalMissing}${internalMissing > 0 ? ' ⚠️' : ' ✅'}`,
      '',
      `_Generated at ${stats.generatedAt || new Date().toISOString()}_`
    ].join('\n');
    
    console.log(summary);
    return summary;
  } catch (error) {
    console.error(`⚠️  Failed to read ${STATS_JSON}:`, error.message);
    // В CI не блокируем, возвращаем пустую строку
    if (process.env.CI) {
      return '';
    }
    process.exit(1);
  }
}

generateSummary();

