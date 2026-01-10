#!/usr/bin/env node
/**
 * Экспорт JSONL-среза Glossary Lite
 *
 * Генерирует kb_glossary_lite.jsonl с данными терминов:
 * - slug: идентификатор термина
 * - title: название термина
 * - lite_summary: краткое определение (≤200 символов)
 * - link: относительная ссылка на каноническую карточку
 *
 * Использование:
 *   node scripts/export-glossary-lite-jsonl.mjs [выходной_файл]
 *
 * По умолчанию: kb_glossary_lite.jsonl
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { join } from 'path';

const DEFAULT_OUTPUT = 'kb_glossary_lite.jsonl';
const LITE_FILES_PATTERN = 'docs/kb/glossary-lite*.md';

// Паттерн для ссылки "Читать карточку"
const READ_LINK_PATTERN = /→\s*\[Читать карточку\]\(([^)]+)\)/i;

/**
 * Извлекает slug из ссылки или заголовка
 */
function extractSlugFromLink(link) {
  if (!link) return null;
  // Убираем префикс kb/ или docs/kb/
  let slug = link.replace(/^(kb\/|docs\/kb\/)/, '');
  // Убираем расширение .md
  slug = slug.replace(/\.md$/, '');
  return slug;
}

/**
 * Парсит термины из Glossary Lite файла
 *
 * Возвращает массив объектов:
 * {
 *   title: string,
 *   lite_summary: string,
 *   link: string,
 *   slug: string
 * }
 */
function parseTerms(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const parsed = matter(content);
  const body = parsed.content;

  const lines = body.split(/\r?\n/);
  const terms = [];
  let currentTerm = null;
  let currentSummaryLines = [];
  let inTerm = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Заголовок термина: ### Title
    if (trimmed.startsWith('### ')) {
      // Сохраняем предыдущий термин, если он был
      if (currentTerm) {
        const summary = currentSummaryLines.join(' ').trim();
        currentTerm.lite_summary = summary;
        terms.push(currentTerm);
      }

      // Начинаем новый термин
      const title = trimmed.replace(/^###\s+/, '');
      currentTerm = {
        title,
        lite_summary: '',
        link: null,
        slug: null
      };
      currentSummaryLines = [];
      inTerm = true;
      continue;
    }

    // Конец термина: следующий заголовок уровня 2 или 3, или конец файла
    if (inTerm && (trimmed.startsWith('## ') || trimmed.startsWith('### '))) {
      if (currentTerm) {
        const summary = currentSummaryLines.join(' ').trim();
        currentTerm.lite_summary = summary;
        terms.push(currentTerm);
        currentTerm = null;
        currentSummaryLines = [];
        inTerm = false;
      }
      // Если это заголовок уровня 3, это начало нового термина
      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s+/, '');
        currentTerm = {
          title,
          lite_summary: '',
          link: null,
          slug: null
        };
        inTerm = true;
      }
      continue;
    }

    // Собираем строки определения термина
    if (inTerm && currentTerm) {
      // Проверяем, является ли это ссылкой "Читать карточку"
      const linkMatch = trimmed.match(READ_LINK_PATTERN);
      if (linkMatch) {
        currentTerm.link = linkMatch[1];
        currentTerm.slug = extractSlugFromLink(linkMatch[1]);
        // Завершаем сбор summary при обнаружении ссылки
        inTerm = false;
        continue;
      }

      // Пропускаем пустые строки в начале
      if (trimmed.length === 0 && currentSummaryLines.length === 0) {
        continue;
      }

      // Пропускаем HTML-якоря и другие служебные элементы
      if (trimmed.startsWith('<a id=') || trimmed.startsWith('</a>')) {
        continue;
      }

      // Добавляем строку к определению
      currentSummaryLines.push(trimmed);
    }
  }

  // Сохраняем последний термин
  if (currentTerm) {
    const summary = currentSummaryLines.join(' ').trim();
    currentTerm.lite_summary = summary;
    terms.push(currentTerm);
  }

  return terms;
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);
  const outputFile = args[0] || DEFAULT_OUTPUT;

  console.log(`🔍 Поиск файлов Glossary Lite...`);

  // Ищем все glossary-lite*.md файлы
  const files = globSync(LITE_FILES_PATTERN, { nodir: true });

  if (files.length === 0) {
    console.error('❌ Файлы Glossary Lite не найдены');
    process.exit(1);
  }

  console.log(`📄 Найдено ${files.length} файл(ов)`);

  // Собираем все термины из всех файлов
  const allTerms = [];
  const seenSlugs = new Set();

  for (const file of files) {
    console.log(`  📖 Обработка: ${file}`);
    try {
      const terms = parseTerms(file);

      for (const term of terms) {
        // Пропускаем термины без ссылки или slug
        if (!term.link || !term.slug) {
          console.warn(`  ⚠️  Термин "${term.title}" пропущен (нет ссылки)`);
          continue;
        }

        // Пропускаем дубликаты (по slug)
        if (seenSlugs.has(term.slug)) {
          console.warn(`  ⚠️  Дубликат "${term.title}" (slug: ${term.slug}) пропущен`);
          continue;
        }

        seenSlugs.add(term.slug);
        allTerms.push(term);
      }
    } catch (error) {
      console.error(`  ❌ Ошибка при обработке ${file}: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Найдено ${allTerms.length} уникальных терминов`);

  // Генерируем JSONL
  console.log(`📝 Генерация JSONL...`);
  const jsonlLines = [];

  for (const term of allTerms) {
    const record = {
      slug: term.slug,
      title: term.title,
      lite_summary: term.lite_summary,
      link: term.link
    };

    jsonlLines.push(JSON.stringify(record));
  }

  // Записываем файл
  const jsonlContent = jsonlLines.join('\n') + '\n';
  writeFileSync(outputFile, jsonlContent, 'utf8');

  console.log(`✅ JSONL-файл создан: ${outputFile}`);
  console.log(`   Терминов: ${allTerms.length}`);
  console.log(`   Размер: ${(jsonlContent.length / 1024).toFixed(2)} KB`);
}

main();
