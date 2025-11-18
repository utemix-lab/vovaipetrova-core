#!/usr/bin/env node
/**
 * Проверяет регресс ссылок и добавляет комментарий/лейбл в PR
 * Использование: node scripts/check-link-regression.mjs <pr-number>
 */

import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STATS_JSON = join(__dirname, '../prototype/data/stats.json');
const BROKEN_LINKS_JSON = join(__dirname, '../prototype/data/broken-links.json');

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
    return env;
  } catch (err) {
    return {};
  }
}

function checkRegression() {
  const prNumber = process.env.GITHUB_PR_NUMBER || process.argv[2];
  const repo = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
  
  if (!prNumber) {
    console.log('Использование: node scripts/check-link-regression.mjs <pr-number>');
    console.log('Или в CI: используйте переменную GITHUB_PR_NUMBER');
    process.exit(0);
  }

  // Читаем статистику
  let stats, brokenLinks;
  try {
    if (existsSync(STATS_JSON)) {
      stats = JSON.parse(readFileSync(STATS_JSON, 'utf8'));
    }
    if (existsSync(BROKEN_LINKS_JSON)) {
      brokenLinks = JSON.parse(readFileSync(BROKEN_LINKS_JSON, 'utf8'));
    }
  } catch (error) {
    console.error('⚠️  Failed to read diagnostics files:', error.message);
    process.exit(1);
  }

  // Определяем количество internal-missing
  let internalMissing = 0;
  if (stats?.totals?.issues_internal_missing !== undefined) {
    internalMissing = stats.totals.issues_internal_missing;
  } else if (brokenLinks?.issues) {
    internalMissing = brokenLinks.issues.filter(
      i => i.reason === 'missing' && !i.link.startsWith('http')
    ).length;
  }

  if (internalMissing === 0) {
    console.log('✅ No internal-missing issues detected');
    // Убираем label, если он был добавлен ранее
    try {
      execSync(`gh pr edit ${prNumber} --repo ${repo} --remove-label link-issues 2>&1`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
    } catch (e) {
      // Игнорируем ошибки (label может не существовать)
    }
    process.exit(0);
  }

  // Есть регресс - добавляем комментарий и label
  console.log(`⚠️  Detected ${internalMissing} internal-missing issues`);
  
  const env = loadEnv();
  const token = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
  
  if (!token) {
    console.warn('⚠️  GITHUB_TOKEN not found, skipping comment and label');
    process.exit(0);
  }

  // Формируем детальный список проблемных ссылок
  const internalIssues = brokenLinks?.issues
    ?.filter(i => i.reason === 'missing' && !i.link.startsWith('http')) || [];
  
  // Группируем по файлам для лучшей читаемости
  const issuesByFile = {};
  internalIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue.link);
  });

  const issuesList = Object.entries(issuesByFile)
    .slice(0, 10)
    .map(([file, links]) => {
      const linksList = links.slice(0, 3).map(link => `  - \`${link}\``).join('\n');
      const moreLinks = links.length > 3 ? `\n  - _... and ${links.length - 3} more_` : '';
      return `- **\`${file}\`**:\n${linksList}${moreLinks}`;
    })
    .join('\n\n') || '';

  const totalFiles = Object.keys(issuesByFile).length;
  const hasMore = totalFiles > 10;

  const comment = [
    '## ⚠️ Link Regression Detected',
    '',
    `Found **${internalMissing}** internal-missing link(s) across **${totalFiles}** file(s).`,
    '',
    '### Affected files:',
    issuesList.length > 0 ? issuesList : '- No details available',
    hasMore ? `\n_... and ${totalFiles - 10} more file(s)_` : '',
    '',
    '**Action required:** Please fix broken links before merging.',
    '',
    `_Generated at ${new Date().toISOString()}_`
  ].join('\n');

  // Добавляем комментарий (используем файл для избежания проблем с экранированием)
  try {
    const tmpFile = join(__dirname, '../tmp-pr-comment.txt');
    writeFileSync(tmpFile, comment, 'utf8');
    
    execSync(
      `gh pr comment ${prNumber} --repo ${repo} --body-file "${tmpFile}"`,
      {
        stdio: 'inherit',
        encoding: 'utf-8',
        env: { ...process.env, GITHUB_TOKEN: token }
      }
    );
    console.log('✅ Comment added to PR');
    
    // Удаляем временный файл
    try {
      unlinkSync(tmpFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
  } catch (error) {
    console.error('⚠️  Failed to add comment:', error.message);
    // Не выходим с ошибкой, чтобы не блокировать CI
  }

  // Добавляем label
  try {
    execSync(
      `gh pr edit ${prNumber} --repo ${repo} --add-label link-issues`,
      {
        stdio: 'inherit',
        encoding: 'utf-8',
        env: { ...process.env, GITHUB_TOKEN: token }
      }
    );
    console.log('✅ Label "link-issues" added to PR');
  } catch (error) {
    console.warn('⚠️  Failed to add label (may not exist):', error.message);
    console.log('💡 Create label "link-issues" in repository settings if needed');
  }

  process.exit(0);
}

checkRegression();

