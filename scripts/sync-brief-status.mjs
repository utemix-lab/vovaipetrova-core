#!/usr/bin/env node
/**
 * Notion Brief Status Sync — синхронизация статусов Brief с GitHub PR
 * 
 * Обновляет статус Brief в Notion при создании или мерже PR:
 * - При создании PR: Status → "In progress", PR Link → ссылка на PR
 * - При мерже PR: Status → "Done"
 * 
 * Использование:
 *   node scripts/sync-brief-status.mjs --event=opened --pr-number=<number> --pr-title="..." --pr-url="..."
 *   node scripts/sync-brief-status.mjs --event=closed --pr-number=<number> --merged=<true|false>
 * 
 * Переменные окружения:
 *   NOTION_API_KEY - API ключ Notion (обязательно)
 *   GITHUB_REPO - репозиторий (по умолчанию: utemix-lab/vovaipetrova-core)
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
const GITHUB_REPO = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || 'utemix-lab/vovaipetrova-core';
const BRIEFS_DATABASE_ID = process.env.NOTION_BRIEFS_DATABASE_ID || '2276f855-67a3-4d86-b0ba-1b2a94e759cd';

if (!NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY not found in environment.');
  process.exit(1);
}

/**
 * Выполняет запрос к Notion API
 */
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
 * Ищет Brief в Notion по номеру PR или названию задачи
 */
async function findBriefByPR(prNumber, prTitle = null) {
  try {
    // Сначала ищем по PR Link (если уже есть ссылка на этот PR)
    const prUrl = `https://github.com/${GITHUB_REPO}/pull/${prNumber}`;
    
    console.log(`🔍 Searching for Brief with PR Link: ${prUrl}`);
    try {
      const searchByPR = await notionRequest(`/databases/${BRIEFS_DATABASE_ID}/query`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            property: 'PR Link',
            url: {
              contains: prUrl
            }
          }
        })
      });

      if (searchByPR.results && searchByPR.results.length > 0) {
        const brief = searchByPR.results[0];
        console.log(`✅ Found Brief by PR Link: ${brief.id}`);
        return brief;
      }
    } catch (err) {
      // Если фильтр по URL не работает, продолжаем поиск по названию
      console.warn(`⚠️  Could not search by PR Link: ${err.message}`);
    }

    // Если не нашли по PR Link, ищем по названию задачи
    if (prTitle) {
      // Очищаем название от префиксов типа "feat:", "fix:" и т.д.
      const cleanTitle = prTitle.replace(/^(feat|fix|chore|docs|style|refactor|test|perf|ci|build|revert):\s*/i, '').trim();
      // Берем первую часть до двоеточия или первые несколько слов
      const searchQuery = cleanTitle.split(':')[0].trim().split(/\s+/).slice(0, 5).join(' ');
      
      console.log(`🔍 Searching for Brief by title: "${searchQuery}"`);
      try {
        const searchByTitle = await notionRequest(`/databases/${BRIEFS_DATABASE_ID}/query`, {
          method: 'POST',
          body: JSON.stringify({
            filter: {
              property: 'Title',
              title: {
                contains: searchQuery
              }
            }
          })
        });

        if (searchByTitle.results && searchByTitle.results.length > 0) {
          // Берем первый результат (самый релевантный)
          const brief = searchByTitle.results[0];
          console.log(`✅ Found Brief by title: ${brief.id}`);
          return brief;
        }
      } catch (err) {
        console.warn(`⚠️  Could not search by title: ${err.message}`);
      }
    }

    console.warn(`⚠️  Brief not found for PR #${prNumber}`);
    return null;
  } catch (err) {
    console.error(`❌ Error searching for Brief: ${err.message}`);
    return null;
  }
}

/**
 * Обновляет статус Brief при создании PR
 */
