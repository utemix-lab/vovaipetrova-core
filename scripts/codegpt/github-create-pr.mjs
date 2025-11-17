#!/usr/bin/env node
/**
 * Создать Pull Request через GitHub API
 * Использование: node scripts/codegpt/github-create-pr.mjs <title> <body> <head> [base]
 */

import { createPR } from './github-api.mjs';

const [title, body, head, base = 'main'] = process.argv.slice(2);

if (!title || !body || !head) {
  console.error('Использование: node github-create-pr.mjs <title> <body> <head> [base]');
  process.exit(1);
}

try {
  const pr = await createPR(title, body, head, base);
  console.log(`✅ PR создан: ${pr.html_url}`);
  console.log(`Номер: ${pr.number}`);
  console.log(JSON.stringify(pr, null, 2));
} catch (error) {
  console.error('❌ Ошибка создания PR:', error.message);
  process.exit(1);
}

