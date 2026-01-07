#!/usr/bin/env node
/**
 * CI Re-run Helper v2: улучшенный перезапуск PR с расширенными возможностями
 *
 * Улучшения v2:
 * - Фильтрация по workflow/job
 * - Перезапуск конкретных jobs
 * - Перезапуск только failed jobs
 * - Улучшенная обработка ошибок
 * - Детальная информация о статусах
 *
 * Использование:
 *   node scripts/pr-rerun-v2.mjs [--pr=<number>] [--workflow=<name>] [--job=<name>] [--failed-only] [--dry-run] [--skip-clear]
 *
 * Примеры:
 *   node scripts/pr-rerun-v2.mjs --pr=145
 *   node scripts/pr-rerun-v2.mjs --pr=145 --workflow="Docs CI"
 *   node scripts/pr-rerun-v2.mjs --pr=145 --failed-only
 *   node scripts/pr-rerun-v2.mjs --pr=145 --job="lint-and-links-fast"
 *   node scripts/pr-rerun-v2.mjs --pr=145 --dry-run
 *   node scripts/pr-rerun-v2.mjs --pr=145 --skip-clear
 *
 * Или через npm:
 *   npm run pr:rerun:v2 -- --pr=145
 */

import { execSync } from 'child_process';

const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Авторы комментариев, которые нужно удалить (только CI боты)
const CI_BOT_AUTHORS = [
  'github-actions[bot]',
  'github-actions',
];

// Авторы комментариев, которые НЕ удаляем (оставляем)
const KEEP_AUTHORS = [
  'cursor[bot]',
  'cursor-bot',
  'cursor',
];

/**
 * Проверяет, является ли автор комментария CI ботом (которого нужно удалить)
 */
function isCIBotAuthor(author) {
  if (!author) return false;
  const authorLower = author.toLowerCase();
  
  // Не удаляем Cursor Bugbot
  if (KEEP_AUTHORS.some(keep => authorLower.includes(keep.toLowerCase()))) {
    return false;
  }
  
  // Удаляем только CI ботов
  return CI_BOT_AUTHORS.some(bot => authorLower.includes(bot.toLowerCase())) ||
         (authorLower.includes('actions') && authorLower.includes('bot'));
}

function log(message) {
  console.log(`[pr-rerun-v2] ${message}`);
}

