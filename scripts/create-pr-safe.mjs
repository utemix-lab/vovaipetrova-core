#!/usr/bin/env node
/**
 * Безопасное создание PR с правильной кодировкой UTF-8
 *
 * ⚠️ ВАЖНО: ВСЕГДА используйте этот скрипт вместо прямого вызова `gh pr create`!
 *
 * Использование:
 *   npm run pr:create-safe -- --title "Заголовок" --body-file body.txt
 *   npm run pr:create-safe -- --title "Заголовок" --body "Описание"
 *   node scripts/create-pr-safe.mjs --title "Заголовок" --body-file body.txt --base main
 *
 * Этот скрипт гарантирует правильную кодировку UTF-8 при создании PR через GitHub CLI
 * путем использования временных файлов вместо прямых строк в командной строке.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    title: null,
    body: null,
    bodyFile: null,
    base: 'main',
    head: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--title' && i + 1 < args.length) {
      result.title = args[++i];
    } else if (arg === '--body' && i + 1 < args.length) {
      result.body = args[++i];
    } else if (arg === '--body-file' && i + 1 < args.length) {
      result.bodyFile = args[++i];
    } else if (arg === '--base' && i + 1 < args.length) {
      result.base = args[++i];
    } else if (arg === '--head' && i + 1 < args.length) {
      result.head = args[++i];
    }
  }

  return result;
}

function ensureUTF8(text) {
  // Убеждаемся, что текст корректно обрабатывается как UTF-8
  try {
    const buffer = Buffer.from(text, 'utf-8');
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Ошибка кодировки:', error.message);
    return text;
  }
}

function createPR(args) {
  if (!args.title) {
    console.error('Ошибка: --title обязателен');
    process.exit(1);
  }

  // Получаем тело PR
  let bodyText = '';
  if (args.bodyFile) {
    if (!existsSync(args.bodyFile)) {
      console.error(`Ошибка: файл ${args.bodyFile} не найден`);
      process.exit(1);
    }
    bodyText = readFileSync(args.bodyFile, 'utf-8');
  } else if (args.body) {
    bodyText = args.body;
  }

  // Убеждаемся, что текст в UTF-8
  const titleUTF8 = ensureUTF8(args.title);
  const bodyUTF8 = ensureUTF8(bodyText);

  // Определяем ветку
  const headBranch = args.head || execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

  console.log(`📝 Создание PR: ${titleUTF8}`);
  console.log(`🌿 Ветка: ${headBranch} → ${args.base}`);

  // Создаем временный файл для тела PR с гарантированной UTF-8 кодировкой
  const tempBodyFile = join(process.cwd(), `tmp-pr-body-${Date.now()}.txt`);
  writeFileSync(tempBodyFile, bodyUTF8, 'utf-8');

  try {
    // Создаем PR через файл для гарантии правильной кодировки
    const titleEscaped = titleUTF8.replace(/"/g, '\\"');
    const command = `gh pr create --title "${titleEscaped}" --body-file "${tempBodyFile}" --base ${args.base} --head ${headBranch}`;

    console.log('🚀 Выполнение команды...');
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }
    });

    console.log('✅ PR успешно создан!');
    console.log(output.trim());

    // Удаляем временный файл
    try {
      unlinkSync(tempBodyFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }
  } catch (error) {
    console.error('❌ Ошибка при создании PR:', error.message);

    // Удаляем временный файл даже при ошибке
    try {
      unlinkSync(tempBodyFile);
    } catch (e) {
      // Игнорируем ошибки удаления
    }

    process.exit(1);
  }
}

const args = parseArgs();
createPR(args);