async function updateBriefOnPRCreated(briefId, prNumber, prUrl) {
  try {
    console.log(`📝 Updating Brief ${briefId} status to "In progress"`);
    
    await notionRequest(`/pages/${briefId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          'Status': {
            select: {
              name: 'In progress'
            }
          },
          'PR Link': {
            url: prUrl
          }
        }
      })
    });

    console.log(`✅ Brief ${briefId} updated: Status → "In progress", PR Link → ${prUrl}`);
    return true;
  } catch (err) {
    console.error(`❌ Error updating Brief: ${err.message}`);
    return false;
  }
}

/**
 * Обновляет статус Brief при мерже PR
 */
async function updateBriefOnPRMerged(briefId) {
  try {
    console.log(`📝 Updating Brief ${briefId} status to "Done"`);
    
    await notionRequest(`/pages/${briefId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          'Status': {
            select: {
              name: 'Done'
            }
          }
        }
      })
    });

    console.log(`✅ Brief ${briefId} updated: Status → "Done"`);
    return true;
  } catch (err) {
    console.error(`❌ Error updating Brief: ${err.message}`);
    return false;
  }
}

/**
 * Парсит аргументы командной строки
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    event: null, // opened, closed
    prNumber: null,
    prTitle: null,
    prUrl: null,
    merged: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--event=')) {
      result.event = arg.split('=', 2)[1];
    } else if (arg.startsWith('--pr-number=')) {
      result.prNumber = parseInt(arg.split('=', 2)[1]);
    } else if (arg.startsWith('--pr-title=')) {
      result.prTitle = arg.split('=', 2)[1];
    } else if (arg.startsWith('--pr-url=')) {
      result.prUrl = arg.split('=', 2)[1];
    } else if (arg.startsWith('--merged=')) {
      result.merged = arg.split('=', 2)[1] === 'true';
    } else if (arg === '--event' && i + 1 < args.length) {
      result.event = args[++i];
    } else if (arg === '--pr-number' && i + 1 < args.length) {
      result.prNumber = parseInt(args[++i]);
    } else if (arg === '--pr-title' && i + 1 < args.length) {
      result.prTitle = args[++i];
    } else if (arg === '--pr-url' && i + 1 < args.length) {
      result.prUrl = args[++i];
    } else if (arg === '--merged' && i + 1 < args.length) {
      result.merged = args[++i] === 'true';
    }
  }

  return result;
}

/**
 * Главная функция
 */
async function main() {
  const args = parseArgs();

  if (!args.event) {
    console.error('❌ --event is required (opened or closed)');
    process.exit(1);
  }

  if (!args.prNumber) {
    console.error('❌ --pr-number is required');
    process.exit(1);
  }

  if (args.event === 'opened') {
    // Создание PR
    if (!args.prUrl) {
      args.prUrl = `https://github.com/${GITHUB_REPO}/pull/${args.prNumber}`;
    }

    console.log(`🔄 Syncing Brief status for PR #${args.prNumber} (opened)`);
    const brief = await findBriefByPR(args.prNumber, args.prTitle);

    if (!brief) {
      console.warn(`⚠️  Brief not found, skipping sync`);
      process.exit(0);
    }

    const success = await updateBriefOnPRCreated(brief.id, args.prNumber, args.prUrl);
    process.exit(success ? 0 : 1);
  } else if (args.event === 'closed') {
    // Закрытие/мерж PR
    if (!args.merged) {
      console.log(`ℹ️  PR #${args.prNumber} was closed without merge, skipping sync`);
      process.exit(0);
    }

    console.log(`🔄 Syncing Brief status for PR #${args.prNumber} (merged)`);
    const brief = await findBriefByPR(args.prNumber, args.prTitle);

    if (!brief) {
      console.warn(`⚠️  Brief not found, skipping sync`);
      process.exit(0);
    }

    const success = await updateBriefOnPRMerged(brief.id);
    process.exit(success ? 0 : 1);
  } else {
    console.error(`❌ Unknown event: ${args.event} (expected: opened or closed)`);
    process.exit(1);
  }
}

main();
