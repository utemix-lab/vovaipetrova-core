#!/usr/bin/env node
/**
 * Notion Report — публикация минимального отчёта в «Copilot — Отчёты»
 * 
 * Использование:
 *   node scripts/notion-report.mjs [--file=path] [--payload=json] [--page-id=id] [--title=title]
 * 
 * Если --page-id не указан, скрипт ищет страницу «Copilot — Отчёты» через поиск.
 * Если --file и --payload не указаны, создаётся минимальный отчёт с текущей датой и временем.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnv() {
  try {
    const repoRoot = process.cwd();
    const envPath = join(repoRoot, '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        env[key] = value;
      }
    });
    Object.assign(process.env, env);
  } catch (err) {
    // ignore
  }
}

loadEnv();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_API_BASE = 'https://api.notion.com/v1';

if (!NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY not found in environment.');
  process.exit(1);
}

function notionRequest(endpoint, options = {}) {
  const url = `${NOTION_API_BASE}${endpoint}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notion API error ${res.status}: ${body}`);
    }
    return res.json();
  });
}

/**
 * Извлекает ID страницы из URL или ID
 */
function extractNotionId(input) {
  if (!input) return null;
  // Если это URL, извлекаем ID
  const urlMatch = input.match(/notion\.so\/(?:[^\/]+\/)?([a-f0-9]{32})/i);
  if (urlMatch) {
    const id = urlMatch[1];
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  // Если уже UUID формат
  if (input.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
    return input;
  }
  // Если просто ID без дефисов
  if (input.match(/^[a-f0-9]{32}$/i)) {
    const id = input;
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  return input;
}

/**
 * Ищет страницу «Copilot — Отчёты» через поиск Notion
 */
async function findCopilotReportsPage() {
  try {
    console.log('🔍 Searching for "Copilot — Отчёты" page...');
    const searchResults = await notionRequest('/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Copilot — Отчёты',
        filter: {
          property: 'object',
          value: 'page',
        },
      }),
    });

    if (searchResults.results && searchResults.results.length > 0) {
      const page = searchResults.results[0];
      console.log(`✅ Found page: ${page.id}`);
      return page.id;
    }

    // Попробуем поиск без фильтра
    const searchResults2 = await notionRequest('/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Copilot Отчёты',
      }),
    });

    if (searchResults2.results && searchResults2.results.length > 0) {
      const page = searchResults2.results.find(p => 
        p.object === 'page' && 
        (p.properties?.title?.title?.[0]?.plain_text?.includes('Copilot') || 
         p.properties?.title?.title?.[0]?.plain_text?.includes('Отчёты'))
      );
      if (page) {
        console.log(`✅ Found page: ${page.id}`);
        return page.id;
      }
    }

    console.warn('⚠️  Page "Copilot — Отчёты" not found via search');
    return null;
  } catch (err) {
    console.error('❌ Failed to search for page:', err.message);
    return null;
  }
}

/**
 * Создаёт минимальный отчёт
 */
function createMinimalReport(data = {}) {
  const now = new Date();
  const timestamp = now.toISOString();
  const dateStr = now.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    timestamp,
    date: dateStr,
    executor: 'GitHub Copilot',
    status: 'completed',
    ...data,
  };
}

/**
 * Форматирует отчёт в блоки Notion
 */
function formatReportAsBlocks(report) {
  const blocks = [];

  // Заголовок с датой
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [
        {
          type: 'text',
          text: {
            content: `Отчёт ${report.date || new Date().toLocaleDateString('ru-RU')}`,
          },
        },
      ],
    },
  });

  // Разделитель
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // Информация об отчёте
  const infoLines = [];
  if (report.executor) {
    infoLines.push(`**Executor**: ${report.executor}`);
  }
  if (report.status) {
    infoLines.push(`**Status**: ${report.status}`);
  }
  if (report.timestamp) {
    infoLines.push(`**Timestamp**: ${report.timestamp}`);
  }

  if (infoLines.length > 0) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: infoLines.join('\n'),
            },
          },
        ],
      },
    });
  }

  // Основное содержимое
  if (report.content || report.message) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: report.content || report.message || '',
            },
          },
        ],
      },
    });
  }

  // Если есть дополнительные данные, добавляем их как code block
  const { timestamp, date, executor, status, content, message, ...rest } = report;
  if (Object.keys(rest).length > 0) {
    blocks.push({
      object: 'block',
      type: 'code',
      code: {
        language: 'json',
        rich_text: [
          {
            type: 'text',
            text: {
              content: JSON.stringify(rest, null, 2),
            },
          },
        ],
      },
    });
  }

  return blocks;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--file=')) {
      out.file = a.split('=')[1];
    } else if (a.startsWith('--page-id=')) {
      out.pageId = a.split('=')[1];
    } else if (a.startsWith('--payload=')) {
      out.payload = a.split('=')[1];
    } else if (a.startsWith('--title=')) {
      out.title = a.split('=')[1];
    } else if (a === '--file' && i + 1 < args.length) {
      out.file = args[++i];
    } else if (a === '--page-id' && i + 1 < args.length) {
      out.pageId = args[++i];
    } else if (a === '--payload' && i + 1 < args.length) {
      out.payload = args[++i];
    } else if (a === '--title' && i + 1 < args.length) {
      out.title = args[++i];
    }
  }
  return out;
}

async function main() {
  const { file, pageId, payload, title } = parseArgs();

  // Определяем страницу для публикации
  let targetPageId = null;
  if (pageId) {
    targetPageId = extractNotionId(pageId);
  } else if (process.env.NOTION_COPILOT_REPORTS_PAGE_ID) {
    targetPageId = extractNotionId(process.env.NOTION_COPILOT_REPORTS_PAGE_ID);
  } else {
    targetPageId = await findCopilotReportsPage();
  }

  if (!targetPageId) {
    console.error('❌ No page ID provided and could not find "Copilot — Отчёты" page.');
    console.error('   Use --page-id=... or set NOTION_COPILOT_REPORTS_PAGE_ID env var.');
    process.exit(1);
  }

  console.log(`📄 Using page ID: ${targetPageId}`);

  // Получаем данные отчёта
  let reportData = null;
  if (file) {
    try {
      reportData = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      console.error('❌ Failed to read/parse file payload:', err.message);
      process.exit(1);
    }
  } else if (payload) {
    try {
      reportData = JSON.parse(payload);
    } catch (err) {
      console.error('❌ Failed to parse --payload JSON:', err.message);
      process.exit(1);
    }
  } else {
    // Создаём минимальный отчёт
    reportData = createMinimalReport({
      title: title || 'Minimal Report',
      message: 'Отчёт создан автоматически через scripts/notion-report.mjs',
    });
  }

  // Форматируем отчёт в блоки Notion
  const blocks = formatReportAsBlocks(reportData);

  try {
    // Добавляем блоки на страницу
    await notionRequest(`/blocks/${targetPageId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children: blocks }),
    });
    console.log('✅ Report posted to Notion successfully');
    console.log(`   Page: ${targetPageId}`);
    console.log(`   Blocks: ${blocks.length}`);
  } catch (err) {
    console.error('❌ Failed to post report to Notion:', err.message);
    process.exit(1);
  }
}

main();
