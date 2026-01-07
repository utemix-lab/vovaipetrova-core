#!/usr/bin/env node
/**
 * Генерация sitemap.xml для GitHub Pages
 * 
 * Создаёт XML sitemap на основе pages.json, включая только публичные страницы
 * (не service, статус ready или review).
 * 
 * Использование:
 *   node scripts/generate-sitemap.mjs [--base-url <url>]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES_JSON_PATH = join(__dirname, '../prototype/data/pages.json');
const SITEMAP_OUTPUT_PATH = join(__dirname, '../prototype/sitemap.xml');
const BASE_URL = process.argv.includes('--base-url') 
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'https://utemix-lab.github.io/vovaipetrova-core';

/**
 * Экранирует XML специальные символы
 */
function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Форматирует дату в формат W3C (ISO 8601)
 */
function formatDate(date) {
  if (!date) return new Date().toISOString();
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Определяет приоритет страницы на основе её типа и статуса
 */
function getPriority(page) {
  // Главная страница
  if (page.slug === 'vova-i-petrova' || page.slug === 'indeks-sajta') {
    return '1.0';
  }
  
  // Страницы Think Tank и важные разделы
  if (page.url && (
    page.url.includes('/think-tank/') ||
    page.url.includes('/nav/') ||
    page.slug.startsWith('arhitektura') ||
    page.slug.startsWith('adr-')
  )) {
    return '0.9';
  }
  
  // Страницы KB
  if (page.url && page.url.includes('/kb/')) {
    return '0.8';
  }
  
  // Stories
  if (page.collection === 'stories' || (page.url && page.url.includes('/stories/'))) {
    return '0.7';
  }
  
  // Остальные страницы
  return '0.6';
}

/**
 * Определяет частоту обновления страницы
 */
function getChangeFreq(page) {
  // Think Tank и ADR обновляются редко
  if (page.url && (
    page.url.includes('/think-tank/') ||
    page.slug.startsWith('adr-')
  )) {
    return 'monthly';
  }
  
  // Stories обновляются часто
  if (page.collection === 'stories' || (page.url && page.url.includes('/stories/'))) {
    return 'weekly';
  }
  
  // KB страницы обновляются периодически
  if (page.url && page.url.includes('/kb/')) {
    return 'weekly';
  }
  
  // По умолчанию
  return 'monthly';
}

function main() {
  console.log('🗺️  Generating sitemap.xml...\n');
  
  if (!existsSync(PAGES_JSON_PATH)) {
    console.error(`❌ ${PAGES_JSON_PATH} not found. Run build-index.mjs first.`);
    process.exit(1);
  }
  
  const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
  console.log(`📚 Processing ${pages.length} pages...`);
  
  // Фильтруем только публичные страницы
  const publicPages = pages.filter(page => {
    // Исключаем service страницы
    if (page.service === true) return false;
    
    // Включаем только ready и review страницы (draft исключаем)
    const status = (page.status || '').toLowerCase();
    if (status === 'draft') return false;
    
    return true;
  });
  
  console.log(`   Public pages: ${publicPages.length}`);
  
  // Генерируем XML
  const urls = publicPages.map(page => {
    const url = `${BASE_URL}/page/${page.slug}.html`;
    const lastmod = page.updated ? formatDate(page.updated) : formatDate(new Date());
    const priority = getPriority(page);
    const changefreq = getChangeFreq(page);
    
    return `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });
  
  // Добавляем главную страницу Explorer
  urls.unshift(`  <url>
    <loc>${escapeXml(BASE_URL)}</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  
  writeFileSync(SITEMAP_OUTPUT_PATH, sitemap, 'utf8');
  console.log(`\n✅ Sitemap saved to ${SITEMAP_OUTPUT_PATH}`);
  console.log(`   Total URLs: ${urls.length}`);
  console.log(`   Base URL: ${BASE_URL}`);
}

main();

