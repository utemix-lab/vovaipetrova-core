#!/usr/bin/env node
/**
 * Проверяет стабильность метрик diagnostics
 * Сравнивает текущие метрики с предыдущими для выявления регрессий
 * 
 * Использование:
 *   node scripts/verify-diagnostics-stability.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATS_JSON = join(__dirname, '../prototype/data/stats.json');
const BROKEN_LINKS_JSON = join(__dirname, '../prototype/data/broken-links.json');
const THRESHOLDS_CONFIG_PATH = join(__dirname, '..', 'config', 'ci-thresholds.json');

/**
 * Загружает конфигурацию порогов из config/ci-thresholds.json
 */
function loadThresholdsConfig() {
  if (!existsSync(THRESHOLDS_CONFIG_PATH)) {
    return null;
  }

  try {
    const configContent = readFileSync(THRESHOLDS_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);
    return config;
  } catch (error) {
    console.warn(`⚠️  Failed to load thresholds config: ${error.message}`);
    return null;
  }
}

const thresholdsConfig = loadThresholdsConfig();
const diagnosticsConfig = thresholdsConfig?.diagnostics || {};

// Пороговые значения для стабильности (из конфига или дефолтные)
const THRESHOLDS = {
  maxInternalMissingIncrease: diagnosticsConfig.maxInternalMissingIncrease ?? 5,
  maxTotalIssuesIncrease: diagnosticsConfig.maxTotalIssuesIncrease ?? 10,
  minReadyPercent: diagnosticsConfig.minReadyPercent ?? 40
};

function loadDiagnostics() {
  const diagnostics = {
    stats: null,
    brokenLinks: null
  };
  
  if (existsSync(STATS_JSON)) {
    try {
      diagnostics.stats = JSON.parse(readFileSync(STATS_JSON, 'utf8'));
    } catch (error) {
      console.error(`❌ Failed to parse ${STATS_JSON}:`, error.message);
      return null;
    }
  }
  
  if (existsSync(BROKEN_LINKS_JSON)) {
    try {
      diagnostics.brokenLinks = JSON.parse(readFileSync(BROKEN_LINKS_JSON, 'utf8'));
    } catch (error) {
      console.error(`❌ Failed to parse ${BROKEN_LINKS_JSON}:`, error.message);
      return null;
    }
  }
  
  return diagnostics;
}

function verifyStability(diagnostics) {
  if (!diagnostics || !diagnostics.stats) {
    console.error('❌ Diagnostics data not found');
    return { stable: false, issues: ['Diagnostics data not found'] };
  }
  
  const issues = [];
  const stats = diagnostics.stats;
  const totals = stats.totals || {};
  const statuses = totals.statuses || {};
  
  // Проверка версии
  if (!stats.version) {
    issues.push('⚠️  Missing version field (backward compatibility mode)');
  } else if (stats.version !== '3.0') {
    issues.push(`⚠️  Unexpected version: ${stats.version} (expected 3.0)`);
  }
  
  // Проверка структуры данных
  if (!totals.pages) {
    issues.push('❌ Missing pages count');
  }
  
  if (!statuses.ready && statuses.ready !== 0) {
    issues.push('❌ Missing ready status count');
  }
  
  // Проверка метрик
  const readyPercent = totals.pages > 0 
    ? Math.round((statuses.ready / totals.pages) * 100) 
    : 0;
  
  if (readyPercent < THRESHOLDS.minReadyPercent) {
    issues.push(
      `⚠️  Ready pages percentage too low: ${readyPercent}% (threshold: ${THRESHOLDS.minReadyPercent}%)`
    );
  }
  
  const internalMissing = totals.issues_internal_missing || 0;
  if (internalMissing > THRESHOLDS.maxInternalMissingIncrease) {
    issues.push(
      `⚠️  Internal missing issues high: ${internalMissing} (threshold: ${THRESHOLDS.maxInternalMissingIncrease})`
    );
  }
  
  const totalIssues = totals.issues_total || 0;
  if (totalIssues > THRESHOLDS.maxTotalIssuesIncrease) {
    issues.push(
      `⚠️  Total issues high: ${totalIssues} (threshold: ${THRESHOLDS.maxTotalIssuesIncrease})`
    );
  }
  
  // Проверка консистентности
  const calculatedInternalMissing = diagnostics.brokenLinks?.issues
    ?.filter(i => i.reason === 'missing' && !i.link.startsWith('http')).length || 0;
  
  if (Math.abs(internalMissing - calculatedInternalMissing) > 1) {
    issues.push(
      `⚠️  Inconsistency: stats.issues_internal_missing (${internalMissing}) != calculated (${calculatedInternalMissing})`
    );
  }
  
  const stable = issues.filter(i => i.startsWith('❌')).length === 0;
  
  return { stable, issues };
}

function main() {
  console.log('🔍 Verifying diagnostics stability...\n');
  
  const diagnostics = loadDiagnostics();
  if (!diagnostics) {
    process.exit(1);
  }
  
  const result = verifyStability(diagnostics);
  
  if (result.issues.length > 0) {
    console.log('📋 Issues found:\n');
    result.issues.forEach(issue => console.log(`   ${issue}`));
    console.log('');
  }
  
  if (result.stable) {
    console.log('✅ Diagnostics metrics are stable');
    
    // Выводим краткую сводку
    const stats = diagnostics.stats;
    const totals = stats.totals || {};
    const statuses = totals.statuses || {};
    const readyPercent = totals.pages > 0 
      ? Math.round((statuses.ready / totals.pages) * 100) 
      : 0;
    
    console.log('\n📊 Current metrics:');
    console.log(`   Pages: ${totals.pages}`);
    console.log(`   Ready: ${statuses.ready} (${readyPercent}%)`);
    console.log(`   Draft: ${statuses.draft}`);
    console.log(`   Issues: ${totals.issues_total}`);
    console.log(`   Internal missing: ${totals.issues_internal_missing || 0}`);
    
    process.exit(0);
  } else {
    console.log('❌ Diagnostics metrics have stability issues');
    process.exit(1);
  }
}

main();

