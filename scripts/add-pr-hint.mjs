#!/usr/bin/env node
/**
 * PR Auto-hints: добавление коротких hints в PR при превышении порогов
 * 
 * Использование:
 *   node scripts/add-pr-hint.mjs <hint-type> [--pr=<number>]
 * 
 * Типы hints:
 *   - pr-size: превышение размера PR
 *   - guardrails-size: превышение порогов size-guard
 *   - guardrails-forbidden: использование forbidden paths
 *   - guardrails-pii: обнаружение PII данных
 *   - lint-fixes: линт-исправления в основном коммите
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_REPO = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || 'utemix-lab/vovaipetrova-core';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Загрузка конфигурации порогов
const THRESHOLDS_CONFIG_PATH = join(__dirname, '..', 'config', 'ci-thresholds.json');

function loadThresholdsConfig() {
  if (!existsSync(THRESHOLDS_CONFIG_PATH)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(THRESHOLDS_CONFIG_PATH, 'utf8'));
  } catch (error) {
    return null;
  }
}

const thresholdsConfig = loadThresholdsConfig();
const hintsConfig = thresholdsConfig?.alerts?.hints || {};
const hintsEnabled = hintsConfig.enabled !== false;

// Короткие hints для разных типов проблем
const HINTS = {
  'pr-size': '💡 Разбейте PR на несколько меньших для упрощения ревью',
  'guardrails-size': '💡 Разбейте изменения на несколько PR (превышены пороги size-guard)',
  'guardrails-forbidden': '💡 Удалите forbidden paths или запросите явное разрешение',
  'guardrails-pii': '💡 Проверьте, нет ли PII данных. Используйте placeholder: `<user>`, `<email>`, `<path>`',
  'lint-fixes': '💡 Вынесите линт-исправления в отдельный коммит',
  'default': '💡 Проверьте превышение порогов CI'
};

/**
 * Получает список комментариев в PR
 */
function getPRComments(prNumber) {
  try {
    const command = `gh pr view ${prNumber} --repo ${GITHUB_REPO} --json comments`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GITHUB_TOKEN } });
    const data = JSON.parse(output || '{}');
    return data.comments || [];
  } catch (error) {
    return [];
  }
}

/**
 * Проверяет, есть ли уже похожий hint в PR (анти-спам)
 */
function hasSimilarHint(prNumber, hintText) {
  const comments = getPRComments(prNumber);
  const hintKeywords = hintText.toLowerCase().replace(/[💡\s]+/g, ' ').trim();
  
  // Проверяем только комментарии от github-actions[bot]
  for (const comment of comments) {
    const author = comment.author?.login || '';
    if (!author.includes('actions') || !author.includes('bot')) {
      continue;
    }
    
    const body = (comment.body || '').toLowerCase();
    // Проверяем, содержит ли комментарий похожий hint (по ключевым словам)
    if (body.includes('💡') || body.includes('hint')) {
      // Извлекаем ключевые слова из существующего комментария
      const existingKeywords = body
        .replace(/[💡\s\n\r]+/g, ' ')
        .replace(/<!--.*?-->/g, '')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 5)
        .join(' ');
      
      // Если совпадает больше 50% ключевых слов, считаем дублем
      const hintWords = hintKeywords.split(/\s+/).filter(w => w.length > 3);
      const existingWords = existingKeywords.split(/\s+/).filter(w => w.length > 3);
      const commonWords = hintWords.filter(w => existingWords.includes(w));
      
      if (commonWords.length > 0 && (commonWords.length / Math.max(hintWords.length, existingWords.length)) > 0.3) {
        return true; // Похожий hint уже есть
      }
    }
  }
  
  return false;
}

/**
 * Добавляет короткий hint в PR
 */
function addPRHint(hintType, prNumber = null) {
  if (!hintsEnabled) {
    return false;
  }

  // Проверяем, включен ли конкретный тип hint
  const hintTypeKey = hintType.replace(/-/g, ''); // pr-size -> prsize
  const hintTypesConfig = hintsConfig.types || {};
  const typeMapping = {
    'prsize': 'prSize',
    'guardrailssize': 'guardrailsSize',
    'guardrailsforbidden': 'guardrailsForbidden',
    'guardrailspii': 'guardrailsPII',
    'lintfixes': 'lintFixes'
  };
  const configKey = typeMapping[hintTypeKey] || hintType;
  if (hintTypesConfig[configKey] === false) {
    return false; // Этот тип hint отключен
  }

  const hint = HINTS[hintType] || HINTS.default;
  const prNum = prNumber || process.env.GITHUB_PR_NUMBER || process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
  
  if (!prNum || !GITHUB_TOKEN) {
    return false;
  }

  // Проверяем, нет ли уже похожего hint (анти-спам)
  if (hasSimilarHint(prNum, hint)) {
    return false; // Похожий hint уже есть, не добавляем
  }

  // Формируем короткий hint с меткой для идентификации
  const hintComment = `${hint}\n\n<!-- PR Auto-hint: ${hintType} -->`;

  try {
    // Используем временный файл для передачи комментария
    const tmpFile = join(__dirname, `../tmp-pr-hint-${Date.now()}.txt`);
    writeFileSync(tmpFile, hintComment, 'utf8');

    execSync(
      `gh pr comment ${prNum} --repo ${GITHUB_REPO} --body-file "${tmpFile}"`,
      {
        encoding: 'utf-8',
        stdio: 'pipe',
        env: { ...process.env, GITHUB_TOKEN }
      }
    );

    // Удаляем временный файл
    try {
      unlinkSync(tmpFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Если скрипт запущен напрямую (CLI режим)
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  const args = process.argv.slice(2);
  const hintType = args[0];
  const prArg = args.find(arg => arg.startsWith('--pr='));
  const prNumber = prArg ? prArg.split('=')[1] : null;

  if (!hintType) {
    console.error('❌ Укажите тип hint');
    console.error('   Использование: node scripts/add-pr-hint.mjs <hint-type> [--pr=<number>]');
    console.error('   Типы: pr-size, guardrails-size, guardrails-forbidden, guardrails-pii, lint-fixes');
    process.exit(1);
  }

  const added = addPRHint(hintType, prNumber);
  if (added) {
    console.log(`✅ Hint добавлен в PR: ${hintType}`);
  } else {
    console.log(`ℹ️  Hint не добавлен (уже существует или отключен)`);
  }
}

// Экспортируем функцию для использования в других скриптах
export { addPRHint, hasSimilarHint };
