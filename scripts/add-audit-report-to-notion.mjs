#!/usr/bin/env node
/**
 * Добавляет ссылку на weekly audit report в Notion Brief
 * 
 * Использование:
 *   node scripts/add-audit-report-to-notion.mjs --run-id <run_id> --repo <repo> --server-url <url>
 */

import { readFileSync } from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const GITHUB_RUN_ID = process.argv.find(arg => arg.startsWith('--run-id'))?.split('=')[1] || process.env.GITHUB_RUN_ID;
const GITHUB_REPOSITORY = process.argv.find(arg => arg.startsWith('--repo'))?.split('=')[1] || process.env.GITHUB_REPOSITORY;
const GITHUB_SERVER_URL = process.argv.find(arg => arg.startsWith('--server-url'))?.split('=')[1] || process.env.GITHUB_SERVER_URL || 'https://github.com';

if (!NOTION_TOKEN) {
  console.warn('⚠️  NOTION_TOKEN not set, skipping Notion update');
  process.exit(0);
}

if (!GITHUB_RUN_ID || !GITHUB_REPOSITORY) {
  console.error('❌ Missing required parameters: GITHUB_RUN_ID and GITHUB_REPOSITORY');
  process.exit(1);
}

const WORKFLOW_URL = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
const ARTIFACT_NAME = `weekly-audit-reports-${GITHUB_RUN_ID}`;
const ARTIFACT_URL = `${WORKFLOW_URL}#artifacts`;

// Формируем сообщение для Notion
const reportMessage = `📊 Weekly Audit Report готов

**Дата:** ${new Date().toISOString().split('T')[0]}
**Workflow Run:** ${GITHUB_RUN_ID}
**Артефакты:** [Скачать отчёты](${ARTIFACT_URL})

Отчёты:
- Link-map report
- KB-linter report  
- Stories-index report

[Просмотр workflow](${WORKFLOW_URL})`;

console.log('📝 Report message prepared:');
console.log(reportMessage);
console.log('');
console.log('ℹ️  Для добавления в Notion Brief используйте MCP сервер или Notion API');
console.log('ℹ️  Или вручную скопируйте ссылку в Brief:');
console.log(`   ${ARTIFACT_URL}`);

// TODO: Интеграция с Notion API через MCP или напрямую
// Пока просто выводим информацию для ручного копирования

process.exit(0);

