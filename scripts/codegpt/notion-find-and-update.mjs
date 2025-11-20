#!/usr/bin/env node
/**
 * Найти страницу Notion по названию и обновить её
 * Замена для MCP функциональности
 * 
 * Использование:
 *   node notion-find-and-update.mjs "Routes consistency check + Orphans view" \
 *     '{"Status":{"select":{"name":"Done"}},"Deliverables":{"rich_text":[{"text":{"content":"PR #66"}}]}}'
 * 
 * Или с файлом:
 *   node notion-find-and-update.mjs "Task Name" --file props.json
 */

import { readFileSync } from 'fs';
import { searchPages, updatePage } from './notion-api.mjs';

const args = process.argv.slice(2);
const searchQuery = args[0];
let propertiesJson = args[1];

if (!searchQuery) {
  console.error('Использование: node notion-find-and-update.mjs <search-query> <properties-json>');
  console.error('Или: node notion-find-and-update.mjs <search-query> --file <json-file>');
  console.error('\nПример:');
  console.error('  node notion-find-and-update.mjs "Routes consistency" \'{"Status":{"select":{"name":"Done"}}}\'');
  process.exit(1);
}

// Поддержка чтения из файла
if (args[1] === '--file' && args[2]) {
  propertiesJson = readFileSync(args[2], 'utf-8');
} else if (!propertiesJson) {
  console.error('Ошибка: не указаны свойства для обновления');
  process.exit(1);
}

try {
  // Поиск страниц
  console.log(`🔍 Ищу страницы по запросу: "${searchQuery}"...`);
  // Фильтр для поиска только страниц (не databases)
  const searchResults = await searchPages(searchQuery, {
    property: 'object',
    value: 'page'
  });

  if (!searchResults.results || searchResults.results.length === 0) {
    console.error(`❌ Страницы не найдены по запросу: "${searchQuery}"`);
    process.exit(1);
  }

  // Фильтруем результаты, ищем точное совпадение в title
  const pages = searchResults.results.filter(page => {
    // Пробуем разные варианты извлечения названия
    let title = '';
    
    // Вариант 1: title property
    if (page.properties?.title?.title?.[0]?.plain_text) {
      title = page.properties.title.title[0].plain_text;
    }
    // Вариант 2: Name property
    else if (page.properties?.Name?.title?.[0]?.plain_text) {
      title = page.properties.Name.title[0].plain_text;
    }
    // Вариант 3: любое свойство типа title
    else {
      for (const [key, prop] of Object.entries(page.properties || {})) {
        if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
          title = prop.title[0].plain_text;
          break;
        }
      }
    }
    
    // Если название не найдено, пропускаем
    if (!title) return false;
    
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (pages.length === 0) {
    console.error(`❌ Точное совпадение не найдено. Найдено ${searchResults.results.length} результатов:`);
    searchResults.results.slice(0, 5).forEach((page, i) => {
      let title = '';
      for (const [key, prop] of Object.entries(page.properties || {})) {
        if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
          title = prop.title[0].plain_text;
          break;
        }
      }
      console.error(`  ${i + 1}. ${title || 'Без названия'} (${page.id})`);
    });
    process.exit(1);
  }

  if (pages.length > 1) {
    console.warn(`⚠️  Найдено несколько страниц (${pages.length}), обновляю первую:`);
    pages.forEach((page, i) => {
      let title = '';
      for (const [key, prop] of Object.entries(page.properties || {})) {
        if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
          title = prop.title[0].plain_text;
          break;
        }
      }
      console.warn(`  ${i + 1}. ${title || 'Без названия'} (${page.id})`);
    });
  }

  const page = pages[0];
  let title = '';
  for (const [key, prop] of Object.entries(page.properties || {})) {
    if (prop.type === 'title' && prop.title?.[0]?.plain_text) {
      title = prop.title[0].plain_text;
      break;
    }
  }
  
  console.log(`📄 Найдена страница: "${title}" (${page.id})`);
  console.log(`🔄 Обновляю страницу...`);

  // Обновление страницы
  const properties = JSON.parse(propertiesJson);
  const updatedPage = await updatePage(page.id, properties);
  
  console.log('✅ Страница успешно обновлена!');
  console.log(`\nID: ${updatedPage.id}`);
  console.log(`URL: ${updatedPage.url || 'N/A'}`);
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}