function parseArgs() {
  const args = {
    pr: null,
    workflow: null,
    job: null,
    failedOnly: false,
    dryRun: false,
    skipClear: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--pr=')) {
      args.pr = arg.split('=', 2)[1];
    } else if (arg.startsWith('--workflow=')) {
      args.workflow = arg.split('=', 2)[1];
    } else if (arg.startsWith('--job=')) {
      args.job = arg.split('=', 2)[1];
    } else if (arg === '--failed-only') {
      args.failedOnly = true;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--skip-clear') {
      args.skipClear = true;
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
    
    // Фильтруем только CI комментарии (не Cursor Bugbot)
    return comments.filter(comment => {
      const author = comment.author?.login || '';
      return isCIBotAuthor(author);
    }).map(comment => ({
      id: comment.id,
      author: comment.author?.login || '',
      body: comment.body?.substring(0, 100) || '',
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
 * Получает список workflow runs для PR с детальной информацией
 */
function getWorkflowRuns(prNumber, workflowFilter = null) {
  try {
    const prInfo = execSync(
      `gh pr view ${prNumber} --repo ${GITHUB_REPO} --json headRefName,headRepository`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    const prData = JSON.parse(prInfo);
    const branch = prData.headRefName;
    
    // Получаем последние workflow runs для ветки
    let runsCommand = `gh run list --branch ${branch} --repo ${GITHUB_REPO} --json databaseId,status,conclusion,workflowName,displayTitle --limit 20`;
    if (workflowFilter) {
      runsCommand += ` --workflow="${workflowFilter}"`;
    }
    
    const runsOutput = execSync(runsCommand, { encoding: 'utf8', stdio: 'pipe' });
    const runs = JSON.parse(runsOutput || '[]');
    
    return runs.filter(run => 
      run.status === 'completed' || run.status === 'in_progress' || run.status === 'queued'
    );
  } catch (error) {
    log(`⚠️  Не удалось получить список workflow runs: ${error.message}`);
    return [];
  }
}

/**
 * Получает детальную информацию о jobs для workflow run
 */
function getWorkflowJobs(runId) {
  try {
    const command = `gh api repos/${GITHUB_REPO}/actions/runs/${runId}/jobs --jq '.jobs[] | {id: .id, name: .name, status: .status, conclusion: .conclusion, started_at: .started_at, completed_at: .completed_at}'`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const jobs = output.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    return jobs;
  } catch (error) {
    log(`⚠️  Не удалось получить jobs для run ${runId}: ${error.message}`);
    return [];
  }
}

/**
 * Перезапускает конкретный job
 */
function rerunJob(jobId, jobName, dryRun) {
  if (dryRun) {
    log(`[DRY-RUN] Перезапустить job ${jobId} (${jobName})`);
    return true;
  }

  try {
    const command = `gh api repos/${GITHUB_REPO}/actions/jobs/${jobId}/rerun -X POST`;
    execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ Перезапущен job ${jobId} (${jobName})`);
    return true;
  } catch (error) {
    log(`⚠️  Не удалось перезапустить job ${jobId}: ${error.message}`);
    return false;
  }
}

/**
 * Перезапускает CI проверки для PR с расширенными опциями
 */
function rerunCI(prNumber, options, dryRun) {
  const { workflow, job, failedOnly } = options;
  
  if (dryRun) {
    log(`[DRY-RUN] Перезапустить CI проверки для PR #${prNumber}`);
    if (workflow) log(`   Workflow filter: ${workflow}`);
    if (job) log(`   Job filter: ${job}`);
    if (failedOnly) log(`   Failed jobs only: true`);
    return;
  }

  try {
    // Получаем информацию о PR
    const prInfo = execSync(
      `gh pr view ${prNumber} --repo ${GITHUB_REPO} --json headRefName,headRepository`,
      { encoding: 'utf8', stdio: 'pipe' }
    );
    const prData = JSON.parse(prInfo);
    const branch = prData.headRefName;

    log(`Перезапуск CI проверок для ветки ${branch}...`);
    if (workflow) log(`   Workflow filter: ${workflow}`);
    if (job) log(`   Job filter: ${job}`);
    if (failedOnly) log(`   Failed jobs only: true`);
    log('');
    
    // Получаем список workflow runs
    const runs = getWorkflowRuns(prNumber, workflow);
    
    if (runs.length === 0) {
      log(`⚠️  Не найдено workflow runs для перезапуска.`);
      if (workflow) {
        log(`   Возможно, workflow "${workflow}" не найден или не запускался для этой ветки.`);
      }
      log(`   Попробуйте создать пустой коммит для триггера CI:`);
      log(`   git commit --allow-empty -m "chore: trigger CI re-run"`);
      log(`   git push`);
      return;
    }
    
    log(`Найдено ${runs.length} workflow run(s):`);
    runs.forEach(run => {
      log(`   - ${run.workflowName} (${run.databaseId}): ${run.status} / ${run.conclusion || 'N/A'}`);
    });
    log('');
    
    let rerunCount = 0;
    
    // Если указан конкретный job, перезапускаем только его
    if (job) {
      log(`🔍 Поиск job "${job}"...`);
      for (const run of runs) {
        const jobs = getWorkflowJobs(run.databaseId);
        const targetJob = jobs.find(j => j.name === job);
        
        if (targetJob) {
          log(`   Найден job "${job}" в workflow run ${run.databaseId}`);
          if (rerunJob(targetJob.id, targetJob.name, dryRun)) {
            rerunCount++;
          }
        }
      }
      
      if (rerunCount === 0) {
        log(`⚠️  Job "${job}" не найден в доступных workflow runs.`);
      }
    } else if (failedOnly) {
      // Перезапускаем только failed jobs
      log(`🔍 Поиск failed jobs...`);
      for (const run of runs) {
        const jobs = getWorkflowJobs(run.databaseId);
        const failedJobs = jobs.filter(j => j.conclusion === 'failure' || j.conclusion === 'cancelled');
        
        if (failedJobs.length > 0) {
          log(`   Найдено ${failedJobs.length} failed job(s) в workflow run ${run.databaseId}:`);
          failedJobs.forEach(j => {
            log(`     - ${j.name} (${j.conclusion})`);
          });
          
          for (const failedJob of failedJobs) {
            if (rerunJob(failedJob.id, failedJob.name, dryRun)) {
              rerunCount++;
            }
          }
        }
      }
      
      if (rerunCount === 0) {
        log(`⚠️  Не найдено failed jobs для перезапуска.`);
      }
    } else {
      // Перезапускаем весь workflow run
      log(`🔄 Перезапуск workflow runs...`);
      for (const run of runs) {
        try {
          const rerunCommand = `gh run rerun ${run.databaseId} --repo ${GITHUB_REPO}`;
          execSync(rerunCommand, { encoding: 'utf8', stdio: 'pipe' });
          log(`✅ Перезапущен workflow run ${run.databaseId} (${run.workflowName})`);
          rerunCount++;
        } catch (error) {
          log(`⚠️  Не удалось перезапустить run ${run.databaseId}: ${error.message}`);
        }
      }
    }
    
    log('');
    if (rerunCount > 0) {
      log(`✅ Перезапущено ${rerunCount} ${job ? 'job(s)' : 'workflow run(s)'}`);
    } else {
      log(`⚠️  Не удалось перезапустить ни одного ${job ? 'job' : 'workflow run'}.`);
      log(`   Попробуйте создать пустой коммит для триггера CI:`);
      log(`   git commit --allow-empty -m "chore: trigger CI re-run"`);
      log(`   git push`);
    }
    
  } catch (error) {
    log(`⚠️  Не удалось перезапустить CI: ${error.message}`);
    log(`   Попробуйте создать пустой коммит для триггера CI:`);
    log(`   git commit --allow-empty -m "chore: trigger CI re-run"`);
    log(`   git push`);
  }
}

/**
 * Основная функция
 */
async function main() {
  const args = parseArgs();
  const { pr, workflow, job, failedOnly, dryRun, skipClear } = args;

  if (!pr) {
    log('❌ Укажите номер PR: --pr=<number>');
    log('');
    log('Примеры:');
    log('  node scripts/pr-rerun-v2.mjs --pr=145');
    log('  node scripts/pr-rerun-v2.mjs --pr=145 --workflow="Docs CI"');
    log('  node scripts/pr-rerun-v2.mjs --pr=145 --failed-only');
    log('  node scripts/pr-rerun-v2.mjs --pr=145 --job="lint-and-links-fast"');
    log('  node scripts/pr-rerun-v2.mjs --pr=145 --dry-run');
    log('  node scripts/pr-rerun-v2.mjs --pr=145 --skip-clear');
    log('');
    log('Или через npm:');
    log('  npm run pr:rerun:v2 -- --pr=145');
    process.exit(1);
  }

  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN не установлен. Используется gh auth (если настроен).');
  }

  log(`🔄 Перезапуск PR #${pr} (v2)`);
  if (workflow) log(`   Workflow: ${workflow}`);
  if (job) log(`   Job: ${job}`);
  if (failedOnly) log(`   Failed jobs only: true`);
  log('');

  // Шаг 1: Очистка старых CI комментариев
  if (!skipClear) {
    log('📋 Шаг 1: Получение комментариев CI ботов...');
    
    const comments = getPRComments(pr);
    
    if (comments.length === 0) {
      log('✅ Нет старых CI комментариев для удаления.');
    } else {
      log(`Найдено ${comments.length} комментариев от CI ботов (github-actions[bot]).`);
      log('Комментарии Cursor Bugbot будут сохранены.');
      
      if (dryRun) {
        log('\n[DRY-RUN] Следующие комментарии будут удалены:');
        comments.forEach((comment, index) => {
          log(`  ${index + 1}. Комментарий ${comment.id} от ${comment.author}`);
          log(`     Создан: ${comment.createdAt}`);
          log(`     Предпросмотр: ${comment.body}...`);
        });
        log('\nЗапустите без --dry-run для применения изменений.');
      } else {
        log('\n🗑️  Удаление старых CI комментариев...');
        comments.forEach(comment => {
          deleteComment(comment.id, dryRun);
        });
        log(`✅ Удалено ${comments.length} комментариев.`);
      }
    }
  } else {
    log('⏭️  Пропуск очистки комментариев (--skip-clear)');
  }

  // Шаг 2: Перезапуск CI
  log('');
  log('🔄 Шаг 2: Перезапуск CI проверок...');
  
  if (!dryRun && !skipClear) {
    log('⏳ Подождите несколько секунд перед перезапуском CI...');
    // Небольшая задержка, чтобы GitHub успел обработать удаление комментариев
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  rerunCI(pr, { workflow, job, failedOnly }, dryRun);

  log('');
  log('✅ Готово!');
  log('');
  log('📝 Следующие шаги:');
  log('   1. Дождитесь завершения CI проверок');
  log('   2. Проверяющий сообщит: "Проверка ботами прошла, прочти комментарии, исправь ошибки."');
  log('   3. Прочитайте новые комментарии ботов и исправьте ошибки');
  log('');
  log('💡 Для ручного перезапуска CI используйте:');
  log('   - GitHub UI: Actions → выберите workflow → Re-run');
  log('   - Или создайте пустой коммит: git commit --allow-empty -m "chore: trigger CI" && git push');
}

main().catch(error => {
  log(`❌ Ошибка: ${error.message}`);
  process.exit(1);
});

