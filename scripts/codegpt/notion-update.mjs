#!/usr/bin/env node
/**
 * Обновить страницу Notion
 * Использование: node scripts/codegpt/notion-update.mjs <page-id> <properties-json>
 */

import { updatePage } from './notion-api.mjs';

const [pageId, propertiesJson] = process.argv.slice(2);

if (!pageId || !propertiesJson) {
  console.error('Использование: node notion-update.mjs <page-id> <properties-json>');
  console.error('Пример: node notion-update.mjs abc123 \'{"Status":{"select":{"name":"Done"}}}\'');
  process.exit(1);
}

try {
  const properties = JSON.parse(propertiesJson);
  const page = await updatePage(pageId, properties);
  console.log('✅ Страница обновлена:');
  console.log(JSON.stringify(page, null, 2));
} catch (error) {
  console.error('❌ Ошибка обновления:', error.message);
  process.exit(1);
}

