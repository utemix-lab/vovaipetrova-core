#!/usr/bin/env node
/**
 * Проверка политики "один PR на lane"
 * 
 * Проверяет, есть ли уже открытый PR с тем же label lane:*
 * Использование: node scripts/check-lanes.mjs <pr-number> <lane-label>
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения из .env
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return env;
  } catch (error) {
    // .env не обязателен, используем переменные окружения системы
    return {};
  }
}

const env = loadEnv();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';

function getOpenPRsWithLabel(laneLabel) {
  if (!GITHUB_TOKEN) {
    console.warn('⚠️ GITHUB_TOKEN не установлен, пропускаем проверку lanes');
    return [];
  }

  try {
    // Используем gh CLI для получения списка открытых PR с label
    const command = `gh pr list --repo ${GITHUB_REPO} --state open --label "${laneLabel}" --json number,title,headRefName,url`;
    const output = execSync(command, {
      encoding: 'utf-8',
      env: { ...process.env, GITHUB_TOKEN }
    });
    
    const prs = JSON.parse(output);
    return prs.filter(pr => pr.headRefName); // Фильтруем только PR с ветками
  } catch (error) {
    // Если gh CLI недоступен или произошла ошибка, возвращаем пустой массив
    console.warn(`⚠️ Не удалось получить список PR: ${error.message}`);
    return [];
  }
}

function getPRLabels(prNumber) {
  if (!GITHUB_TOKEN) {
    console.warn('⚠️ GITHUB_TOKEN не установлен, пропускаем получение labels');
    return [];
  }

  try {
    // Получаем labels напрямую из GitHub API через gh CLI
    const command = `gh pr view ${prNumber} --repo ${GITHUB_REPO} --json labels --jq '.labels[].name'`;
    const output = execSync(command, {
      encoding: 'utf-8',
      env: { ...process.env, GITHUB_TOKEN }
    });
    
    const labels = output.trim().split('\n').filter(Boolean);
    return labels.map(l => l.toLowerCase());
  } catch (error) {
    console.warn(`⚠️ Не удалось получить labels из GitHub API: ${error.message}`);
    return [];
  }
}

function extractLaneLabels(prBody, prNumber) {
  const laneLabels = new Set();
  
  // Сначала пытаемся получить labels из GitHub API
  const apiLabels = getPRLabels(prNumber);
  apiLabels.forEach(label => {
    if (label.startsWith('lane:')) {
      laneLabels.add(label.toLowerCase());
    }
  });
  
  // Также проверяем PR body на случай, если labels ещё не добавлены
  if (prBody) {
    const labelRegex = /lane:(docs|infra|stories|characters|qa|refactor|fix|feat|prototype|content)/gi;
    const matches = prBody.match(labelRegex);
    if (matches) {
      matches.forEach(m => laneLabels.add(m.toLowerCase()));
    }
  }
  
  return Array.from(laneLabels);
}

function main() {
  // В CI используем переменные окружения GitHub Actions
  const prNumber = process.env.GITHUB_PR_NUMBER || process.argv[2];
  const prBody = process.env.GITHUB_PR_BODY || process.argv[3] || '';
  
  if (!prNumber) {
    console.log('Использование: node scripts/check-lanes.mjs <pr-number> [pr-body]');
    console.log('Или в CI: используйте переменные GITHUB_PR_NUMBER и GITHUB_PR_BODY');
    process.exit(0);
  }

  // Проверяем, нужно ли пропустить проверку для автоматических веток
  const branchName = process.env.GITHUB_HEAD_REF || '';
  if (branchName.startsWith('notion-sync/')) {
    console.log(`ℹ️  Ветка ${branchName} — автоматический импорт, пропускаем проверку lanes`);
    process.exit(0);
  }

  // Извлекаем lane labels из GitHub API и PR body
  const laneLabels = extractLaneLabels(prBody, prNumber);
  
  if (laneLabels.length === 0) {
    console.log('⚠️  Нет lane labels в PR. Рекомендуется добавить соответствующий label `lane:*` для проверки конфликтов.');
    console.log('   Проверка не блокирует PR, но рекомендуется добавить label.');
    process.exit(0);
  }

  console.log(`🔍 Проверка lanes для PR #${prNumber}: ${laneLabels.join(', ')}`);

  const conflicts = [];
  
  for (const label of laneLabels) {
    const openPRs = getOpenPRsWithLabel(label);
    // Исключаем текущий PR из проверки
    const otherPRs = openPRs.filter(pr => pr.number !== parseInt(prNumber));
    
    if (otherPRs.length > 0) {
      conflicts.push({
        label,
        prs: otherPRs
      });
    }
  }

  if (conflicts.length > 0) {
    console.log('\n⚠️ Обнаружены конфликты lanes:');
    conflicts.forEach(({ label, prs }) => {
      console.log(`\n  Label: ${label}`);
      prs.forEach(pr => {
        console.log(`    - PR #${pr.number}: ${pr.title} (${pr.headRefName})`);
        console.log(`      ${pr.url}`);
      });
    });
    
    // Формируем комментарий для PR
    const conflictList = conflicts.map(({ label, prs }) => {
      const prList = prs.map(pr => `- PR #${pr.number}: [${pr.title}](${pr.url}) (ветка: \`${pr.headRefName}\`)`).join('\n');
      return `### Lane: \`${label}\`\n\n${prList}`;
    }).join('\n\n');
    
    const comment = [
      '## ⚠️ Lane Conflict Detected',
      '',
      'Обнаружен конфликт с другими открытыми PR в той же lane:',
      '',
      conflictList,
      '',
      '**Действие:** Дождитесь закрытия активных PR с теми же lane labels перед мерджем этого PR.',
      '',
      `_Generated at ${new Date().toISOString()}_`
    ].join('\n');
    
    // Добавляем комментарий в PR
    if (GITHUB_TOKEN) {
      try {
        const tmpFile = join(__dirname, '../tmp-lanes-comment.txt');
        writeFileSync(tmpFile, comment, 'utf8');
        
        execSync(
          `gh pr comment ${prNumber} --repo ${GITHUB_REPO} --body-file "${tmpFile}"`,
          {
            stdio: 'inherit',
            encoding: 'utf-8',
            env: { ...process.env, GITHUB_TOKEN }
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
      
      // Добавляем label lane-blocked
      try {
        execSync(
          `gh pr edit ${prNumber} --repo ${GITHUB_REPO} --add-label lane-blocked`,
          {
            stdio: 'inherit',
            encoding: 'utf-8',
            env: { ...process.env, GITHUB_TOKEN }
          }
        );
        console.log('✅ Label "lane-blocked" added to PR');
      } catch (error) {
        console.warn('⚠️  Failed to add label (may not exist):', error.message);
        console.log('💡 Create label "lane-blocked" in repository settings if needed');
      }
    } else {
      console.warn('⚠️  GITHUB_TOKEN not found, skipping comment and label');
    }
    
    console.log('\n💡 Рекомендация: дождитесь закрытия активных PR с теми же lane labels перед мерджем этого PR.');
    process.exit(1);
  } else {
    console.log('✅ Конфликтов lanes не обнаружено');
    
    // Убираем label lane-blocked, если он был добавлен ранее
    if (GITHUB_TOKEN) {
      try {
        execSync(`gh pr edit ${prNumber} --repo ${GITHUB_REPO} --remove-label lane-blocked 2>&1`, {
          stdio: 'pipe',
          encoding: 'utf-8',
          env: { ...process.env, GITHUB_TOKEN }
        });
      } catch (e) {
        // Игнорируем ошибки (label может не существовать)
      }
    }
    
    process.exit(0);
  }
}

main();

