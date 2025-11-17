#!/usr/bin/env node
/**
 * Поиск в Notion через API
 * Использование: node scripts/codegpt/notion-search.mjs <query>
 */

import { searchPages } from './notion-api.mjs';

const query = process.argv[2] || '';

try {
  const results = await searchPages(query);
  console.log(`Найдено страниц: ${results.results.length}`);
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error('❌ Ошибка поиска:', error.message);
  process.exit(1);
}

