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
    process.exit(1);
  }

  try {
    const stats = JSON.parse(readFileSync(STATS_JSON, 'utf8'));
    const totals = stats.totals || {};
    const statuses = totals.statuses || {};
    
    const readyCount = statuses.ready || 0;
    const issuesTotal = totals.issues_total || 0;
    const internalMissing = totals.issues_internal_missing || 0;
    const pagesTotal = totals.pages || 0;
    
    const summary = [
      '## 📊 Diagnostics Snapshot',
      '',
      `- **Ready pages:** ${readyCount} / ${pagesTotal}`,
      `- **Total issues:** ${issuesTotal}`,
      `- **Internal missing:** ${internalMissing}`,
      '',
      `_Generated at ${stats.generatedAt || new Date().toISOString()}_`
    ].join('\n');
    
    console.log(summary);
    return summary;
  } catch (error) {
    console.error(`⚠️  Failed to read ${STATS_JSON}:`, error.message);
    process.exit(1);
  }
}

generateSummary();

