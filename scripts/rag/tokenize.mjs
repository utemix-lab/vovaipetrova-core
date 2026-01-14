#!/usr/bin/env node
/**
 * Токенизация и нормализация для RAG
 *
 * Базовая нормализация текста для русского и английского языков:
 * - Нормализация пробелов и пунктуации
 * - Обработка цифр
 * - Удаление лишних символов
 * - Оценка количества токенов
 *
 * Использование:
 *   node scripts/rag/tokenize.mjs "текст для токенизации"
 *   node scripts/rag/tokenize.mjs --file path/to/file.txt
 *   node scripts/rag/tokenize.mjs --test  # запуск модульных тестов
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Простая оценка токенов: ~4 символа на токен для русского/английского текста
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Более точная оценка: учитываем пробелы и пунктуацию
  const cleaned = text.trim();
  if (cleaned.length === 0) return 0;
  // Средняя длина слова ~5 символов, плюс пробелы
  return Math.ceil(cleaned.length / 4);
}

/**
 * Нормализация текста для RAG
 */
function normalizeText(text) {
  if (!text) return '';

  let normalized = text;

  // 0. Удаление невидимых символов ПЕРЕД нормализацией пробелов
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 1. Нормализация переносов строк: множественные → максимум два подряд
  normalized = normalized.replace(/\r\n/g, '\n');
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 2. Нормализация пробелов (но сохраняем переносы строк)
  // Заменяем множественные пробелы и табы на один пробел, но не трогаем \n
  normalized = normalized.replace(/[ \t]+/g, ' ');

  // 3. Нормализация пунктуации: множественные знаки → один
  normalized = normalized.replace(/[.,!?;:]{2,}/g, (match) => match[0]);

  // 4. Нормализация дефисов и тире
  normalized = normalized.replace(/[—–−-]{2,}/g, '—');
  normalized = normalized.replace(/[—–−]/g, ' — ');

  // 5. Нормализация кавычек (русские и английские → стандартные)
  normalized = normalized.replace(/["""«»]/g, '"');
  normalized = normalized.replace(/['''„‚]/g, "'");

  // Невидимые символы уже удалены на шаге 0

  // 7. Нормализация цифр: пробелы вокруг чисел
  normalized = normalized.replace(/(\d+)\s*([.,])\s*(\d+)/g, '$1$2$3'); // Десятичные числа
  normalized = normalized.replace(/(\d+)\s+(\d+)/g, '$1 $2'); // Раздельные числа

  // 8. Удаление лишних пробелов вокруг пунктуации
  normalized = normalized.replace(/\s+([.,!?;:])/g, '$1');
  normalized = normalized.replace(/([.,!?;:])\s{2,}/g, '$1 ');

  // 9. Финальная нормализация пробелов (сохраняем переносы строк)
  // Заменяем множественные пробелы/табы на один пробел, но не трогаем \n
  normalized = normalized.replace(/[ \t]+/g, ' ');
  // Убираем пробелы в начале и конце строк (но не переносы)
  normalized = normalized.replace(/[ \t]+(\n)/g, '$1');
  normalized = normalized.replace(/(\n)[ \t]+/g, '$1');

  return normalized.trim();
}

/**
 * Токенизация текста с нормализацией
 */
export function tokenize(text, options = {}) {
  const {
    normalize = true,
    estimateTokenCount = true,
  } = options;

  const normalized = normalize ? normalizeText(text) : text.trim();
  const tokens = estimateTokenCount ? estimateTokens(normalized) : null;

  return {
    original: text,
    normalized,
    tokens,
    length: normalized.length,
  };
}

/**
 * Модульные тесты на спорных примерах
 */
function runTests() {
  const tests = [
    {
      name: 'Множественные пробелы',
      input: 'Текст   с    множественными     пробелами',
      expected: 'Текст с множественными пробелами',
    },
    {
      name: 'Множественные переносы строк',
      input: 'Текст\n\n\n\nс переносами',
      expected: 'Текст\n\nс переносами',
    },
    {
      name: 'Множественная пунктуация',
      input: 'Текст!!! С вопросами???',
      expected: 'Текст! С вопросами?',
    },
    {
      name: 'Разные тире',
      input: 'Текст—с—тире–и–дефисами',
      expected: 'Текст — с — тире — и — дефисами',
    },
    {
      name: 'Разные кавычки',
      input: 'Текст "в кавычках" и «в других»',
      expected: 'Текст "в кавычках" и "в других"',
    },
    {
      name: 'Десятичные числа',
      input: 'Цена 123.45 рублей',
      expected: 'Цена 123.45 рублей',
    },
    {
      name: 'Пробелы вокруг пунктуации',
      input: 'Текст , с пробелами . В начале',
      expected: 'Текст, с пробелами. В начале',
    },
    {
      name: 'Смешанный русский и английский',
      input: 'Text   с   пробелами   and   spaces',
      expected: 'Text с пробелами and spaces',
    },
    {
      name: 'Невидимые символы',
      input: 'Текст\u200Bс\uFEFFневидимыми\u200Dсимволами',
      expected: 'Текстсневидимымисимволами',
    },
    {
      name: 'Пустая строка',
      input: '',
      expected: '',
    },
    {
      name: 'Только пробелы',
      input: '   \n\n   ',
      expected: '',
    },
  ];

  console.log('🧪 Запуск модульных тестов токенизации...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = normalizeText(test.input);
    const success = result === test.expected;

    if (success) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      console.log(`   Ожидалось: "${test.expected}"`);
      console.log(`   Получено:  "${result}"`);
      failed++;
    }
  }

  console.log(`\n📊 Результаты: ${passed} прошло, ${failed} провалено`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log('✅ Все тесты прошли успешно');
  process.exit(0);
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);

  // Режим тестирования
  if (args.includes('--test')) {
    runTests();
    return;
  }

  // Режим файла
  if (args.includes('--file')) {
    const fileIndex = args.indexOf('--file');
    const filePath = args[fileIndex + 1];

    if (!filePath || !existsSync(filePath)) {
      console.error('❌ Файл не найден:', filePath);
      process.exit(1);
    }

    const content = readFileSync(filePath, 'utf8');
    const result = tokenize(content);

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Режим строки (первый аргумент)
  if (args.length > 0) {
    const text = args.join(' ');
    const result = tokenize(text);

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Интерактивный режим или справка
  console.log('Использование:');
  console.log('  node scripts/rag/tokenize.mjs "текст для токенизации"');
  console.log('  node scripts/rag/tokenize.mjs --file path/to/file.txt');
  console.log('  node scripts/rag/tokenize.mjs --test');
}

main();
