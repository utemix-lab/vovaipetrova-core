#!/usr/bin/env node
/**
 * Clear PR Bot Comments: удаление старых комментариев ботов перед новой проверкой
 *
 * Удаляет комментарии от ботов (GitHub Actions, Cursor Bot) в PR,
 * чтобы при следующей проверке остались только актуальные комментарии.
 *
 * Использование:
 *   node scripts/clear-pr-bot-comments.mjs [--pr=<number>] [--dry-run]
 *
 * Примеры:
 *   node scripts/clear-pr-bot-comments.mjs --pr=145
 *   node scripts/clear-pr-bot-comments.mjs --pr=145 --dry-run
 */

import { execSync } from 'child_process';

const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Авторы комментариев, которые нужно удалить (боты)
const BOT_AUTHORS = [
  'github-actions[bot]',
  'cursor-bot',
  'cursor[bot]',
  'github-actions',
];

function log(message) {
  console.log(`[clear-bot-comments] ${message}`);
}

function parseArgs() {
  const args = {
    pr: null,
    dryRun: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--pr=')) {
      args.pr = arg.split('=', 2)[1];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

/**
 * Получает список комментариев в PR через GitHub CLI
 */
function getPRComments(prNumber) {
  try {
    const command = `gh pr view ${prNumber} --repo ${GITHUB_REPO} --json comments`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const data = JSON.parse(output || '{}');
    const comments = data.comments || [];
    // Фильтруем комментарии от ботов в JavaScript
    return comments.filter(comment => {
      const author = comment.author?.login || '';
      return /bot|actions/i.test(author);
    }).map(comment => ({
      id: comment.id,
      author: comment.author?.login || '',
      body: comment.body,
      createdAt: comment.createdAt
    }));
  } catch (error) {
    log(`⚠️  Не удалось получить комментарии: ${error.message}`);
    return [];
  }
}

/**
 * Удаляет комментарий через GitHub API
 */
function deleteComment(commentId, dryRun) {
  if (dryRun) {
    log(`[DRY-RUN] Удалить комментарий ${commentId}`);
    return;
  }

  try {
    const command = `gh api repos/${GITHUB_REPO}/issues/comments/${commentId} -X DELETE`;
    execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ Комментарий ${commentId} удален`);
  } catch (error) {
    log(`⚠️  Не удалось удалить комментарий ${commentId}: ${error.message}`);
  }
}

/**
 * Получает review comments (комментарии в коде) через GitHub API
 */
function getReviewComments(prNumber) {
  try {
    const command = `gh api repos/${GITHUB_REPO}/pulls/${prNumber}/comments`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const comments = JSON.parse(output || '[]');
    // Фильтруем комментарии от ботов в JavaScript
    return comments.filter(comment => {
      const user = comment.user?.login || '';
      return /bot|actions/i.test(user);
    }).map(comment => ({
      id: comment.id,
      user: comment.user?.login || '',
      body: comment.body,
      path: comment.path
    }));
  } catch (error) {
    log(`⚠️  Не удалось получить review comments: ${error.message}`);
    return [];
  }
}

/**
 * Удаляет review comment (комментарий в коде)
 */
function deleteReviewComment(commentId, dryRun) {
  if (dryRun) {
    log(`[DRY-RUN] Удалить review comment ${commentId}`);
    return;
  }

  try {
    const command = `gh api repos/${GITHUB_REPO}/pulls/comments/${commentId} -X DELETE`;
    execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ Review comment ${commentId} удален`);
  } catch (error) {
    log(`⚠️  Не удалось удалить review comment ${commentId}: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs();
  const { pr, dryRun } = args;

  if (!pr) {
    log('❌ Укажите номер PR: --pr=<number>');
    process.exit(1);
  }

  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN не установлен. Используется gh auth (если настроен).');
  }

  log(`Получение комментариев ботов для PR #${pr}...`);
  
  const comments = getPRComments(pr);
  const reviewComments = getReviewComments(pr);

  const totalComments = comments.length + reviewComments.length;

  if (totalComments === 0) {
    log('Нет комментариев от ботов для удаления.');
    return;
  }

  log(`Найдено ${comments.length} обычных комментариев и ${reviewComments.length} review comments от ботов.`);

  if (dryRun) {
    log('\n[DRY-RUN] Следующие комментарии будут удалены:');
    comments.forEach((comment, index) => {
      log(`  ${index + 1}. Комментарий ${comment.id} от ${comment.author}`);
    });
    reviewComments.forEach((comment, index) => {
      log(`  ${index + 1}. Review comment ${comment.id} от ${comment.user} (${comment.path})`);
    });
    log('\nЗапустите без --dry-run для применения изменений.');
    return;
  }

  log('\nУдаление комментариев...');
  
  comments.forEach(comment => {
    deleteComment(comment.id, dryRun);
  });

  reviewComments.forEach(comment => {
    deleteReviewComment(comment.id, dryRun);
  });

  log(`\n✅ Обработано ${totalComments} комментариев.`);
  log('Теперь можно перезапустить проверки CI, и боты оставят только актуальные комментарии.');
  log('Для перезапуска проверок: создайте пустой коммит или обновите PR.');
}

main().catch(error => {
  log(`❌ Ошибка: ${error.message}`);
  process.exit(1);
});

