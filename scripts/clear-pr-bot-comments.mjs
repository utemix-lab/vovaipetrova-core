#!/usr/bin/env node
/**
 * Clear PR Bot Comments: удаление старых комментариев ботов перед новой проверкой
 *
 * Удаляет старые комментарии от CI ботов (github-actions[bot]),
 * оставляет комментарии Cursor Bugbot (можно удалить только старые по времени).
 *
 * Использование:
 *   node scripts/clear-pr-bot-comments.mjs [--pr=<number>] [--dry-run] [--keep-bugbot]
 *
 * Примеры:
 *   node scripts/clear-pr-bot-comments.mjs --pr=145
 *   node scripts/clear-pr-bot-comments.mjs --pr=145 --dry-run
 *   node scripts/clear-pr-bot-comments.mjs --pr=145 --keep-bugbot  # не удалять Bugbot комментарии
 */

import { execSync } from 'child_process';

const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Авторы комментариев CI ботов (удаляем всегда)
const CI_BOT_AUTHORS = [
  'github-actions[bot]',
  'github-actions',
];

// Авторы комментариев Bugbot (удаляем только старые, если не указан --keep-bugbot)
const BUGBOT_AUTHORS = [
  'cursor[bot]',
  'cursor-bot',
  'cursor',
];

// Порог времени для определения "старых" комментариев Bugbot (в миллисекундах)
// По умолчанию: комментарии старше 1 часа считаются старыми
const OLD_COMMENT_THRESHOLD_MS = 60 * 60 * 1000; // 1 час

/**
 * Проверяет, является ли автор комментария CI ботом (удаляем всегда)
 */
function isCIBotAuthor(author) {
  if (!author) return false;
  const authorLower = author.toLowerCase();
  return CI_BOT_AUTHORS.some(bot => authorLower.includes(bot.toLowerCase())) ||
         (authorLower.includes('actions') && authorLower.includes('bot'));
}

/**
 * Проверяет, является ли автор комментария Bugbot
 */
function isBugbotAuthor(author) {
  if (!author) return false;
  const authorLower = author.toLowerCase();
  return BUGBOT_AUTHORS.some(bot => authorLower.includes(bot.toLowerCase()));
}

/**
 * Проверяет, является ли комментарий старым (для Bugbot)
 */
function isOldComment(createdAt, thresholdMs = OLD_COMMENT_THRESHOLD_MS) {
  if (!createdAt) return false;
  const commentTime = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - commentTime) > thresholdMs;
}

function log(message) {
  console.log(`[clear-bot-comments] ${message}`);
}

function parseArgs() {
  const args = {
    pr: null,
    dryRun: false,
    keepBugbot: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--pr=')) {
      args.pr = arg.split('=', 2)[1];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--keep-bugbot') {
      args.keepBugbot = true;
    }
  }

  return args;
}

/**
 * Получает список комментариев в PR через GitHub CLI
 */
