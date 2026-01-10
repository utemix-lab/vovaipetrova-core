#!/usr/bin/env node
/**
 * Генератор Glossary Lite (A–Z)
 * 
 * Собирает "лёгкий" список терминов KB с короткими определениями и ссылками
 * на канонические карточки. Выходной файл: docs/kb/glossary-lite.md
 * 
 * При превышении порога (по умолчанию 1000 терминов) автоматически
 * создаёт две страницы: glossary-lite-a-m.md и glossary-lite-n-z.md
 * 
 * Использование:
 *   node scripts/gen-glossary-lite.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

const KB_INDEX_PATH = 'prototype/data/kb-index.json';
const CONFIG_PATH = 'config/glossary-lite.json';
const OUTPUT_PATH = 'docs/kb/glossary-lite.md';
const OUTPUT_PATH_A_M = 'docs/kb/glossary-lite-a-m.md';
const OUTPUT_PATH_N_Z = 'docs/kb/glossary-lite-n-z.md';

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
 * Определяет, относится ли буква к первой части (A–M)
 */
function isFirstPart(letter) {
  // Латиница A-M
  if (/[A-M]/.test(letter)) {
    return true;
  }
  // Кириллица А-М
  if (/[А-М]/.test(letter)) {
    return true;
  }
  return false;
}

/**
 * Загружает конфигурацию Glossary Lite
 */
function loadConfig() {
  const defaultConfig = {
    pagination: {
      enabled: true,
      threshold: 1000
    }
  };

  if (!existsSync(CONFIG_PATH)) {
    log(`⚠️  Конфиг ${CONFIG_PATH} не найден, используем значения по умолчанию`);
    return defaultConfig;
  }

  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    return {
      pagination: {
        enabled: config.pagination?.enabled ?? defaultConfig.pagination.enabled,
        threshold: config.pagination?.threshold ?? defaultConfig.pagination.threshold
      }
    };
  } catch (error) {
    log(`⚠️  Ошибка чтения конфига: ${error.message}, используем значения по умолчанию`);
    return defaultConfig;
  }
}

/**
 * Генерирует Markdown для одной части Glossary Lite
 */
function generateGlossaryPart(termsByLetter, lettersWithTerms, partTitle, partSlug, breadcrumbs, isPagination = false, otherPartLink = null) {
  // Подсчитываем общее количество терминов в этой части
  const totalTerms = lettersWithTerms.reduce((sum, letter) => {
    return sum + (termsByLetter[letter]?.length || 0);
  }, 0);

  let md = `---
title: ${partTitle}
slug: ${partSlug}
summary: >-
  Лёгкий справочник терминов базы знаний с короткими определениями и ссылками на
  канонические карточки (${partTitle})
status: ready
tags:
  - База_знаний
  - Справочник
machine_tags:
  - product/kb
---

# ${partTitle}

${breadcrumbs}

${isPagination && otherPartLink ? `**Навигация:** [← Индекс](glossary-lite.md) • ${otherPartLink}\n\n` : ''}Лёгкий справочник терминов базы знаний с короткими определениями и ссылками на канонические карточки.

**Всего терминов:** ${totalTerms}

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

  return md;
}

/**
 * Основная функция
 */
function main() {
  log('Генерация Glossary Lite...');

  // Загружаем конфигурацию
  const config = loadConfig();

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

  // Убеждаемся, что директория существует
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const breadcrumbs = `← [База знаний (KB)](/prototype#kb-index) • [Explorer](/prototype)`;

  // Проверяем, нужно ли включать пагинацию
  const usePagination = config.pagination.enabled && allTerms.length > config.pagination.threshold;

  if (usePagination) {
    log(`📄 Пагинация включена (${allTerms.length} > ${config.pagination.threshold})`);
    
    // Разделяем буквы на две части
    const lettersA_M = lettersWithTerms.filter(letter => isFirstPart(letter));
    const lettersN_Z = lettersWithTerms.filter(letter => !isFirstPart(letter));

    // Генерируем первую часть (A–M)
    const mdA_M = generateGlossaryPart(
      termsByLetter,
      lettersA_M,
      'Glossary Lite (A–M)',
      'glossary-lite-a-m',
      breadcrumbs,
      true,
      '[N–Z →](glossary-lite-n-z.md)'
    );
    writeFileSync(OUTPUT_PATH_A_M, mdA_M, 'utf8');
    log(`✅ Glossary Lite (A–M) создан: ${OUTPUT_PATH_A_M}`);

    // Генерируем вторую часть (N–Z)
    const mdN_Z = generateGlossaryPart(
      termsByLetter,
      lettersN_Z,
      'Glossary Lite (N–Z)',
      'glossary-lite-n-z',
      breadcrumbs,
      true,
      '[← A–M](glossary-lite-a-m.md)'
    );
    writeFileSync(OUTPUT_PATH_N_Z, mdN_Z, 'utf8');
    log(`✅ Glossary Lite (N–Z) создан: ${OUTPUT_PATH_N_Z}`);

    // Генерируем индексную страницу
    const termsA_M = lettersA_M.reduce((sum, letter) => sum + (termsByLetter[letter]?.length || 0), 0);
    const termsN_Z = lettersN_Z.reduce((sum, letter) => sum + (termsByLetter[letter]?.length || 0), 0);

    const indexMd = `---
title: Glossary Lite (A–Z)
slug: glossary-lite
summary: >-
  Лёгкий справочник терминов базы знаний с короткими определениями и ссылками на
  канонические карточки
status: ready
tags:
  - База_знаний
  - Справочник
machine_tags:
  - product/kb
---

# Glossary Lite (A–Z)

${breadcrumbs}

Лёгкий справочник терминов базы знаний с короткими определениями и ссылками на канонические карточки.

**Всего терминов:** ${allTerms.length}

## Навигация

Glossary Lite разделён на две части для удобства навигации:

- **[Glossary Lite (A–M)](glossary-lite-a-m.md)** — ${termsA_M} терминов
- **[Glossary Lite (N–Z)](glossary-lite-n-z.md)** — ${termsN_Z} терминов

---

*Сгенерировано автоматически. Обновление: при изменении KB терминов запустите \`npm run glossary:generate\`.*
`;

    writeFileSync(OUTPUT_PATH, indexMd, 'utf8');
    log(`✅ Glossary Lite (индекс) создан: ${OUTPUT_PATH}`);
    log(`   Терминов A–M: ${termsA_M}`);
    log(`   Терминов N–Z: ${termsN_Z}`);
  } else {
    log(`📄 Пагинация отключена (${allTerms.length} ≤ ${config.pagination.threshold})`);
    
    // Удаляем старые файлы пагинации, если они существуют
    if (existsSync(OUTPUT_PATH_A_M)) {
      unlinkSync(OUTPUT_PATH_A_M);
      log(`🗑️  Удалён старый файл пагинации: ${OUTPUT_PATH_A_M}`);
    }
    if (existsSync(OUTPUT_PATH_N_Z)) {
      unlinkSync(OUTPUT_PATH_N_Z);
      log(`🗑️  Удалён старый файл пагинации: ${OUTPUT_PATH_N_Z}`);
    }
    
    // Генерируем единую страницу
    const md = generateGlossaryPart(
      termsByLetter,
      lettersWithTerms,
      'Glossary Lite (A–Z)',
      'glossary-lite',
      breadcrumbs
    );
    
    writeFileSync(OUTPUT_PATH, md, 'utf8');
    log(`✅ Glossary Lite создан: ${OUTPUT_PATH}`);
    log(`   Терминов: ${allTerms.length}`);
    log(`   Букв: ${lettersWithTerms.length}`);
  }
}

main();
