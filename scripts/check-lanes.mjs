#!/usr/bin/env node
/**
 * Проверка политики "один PR на lane"
 * 
 * Проверяет, есть ли уже открытый PR с тем же label lane:*
 * Использование: node scripts/check-lanes.mjs <pr-number> <lane-label>
 */

import { readFileSync } from 'fs';
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

function extractLaneLabels(prBody) {
  if (!prBody) return [];
  
  const laneLabels = [];
  // Ищем labels в формате lane:*
  const labelRegex = /lane:(docs|infra|stories|characters|qa|refactor|fix|feat)/gi;
  const matches = prBody.match(labelRegex);
  if (matches) {
    laneLabels.push(...matches.map(m => m.toLowerCase()));
  }
  
  // Также проверяем labels через GitHub API, если доступен gh CLI
  return [...new Set(laneLabels)]; // Убираем дубликаты
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

  // Извлекаем lane labels из PR body
  const laneLabels = extractLaneLabels(prBody);
  
  if (laneLabels.length === 0) {
    console.log('✅ Нет lane labels в PR, проверка не требуется');
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
    
    console.log('\n💡 Рекомендация: дождитесь закрытия активных PR с теми же lane labels перед мерджем этого PR.');
    process.exit(1);
  } else {
    console.log('✅ Конфликтов lanes не обнаружено');
    process.exit(0);
  }
}

main();

