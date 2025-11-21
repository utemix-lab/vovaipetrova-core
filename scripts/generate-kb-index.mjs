#!/usr/bin/env node
/**
 * Генерация алфавитных индексов для KB (/kb/<letter>)
 * 
 * Создаёт индексы страниц KB, сгруппированные по первой букве заголовка.
 * 
 * Использование:
 *   node scripts/generate-kb-index.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const PAGES_JSON_PATH = 'prototype/data/pages.json';
const KB_INDEX_OUTPUT_PATH = 'prototype/data/kb-index.json';

/**
 * Получает первую букву для индексации
 */
function getIndexLetter(title) {
  if (!title || typeof title !== 'string') return 'other';
  
  // Убираем префиксы типа "ADR — ", "Spec — " и т.д.
  const cleaned = title.replace(/^(ADR|Spec|Template|RFC|TEMPLATE)\s*[—–-]\s*/i, '').trim();
  
  if (!cleaned) return 'other';
  
  // Получаем первую букву
  const firstChar = cleaned[0].toUpperCase();
  
  // Проверяем, является ли это буквой (латиница или кириллица)
  if (/[A-ZА-ЯЁ]/.test(firstChar)) {
    return firstChar;
  }
  
  // Если это цифра
  if (/[0-9]/.test(firstChar)) {
    return '0-9';
  }
  
  return 'other';
}

/**
 * Генерирует алфавитный индекс страниц KB
 */
function generateKBIndex(pages) {
  // Фильтруем только страницы KB (не service, с product/kb в machine_tags или в пути /kb)
  const kbPages = pages.filter(page => {
    if (page.service) return false;
    
    // Проверяем machine_tags
    const machineTags = page.machine_tags || [];
    if (machineTags.some(tag => tag.startsWith('product/kb'))) {
      return true;
    }
    
    // Проверяем путь (если страница в docs/kb/ или имеет путь /kb в routes.yml)
    const url = page.url || '';
    if (url.includes('/kb/') || url.startsWith('kb/')) {
      return true;
    }
    
    return false;
  });
  
  // Группируем по первой букве
  const indexByLetter = {};
  
  kbPages.forEach(page => {
    const letter = getIndexLetter(page.title);
    
    if (!indexByLetter[letter]) {
      indexByLetter[letter] = [];
    }
    
    indexByLetter[letter].push({
      slug: page.slug,
      title: page.title,
      url: page.url,
      summary: page.summary || '',
      status: page.status || 'draft'
    });
  });
  
  // Сортируем страницы внутри каждой буквы по заголовку
  Object.keys(indexByLetter).forEach(letter => {
    indexByLetter[letter].sort((a, b) => {
      // Сначала по статусу (ready > review > draft)
      const statusOrder = { ready: 0, review: 1, draft: 2 };
      const statusDiff = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
      if (statusDiff !== 0) return statusDiff;
      
      // Затем по заголовку
      return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' });
    });
  });
  
  // Сортируем буквы
  const sortedLetters = Object.keys(indexByLetter).sort((a, b) => {
    // Сначала цифры, затем буквы, затем 'other'
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    if (a === '0-9') return -1;
    if (b === '0-9') return 1;
    return a.localeCompare(b);
  });
  
  return {
    generatedAt: new Date().toISOString(),
    totalPages: kbPages.length,
    letters: sortedLetters,
    index: indexByLetter
  };
}

function main() {
  console.log('📇 Generating KB alphabetical index...\n');
  
  if (!existsSync(PAGES_JSON_PATH)) {
    console.error(`❌ ${PAGES_JSON_PATH} not found. Run build-index.mjs first.`);
    process.exit(1);
  }
  
  const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
  console.log(`📚 Processing ${pages.length} pages...`);
  
  const kbIndex = generateKBIndex(pages);
  
  console.log(`\n📊 Summary:`);
  console.log(`   KB pages found: ${kbIndex.totalPages}`);
  console.log(`   Letters: ${kbIndex.letters.join(', ')}`);
  
  // Показываем статистику по буквам
  console.log(`\n📋 Pages per letter:`);
  kbIndex.letters.forEach(letter => {
    const count = kbIndex.index[letter].length;
    console.log(`   ${letter}: ${count} page(s)`);
  });
  
  writeFileSync(KB_INDEX_OUTPUT_PATH, JSON.stringify(kbIndex, null, 2), 'utf8');
  console.log(`\n✅ KB index saved to ${KB_INDEX_OUTPUT_PATH}`);
}

main();