function getPRComments(prNumber, keepBugbot = false) {
  try {
    const command = `gh pr view ${prNumber} --repo ${GITHUB_REPO} --json comments`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const data = JSON.parse(output || '{}');
    const comments = data.comments || [];

    // Фильтруем комментарии от ботов
    return comments.filter(comment => {
      const author = comment.author?.login || '';

      // Всегда удаляем CI ботов
      if (isCIBotAuthor(author)) {
        return true;
      }

      // Для Bugbot: удаляем только старые комментарии (если не указан --keep-bugbot)
      if (isBugbotAuthor(author)) {
        if (keepBugbot) {
          return false; // Не удаляем Bugbot комментарии
        }
        // Удаляем только старые комментарии Bugbot
        return isOldComment(comment.createdAt);
      }

      return false;
    }).map(comment => ({
      id: comment.id,
      author: comment.author?.login || '',
      body: comment.body,
      createdAt: comment.createdAt,
      isBugbot: isBugbotAuthor(comment.author?.login || ''),
      isOld: isOldComment(comment.createdAt)
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
function getReviewComments(prNumber, keepBugbot = false) {
  try {
    const command = `gh api repos/${GITHUB_REPO}/pulls/${prNumber}/comments`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const comments = JSON.parse(output || '[]');

    // Фильтруем комментарии от ботов
    return comments.filter(comment => {
      const user = comment.user?.login || '';

      // Всегда удаляем CI ботов
      if (isCIBotAuthor(user)) {
        return true;
      }

      // Для Bugbot: удаляем только старые комментарии (если не указан --keep-bugbot)
      if (isBugbotAuthor(user)) {
        if (keepBugbot) {
          return false; // Не удаляем Bugbot комментарии
        }
        // Удаляем только старые комментарии Bugbot
        return isOldComment(comment.created_at);
      }

      return false;
    }).map(comment => ({
      id: comment.id,
      user: comment.user?.login || '',
      body: comment.body,
      path: comment.path,
      createdAt: comment.created_at,
      isBugbot: isBugbotAuthor(comment.user?.login || ''),
      isOld: isOldComment(comment.created_at)
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
  const { pr, dryRun, keepBugbot } = args;

  if (!pr) {
    log('❌ Укажите номер PR: --pr=<number>');
    log('');
    log('Примеры:');
    log('  node scripts/clear-pr-bot-comments.mjs --pr=145');
    log('  node scripts/clear-pr-bot-comments.mjs --pr=145 --dry-run');
    log('  node scripts/clear-pr-bot-comments.mjs --pr=145 --keep-bugbot  # не удалять Bugbot комментарии');
    process.exit(1);
  }

  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN не установлен. Используется gh auth (если настроен).');
  }

  log(`Получение комментариев ботов для PR #${pr}...`);
  if (keepBugbot) {
    log('ℹ️  Режим --keep-bugbot: комментарии Cursor Bugbot не будут удалены.');
  } else {
    log('ℹ️  Старые комментарии Cursor Bugbot (старше 1 часа) будут удалены.');
  }

  const comments = getPRComments(pr, keepBugbot);
  const reviewComments = getReviewComments(pr, keepBugbot);

  const totalComments = comments.length + reviewComments.length;
  const ciComments = comments.filter(c => !c.isBugbot).length + reviewComments.filter(c => !c.isBugbot).length;
  const bugbotComments = comments.filter(c => c.isBugbot).length + reviewComments.filter(c => c.isBugbot).length;

  if (totalComments === 0) {
    log('✅ Нет комментариев от ботов для удаления.');
    return;
  }

  log(`Найдено ${comments.length} обычных комментариев и ${reviewComments.length} review comments от ботов.`);
  if (bugbotComments > 0) {
    log(`  - CI ботов: ${ciComments}`);
    log(`  - Cursor Bugbot (старые): ${bugbotComments}`);
  }

  if (dryRun) {
    log('\n[DRY-RUN] Следующие комментарии будут удалены:');
    comments.forEach((comment, index) => {
      const type = comment.isBugbot ? ' (Bugbot, старый)' : ' (CI bot)';
      log(`  ${index + 1}. Комментарий ${comment.id} от ${comment.author}${type}`);
      if (comment.createdAt) {
        log(`     Создан: ${comment.createdAt}`);
      }
    });
    reviewComments.forEach((comment, index) => {
      const type = comment.isBugbot ? ' (Bugbot, старый)' : ' (CI bot)';
      log(`  ${index + 1}. Review comment ${comment.id} от ${comment.user} (${comment.path})${type}`);
      if (comment.createdAt) {
        log(`     Создан: ${comment.createdAt}`);
      }
    });
    log('\nЗапустите без --dry-run для применения изменений.');
    return;
  }

  log('\n🗑️  Удаление комментариев...');

  comments.forEach(comment => {
    deleteComment(comment.id, dryRun);
  });

  reviewComments.forEach(comment => {
    deleteReviewComment(comment.id, dryRun);
  });

  log(`\n✅ Обработано ${totalComments} комментариев.`);
  if (bugbotComments > 0) {
    log(`   - Удалено ${ciComments} комментариев от CI ботов`);
    log(`   - Удалено ${bugbotComments} старых комментариев от Cursor Bugbot`);
  }
  log('Теперь можно перезапустить проверки CI, и боты оставят только актуальные комментарии.');
  log('Для перезапуска проверок используйте: npm run pr:rerun -- --pr=<номер>');
}

main().catch(error => {
  log(`❌ Ошибка: ${error.message}`);
  process.exit(1);
});

