#!/usr/bin/env node
/**
 * Notion API Helper для CodeGPT
 * Базовые функции для работы с Notion API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка переменных окружения
function loadEnv() {
  try {
    const envPath = join(__dirname, '../../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    });
    Object.assign(process.env, env);
  } catch (err) {
    // .env не обязателен, если переменные заданы в системе
  }
}

loadEnv();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_API_BASE = 'https://api.notion.com/v1';

if (!NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY не установлен. Установите в .env или переменных окружения.');
  process.exit(1);
}

/**
 * Базовый запрос к Notion API
 */
async function notionRequest(endpoint, options = {}) {
  const url = `${NOTION_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Поиск страниц в Notion
 */
export async function searchPages(query, filter = {}) {
  return notionRequest('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      filter,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time',
      },
    }),
  });
}

/**
 * Получить страницу по ID
 */
export async function getPage(pageId) {
  return notionRequest(`/pages/${pageId}`);
}

/**
 * Получить блоки страницы
 */
export async function getBlocks(blockId) {
  return notionRequest(`/blocks/${blockId}/children`);
}

/**
 * Обновить страницу
 */
export async function updatePage(pageId, properties) {
  return notionRequest(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties }),
  });
}

/**
 * Создать страницу
 */
export async function createPage(parentId, properties, children = []) {
  return notionRequest('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { page_id: parentId },
      properties,
      children,
    }),
  });
}

/**
 * Получить базу данных
 */
export async function getDatabase(databaseId) {
  return notionRequest(`/databases/${databaseId}`);
}

/**
 * Запрос к базе данных
 */
export async function queryDatabase(databaseId, filter = {}, sorts = []) {
  return notionRequest(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter, sorts }),
  });
}

// CLI интерфейс
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'search':
        const results = await searchPages(args[0] || '');
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'get-page':
        const page = await getPage(args[0]);
        console.log(JSON.stringify(page, null, 2));
        break;
      case 'get-blocks':
        const blocks = await getBlocks(args[0]);
        console.log(JSON.stringify(blocks, null, 2));
        break;
      default:
        console.log('Использование:');
        console.log('  node notion-api.mjs search [query]');
        console.log('  node notion-api.mjs get-page <page-id>');
        console.log('  node notion-api.mjs get-blocks <block-id>');
    }
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

