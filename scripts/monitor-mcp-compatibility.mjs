#!/usr/bin/env node
/**
 * Мониторинг GitHub Issues для отслеживания совместимости MCP с Notion API 2025-09-03
 * 
 * Использование:
 *   node scripts/monitor-mcp-compatibility.mjs
 * 
 * Требует GITHUB_TOKEN в переменных окружения
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка переменных окружения
function loadEnv() {
  try {
    const envPath = join(__dirname, '../.env');
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
    // .env не обязателен
  }
}

loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN не установлен. Установите в .env или переменных окружения.');
  process.exit(1);
}

/**
 * Поиск issues в репозитории
 */
async function searchIssues(owner, repo, query) {
  const url = `${GITHUB_API_BASE}/search/issues?q=repo:${owner}/${repo}+${encodeURIComponent(query)}+is:issue+is:open`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Получить последние issues репозитория
 */
async function getRecentIssues(owner, repo, labels = []) {
  const labelsQuery = labels.length > 0 ? `+label:${labels.join('+label:')}` : '';
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&sort=updated&direction=desc&per_page=20${labelsQuery ? `&labels=${labels.join(',')}` : ''}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Репозитории для мониторинга
 */
const REPOSITORIES = [
  {
    name: 'Model Context Protocol Servers',
    owner: 'modelcontextprotocol',
    repo: 'servers',
    searchTerms: ['notion', '2025-09-03', 'api-version', 'compatibility'],
    enabled: true,
  },
  // Примечание: некоторые репозитории могут быть приватными или не существовать
  // Добавьте их вручную, если они доступны
];

/**
 * Основная функция мониторинга
 */
async function monitorCompatibility() {
  console.log('🔍 Мониторинг совместимости MCP с Notion API 2025-09-03\n');
  console.log('=' .repeat(60));

  const allIssues = [];

  for (const repo of REPOSITORIES) {
    if (repo.enabled === false) {
      console.log(`\n📦 ${repo.name} (${repo.owner}/${repo.repo}) - пропущен`);
      continue;
    }

    console.log(`\n📦 ${repo.name} (${repo.owner}/${repo.repo})`);
    console.log('-'.repeat(60));

    try {
      // Поиск по ключевым словам
      for (const term of repo.searchTerms) {
        try {
          const searchQuery = `notion ${term} 2025-09-03 OR "data_source_id" OR "multi-source"`;
          const results = await searchIssues(repo.owner, repo.repo, searchQuery);
          
          if (results.items && results.items.length > 0) {
            console.log(`\n  🔎 Найдено по запросу "${term}": ${results.items.length}`);
            results.items.forEach(issue => {
              const isNew = !allIssues.find(i => i.id === issue.id);
              if (isNew) {
                allIssues.push({
                  ...issue,
                  repository: `${repo.owner}/${repo.repo}`,
                  repoName: repo.name,
                });
              }
            });
          }
        } catch (searchError) {
          // Игнорируем ошибки поиска для отдельных терминов
          if (!searchError.message.includes('422')) {
            console.warn(`  ⚠️  Ошибка поиска по "${term}": ${searchError.message}`);
          }
        }
      }

      // Получение последних issues
      try {
        const recentIssues = await getRecentIssues(repo.owner, repo.repo);
        const notionRelated = recentIssues.filter(issue => {
          const title = (issue.title || '').toLowerCase();
          const body = (issue.body || '').toLowerCase();
          return title.includes('notion') || 
                 body.includes('notion') ||
                 body.includes('2025-09-03') ||
                 body.includes('data_source_id') ||
                 body.includes('multi-source');
        });

        if (notionRelated.length > 0) {
          console.log(`\n  📋 Последние issues, связанные с Notion: ${notionRelated.length}`);
          notionRelated.slice(0, 5).forEach(issue => {
            const isNew = !allIssues.find(i => i.id === issue.id);
            if (isNew) {
              allIssues.push({
                ...issue,
                repository: `${repo.owner}/${repo.repo}`,
                repoName: repo.name,
              });
            }
          });
        } else {
          console.log(`\n  ℹ️  Не найдено issues, связанных с Notion API 2025-09-03`);
        }
      } catch (recentError) {
        if (recentError.message.includes('404')) {
          console.log(`\n  ⚠️  Репозиторий не найден или недоступен`);
        } else {
          console.warn(`  ⚠️  Ошибка при получении последних issues: ${recentError.message}`);
        }
      }

    } catch (error) {
      if (error.message.includes('404')) {
        console.log(`\n  ⚠️  Репозиторий не найден или недоступен`);
      } else if (error.message.includes('422')) {
        console.log(`\n  ⚠️  Репозиторий недоступен для поиска (возможно, приватный)`);
      } else {
        console.error(`  ❌ Ошибка при проверке ${repo.name}:`, error.message);
      }
      // Продолжаем проверку других репозиториев
    }
  }

  // Вывод результатов
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ');
  console.log('='.repeat(60));

  if (allIssues.length === 0) {
    console.log('\n✅ Не найдено открытых issues, связанных с совместимостью Notion API');
  } else {
    console.log(`\n📌 Найдено ${allIssues.length} issues:\n`);

    // Группировка по репозиториям
    const byRepo = {};
    allIssues.forEach(issue => {
      if (!byRepo[issue.repository]) {
        byRepo[issue.repository] = [];
      }
      byRepo[issue.repository].push(issue);
    });

    for (const [repo, issues] of Object.entries(byRepo)) {
      console.log(`\n📦 ${repo} (${issues.length} issues)`);
      console.log('-'.repeat(60));
      
      issues.forEach(issue => {
        const date = new Date(issue.updated_at).toLocaleDateString('ru-RU');
        console.log(`\n  🔗 #${issue.number}: ${issue.title}`);
        console.log(`     URL: ${issue.html_url}`);
        console.log(`     Обновлено: ${date}`);
        if (issue.labels && issue.labels.length > 0) {
          const labels = issue.labels.map(l => l.name).join(', ');
          console.log(`     Метки: ${labels}`);
        }
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('💡 Рекомендации:');
  console.log('   - Проверяйте эти issues еженедельно');
  console.log('   - Отслеживайте релизы репозиториев');
  console.log('   - Используйте прямые API запросы до исправления MCP');
  console.log('='.repeat(60));
}

// Запуск
try {
  await monitorCompatibility();
} catch (error) {
  console.error('❌ Ошибка мониторинга:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}

