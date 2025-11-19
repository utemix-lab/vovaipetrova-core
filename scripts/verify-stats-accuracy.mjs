#!/usr/bin/env node
/**
 * Верификация метрик stats.json
 * 
 * Проверяет корректность всех метрик в stats.json:
 * - Подсчёт страниц и статусов
 * - Подсчёт issues
 * - Выборочная проверка 10-15 страниц
 * 
 * Использование: node scripts/verify-stats-accuracy.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

const PAGES_JSON = 'prototype/data/pages.json';
const BROKEN_LINKS_JSON = 'prototype/data/broken-links.json';
const STATS_JSON = 'prototype/data/stats.json';
const DOCS_ROOT = 'docs';

function verifyStats() {
  console.log('🔍 Верификация метрик stats.json\n');
  console.log('═'.repeat(60));
  
  // Загружаем данные
  if (!existsSync(PAGES_JSON)) {
    console.error(`❌ ${PAGES_JSON} не найден. Запустите сначала: npm run diagnostics:snapshot`);
    process.exit(1);
  }
  
  if (!existsSync(BROKEN_LINKS_JSON)) {
    console.error(`❌ ${BROKEN_LINKS_JSON} не найден. Запустите сначала: npm run diagnostics:snapshot`);
    process.exit(1);
  }
  
  if (!existsSync(STATS_JSON)) {
    console.error(`❌ ${STATS_JSON} не найден. Запустите сначала: npm run diagnostics:snapshot`);
    process.exit(1);
  }
  
  const pages = JSON.parse(readFileSync(PAGES_JSON, 'utf8'));
  const brokenLinks = JSON.parse(readFileSync(BROKEN_LINKS_JSON, 'utf8'));
  const stats = JSON.parse(readFileSync(STATS_JSON, 'utf8'));
  
  // Фильтруем только неслужебные страницы (как в generate-stats.mjs)
  const docPages = pages.filter(p => !p.service && !p.url.includes('/stories/'));
  
  // Подсчитываем статусы вручную
  const actualStatuses = {
    ready: docPages.filter(p => p.status === 'ready').length,
    review: docPages.filter(p => p.status === 'review').length,
    draft: docPages.filter(p => p.status === 'draft').length
  };
  
  // Подсчитываем issues вручную
  const actualIssues = {
    total: brokenLinks.brokenCount,
    internal_missing: brokenLinks.issues.filter(i => i.reason === 'missing' && !i.link.startsWith('http')).length,
    service: brokenLinks.issues.filter(i => i.reason === 'service' || i.link.includes('service')).length,
    external: brokenLinks.issues.filter(i => i.link.startsWith('http')).length,
    unknown: brokenLinks.issues.filter(i => i.reason === 'unknown_target' || i.reason === 'unknown').length
  };
  
  // Маппинг ключей issues
  const issuesKeys = {
    total: 'issues_total',
    internal_missing: 'issues_internal_missing',
    service: 'issues_service',
    external: 'issues_external',
    unknown: 'issues_unknown'
  };
  
  // Проверяем расхождения
  const discrepancies = [];
  
  // Проверка количества страниц
  if (stats.totals.pages !== docPages.length) {
    discrepancies.push({
      metric: 'pages',
      expected: docPages.length,
      actual: stats.totals.pages,
      diff: stats.totals.pages - docPages.length
    });
  }
  
  // Проверка статусов
  for (const status of ['ready', 'review', 'draft']) {
    if (stats.totals.statuses[status] !== actualStatuses[status]) {
      discrepancies.push({
        metric: `statuses.${status}`,
        expected: actualStatuses[status],
        actual: stats.totals.statuses[status],
        diff: stats.totals.statuses[status] - actualStatuses[status]
      });
    }
  }
  
  // Проверка issues
  for (const [key, statKey] of Object.entries(issuesKeys)) {
    const expected = actualIssues[key];
    const actual = stats.totals[statKey];
    if (actual !== expected) {
      discrepancies.push({
        metric: statKey,
        expected,
        actual,
        diff: actual - expected
      });
    }
  }
  
  // Выводим результаты
  console.log('\n📊 Результаты проверки:\n');
  
  console.log('Количество страниц:');
  console.log(`  Ожидается: ${docPages.length}`);
  console.log(`  В stats.json: ${stats.totals.pages}`);
  console.log(`  ${stats.totals.pages === docPages.length ? '✅' : '❌'}\n`);
  
  console.log('Статусы:');
  for (const status of ['ready', 'review', 'draft']) {
    const expected = actualStatuses[status];
    const actual = stats.totals.statuses[status];
    console.log(`  ${status}: ожидается ${expected}, в stats.json ${actual} ${expected === actual ? '✅' : '❌'}`);
  }
  console.log('');
  
  console.log('Issues:');
  for (const [key, statKey] of Object.entries(issuesKeys)) {
    const expected = actualIssues[key];
    const actual = stats.totals[statKey];
    console.log(`  ${statKey}: ожидается ${expected}, в stats.json ${actual} ${expected === actual ? '✅' : '❌'}`);
  }
  console.log('');
  
  // Выборочная проверка страниц
  console.log('═'.repeat(60));
  console.log('\n🔍 Выборочная проверка страниц (15 случайных):\n');
  
  const samplePages = docPages
    .sort(() => Math.random() - 0.5)
    .slice(0, 15);
  
  const pageDiscrepancies = [];
  
  for (const page of samplePages) {
    const filePath = page.url.startsWith('docs/') ? page.url : `docs/${page.url}`;
    
    if (!existsSync(filePath)) {
      pageDiscrepancies.push({
        slug: page.slug,
        issue: `Файл не найден: ${filePath}`
      });
      continue;
    }
    
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data || {};
    
    const issues = [];
    
    // Проверка статуса
    const fileStatus = String(fm.status || '').trim().toLowerCase();
    if (fileStatus !== page.status) {
      issues.push(`Статус: файл="${fileStatus}", pages.json="${page.status}"`);
    }
    
    // Проверка title
    if (fm.title !== page.title) {
      issues.push(`Title: файл="${fm.title}", pages.json="${page.title}"`);
    }
    
    // Проверка slug
    if (fm.slug !== page.slug) {
      issues.push(`Slug: файл="${fm.slug}", pages.json="${page.slug}"`);
    }
    
    // Проверка service
    const isService = fm.service === true;
    if (isService !== page.service) {
      issues.push(`Service: файл=${isService}, pages.json=${page.service}`);
    }
    
    if (issues.length > 0) {
      pageDiscrepancies.push({
        slug: page.slug,
        issues
      });
    }
  }
  
  if (pageDiscrepancies.length === 0) {
    console.log('✅ Все проверенные страницы соответствуют файлам\n');
  } else {
    console.log(`⚠️  Найдено расхождений: ${pageDiscrepancies.length}\n`);
    for (const { slug, issues } of pageDiscrepancies) {
      console.log(`  ${slug}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
      console.log('');
    }
  }
  
  // Итоговый отчёт
  console.log('═'.repeat(60));
  console.log('\n📋 Итоговый отчёт:\n');
  
  if (discrepancies.length === 0 && pageDiscrepancies.length === 0) {
    console.log('✅ Все метрики корректны!');
    console.log(`✅ Проверено страниц: ${samplePages.length}`);
    console.log(`✅ Точность метрик: 100%`);
    process.exit(0);
  } else {
    console.log(`❌ Найдено расхождений: ${discrepancies.length + pageDiscrepancies.length}`);
    
    if (discrepancies.length > 0) {
      console.log('\nРасхождения в метриках:');
      for (const d of discrepancies) {
        console.log(`  - ${d.metric}: ожидается ${d.expected}, фактически ${d.actual} (разница: ${d.diff > 0 ? '+' : ''}${d.diff})`);
      }
    }
    
    if (pageDiscrepancies.length > 0) {
      console.log(`\nРасхождения в страницах: ${pageDiscrepancies.length} из ${samplePages.length}`);
    }
    
    const accuracy = Math.round(((samplePages.length - pageDiscrepancies.length) / samplePages.length) * 100);
    console.log(`\nТочность метрик: ${accuracy}%`);
    
    process.exit(1);
  }
}

verifyStats();

