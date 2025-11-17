#!/usr/bin/env node
/**
 * GitHub API Helper для CodeGPT
 * Базовые функции для работы с GitHub API
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const GITHUB_API_BASE = 'https://api.github.com';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN не установлен. Установите в .env или переменных окружения.');
  process.exit(1);
}

/**
 * Базовый запрос к GitHub API
 */
async function githubRequest(endpoint, options = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Создать Pull Request
 */
export async function createPR(title, body, head, base = 'main') {
  const [owner, repo] = GITHUB_REPO.split('/');
  return githubRequest(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      head,
      base,
    }),
  });
}

/**
 * Обновить Pull Request
 */
export async function updatePR(prNumber, updates) {
  const [owner, repo] = GITHUB_REPO.split('/');
  return githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Получить список Pull Requests
 */
export async function listPRs(state = 'open', base = 'main') {
  const [owner, repo] = GITHUB_REPO.split('/');
  const params = new URLSearchParams({ state, base });
  return githubRequest(`/repos/${owner}/${repo}/pulls?${params}`);
}

/**
 * Получить информацию о PR
 */
export async function getPR(prNumber) {
  const [owner, repo] = GITHUB_REPO.split('/');
  return githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`);
}

/**
 * Получить Issue
 */
export async function getIssue(issueNumber) {
  const [owner, repo] = GITHUB_REPO.split('/');
  return githubRequest(`/repos/${owner}/${repo}/issues/${issueNumber}`);
}

/**
 * Создать Issue
 */
export async function createIssue(title, body, labels = []) {
  const [owner, repo] = GITHUB_REPO.split('/');
  return githubRequest(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  });
}

// CLI интерфейс
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'list-prs':
        const prs = await listPRs();
        console.log(JSON.stringify(prs, null, 2));
        break;
      case 'get-pr':
        const pr = await getPR(args[0]);
        console.log(JSON.stringify(pr, null, 2));
        break;
      case 'get-issue':
        const issue = await getIssue(args[0]);
        console.log(JSON.stringify(issue, null, 2));
        break;
      default:
        console.log('Использование:');
        console.log('  node github-api.mjs list-prs');
        console.log('  node github-api.mjs get-pr <number>');
        console.log('  node github-api.mjs get-issue <number>');
    }
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

