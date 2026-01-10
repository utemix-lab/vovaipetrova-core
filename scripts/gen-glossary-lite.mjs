#!/usr/bin/env node
/**
 * Генератор Glossary Lite (A–Z)
 * 
 * Собирает "лёгкий" список терминов KB с короткими определениями и ссылками
 * на канонические карточки. Выходной файл: docs/kb/glossary-lite.md
 * 
 * Использование:
 *   node scripts/gen-glossary-lite.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const KB_INDEX_PATH = 'prototype/data/kb-index.json';
const OUTPUT_PATH = 'docs/kb/glossary-lite.md';

function log(message) {
  console.log(`[gen-glossary-lite] ${message}`);
}

/**
 * Определяет первую букву термина (латиница или кириллица)
 */
function getFirstLetter(title) {
  if (!title) return '#';
  const firstChar = title.trim()[0];
  if (/[A-Za-z]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }
  if (/[А-ЯЁа-яё]/.test(firstChar)) {
    return firstChar.toUpperCase();
  }
  return '#';
}

/**
 * Сортирует буквы: сначала латиница A-Z, затем кириллица А-Я
 */
function sortLetters(letters) {
  const latin = [];
  const cyrillic = [];
  const other = [];

  for (const letter of letters) {
    if (/[A-Z]/.test(letter)) {
      latin.push(letter);
    } else if (/[А-ЯЁ]/.test(letter)) {
      cyrillic.push(letter);
    } else {
      other.push(letter);
    }
  }

  latin.sort();
  cyrillic.sort((a, b) => a.localeCompare(b, 'ru'));
  
  return [...latin, ...cyrillic, ...other];
}

/**
 * Создаёт ссылку на страницу термина
 */
function createTermLink(slug, url) {
  // Если URL начинается с docs/, убираем префикс для относительной ссылки
  if (url.startsWith('docs/')) {
    const relativeUrl = url.replace(/^docs\//, '');
    // Преобразуем путь в ссылку для автолинка (используем slug)
    return `[${slug}](${relativeUrl})`;
  }
  return `[${slug}](${url})`;
}

/**
 * Основная функция
 */
function main() {
  log('Генерация Glossary Lite...');

  // Загружаем KB index
  if (!existsSync(KB_INDEX_PATH)) {
    log(`❌ Файл ${KB_INDEX_PATH} не найден`);
    process.exit(1);
  }

  const kbIndex = JSON.parse(readFileSync(KB_INDEX_PATH, 'utf8'));
  
  if (!kbIndex.index) {
    log('❌ Не найдена структура index в KB index');
    process.exit(1);
  }

  // Собираем все термины из всех букв
  const allTerms = [];
  const lettersSet = new Set();

  for (const [letter, pages] of Object.entries(kbIndex.index)) {
    if (!Array.isArray(pages)) continue;
    
    lettersSet.add(letter);
    
    for (const page of pages) {
      // Фильтруем только KB страницы (имеют machine_tags с product/kb или находятся в docs/kb/)
      const isKB = (page.machine_tags || []).some(tag => tag === 'product/kb') ||
                   (page.url && page.url.includes('/kb/')) ||
                   // Также включаем страницы из docs/kb/ по пути
                   (page.url && page.url.includes('docs/kb/'));
      
      // Исключаем служебные страницы
      if (page.service) continue;
      
      // Включаем только готовые или review страницы для Glossary Lite
      if (page.status && page.status !== 'ready' && page.status !== 'review') {
        // Можно включить draft, но обычно glossary показывает только готовые термины
        // Пока оставляем только ready и review
        continue;
      }

      if (isKB && page.title && page.slug) {
        allTerms.push({
          letter: getFirstLetter(page.title),
          title: page.title,
          slug: page.slug,
          summary: page.summary || '',
          url: page.url || `docs/kb/${page.slug}.md`,
          status: page.status || 'draft'
        });
        
        // Добавляем букву из title, а не из группы
        lettersSet.add(getFirstLetter(page.title));
      }
    }
  }

  if (allTerms.length === 0) {
    log('⚠️  Не найдено терминов KB для глоссария');
    process.exit(0);
  }

  log(`Найдено ${allTerms.length} терминов KB`);

  // Группируем термины по первой букве
  const termsByLetter = {};
  for (const term of allTerms) {
    const letter = term.letter;
    if (!termsByLetter[letter]) {
      termsByLetter[letter] = [];
    }
    termsByLetter[letter].push(term);
  }

  // Сортируем термины внутри каждой буквы по названию
  for (const letter of Object.keys(termsByLetter)) {
    termsByLetter[letter].sort((a, b) => {
      // Используем locale-aware сортировку
      return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' });
    });
  }

  // Сортируем буквы
  const sortedLetters = sortLetters(Array.from(lettersSet));
  
  // Фильтруем только те буквы, где есть термины
  const lettersWithTerms = sortedLetters.filter(letter => 
    termsByLetter[letter] && termsByLetter[letter].length > 0
  );

  // Генерируем Markdown
  let md = `---
title: Glossary Lite (A–Z)
slug: glossary-lite
summary: Лёгкий справочник терминов базы знаний с короткими определениями и ссылками на канонические карточки
status: ready
tags:
  - База_знаний
  - Справочник
machine_tags:
  - product/kb
---

# Glossary Lite (A–Z)

Лёгкий справочник терминов базы знаний с короткими определениями и ссылками на канонические карточки.

**Всего терминов:** ${allTerms.length}

## Навигация по буквам

`;

  // Навигация по буквам (только те, где есть термины)
  for (const letter of lettersWithTerms) {
    md += `[${letter}](#${letter.toLowerCase()}) `;
  }

  md += `\n\n---\n\n`;

  // Генерируем секции для каждой буквы (только те, где есть термины)
  for (const letter of lettersWithTerms) {
    const terms = termsByLetter[letter];
    if (!terms || terms.length === 0) continue;

    // Якорь для буквы
    md += `<a id="${letter.toLowerCase()}"></a>\n\n`;
    md += `## ${letter}\n\n`;

    // Список терминов
    for (const term of terms) {
      md += `### ${term.title}\n\n`;
      
      if (term.summary) {
        // Обрезаем summary до разумной длины (150 символов)
        const summary = term.summary.length > 150
          ? `${term.summary.slice(0, 147).trim()}…`
          : term.summary;
        md += `${summary}\n\n`;
      }
      
      // Ссылка на каноническую карточку
      // Формат ссылки: относительный путь без префикса docs/
      let linkUrl = term.url;
      if (linkUrl.startsWith('docs/')) {
        linkUrl = linkUrl.replace(/^docs\//, '');
      }
      // Если URL не заканчивается на .md, добавляем
      if (!linkUrl.endsWith('.md')) {
        linkUrl = `${linkUrl}.md`;
      }
      md += `→ [Читать карточку](${linkUrl})\n\n`;
    }
  }

  md += `\n---\n\n`;
  md += `*Сгенерировано автоматически. Обновление: при изменении KB терминов запустите \`npm run glossary:generate\`.*\n`;

  // Убеждаемся, что директория существует
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Сохраняем файл
  writeFileSync(OUTPUT_PATH, md, 'utf8');
  log(`✅ Glossary Lite создан: ${OUTPUT_PATH}`);
  log(`   Терминов: ${allTerms.length}`);
  log(`   Букв: ${lettersWithTerms.length}`);
}

main();
