#!/usr/bin/env node
/**
 * Получить страницу Notion по ID
 * Использование: node scripts/codegpt/notion-fetch.mjs <page-id>
 */

import { getPage, getBlocks } from './notion-api.mjs';

const pageId = process.argv[2];

if (!pageId) {
  console.error('Использование: node notion-fetch.mjs <page-id>');
  process.exit(1);
}

try {
  const page = await getPage(pageId);
  const blocks = await getBlocks(pageId);
  
  console.log('Страница:');
  console.log(JSON.stringify(page, null, 2));
  console.log('\nБлоки:');
  console.log(JSON.stringify(blocks, null, 2));
} catch (error) {
  console.error('❌ Ошибка получения страницы:', error.message);
  process.exit(1);
}

