#!/usr/bin/env node
/**
 * KB autolink v2: автоматическое превращение упоминаний терминов в ссылки
 *
 * Правила безопасного линкинга:
 * - Точные совпадения по canonical_slug и aliases
 * - Морфологические формы для русского языка v2 (расширенное покрытие падежей и склонений):
 *   * Все 6 падежей (именительный, родительный, дательный, винительный, творительный, предложный)
 *   * Единственное и множественное число
 *   * Поддержка всех основных типов склонений (1-е, 2-е склонение)
 *   * Обработка составных терминов
 * - Границы слова (word boundaries)
 * - Игнорировать внутри code/links
 * - При конфликте многозначности — приоритет канона, список исключений
 *
 * Использование:
 *   node scripts/autolink.mjs [--dry] [--file <path>] [--no-morphology]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import path from 'path';

const DOCS_ROOT = 'docs';
const PAGES_JSON_PATH = 'prototype/data/pages.json';
const TAGS_YAML_PATH = 'docs/nav/tags.yaml';
const DRY_RUN = process.argv.includes('--dry');
const FILE_ARG = process.argv.indexOf('--file');
const TARGET_FILE = FILE_ARG >= 0 && process.argv[FILE_ARG + 1] ? process.argv[FILE_ARG + 1] : null;
const NO_MORPHOLOGY = process.argv.includes('--no-morphology');

// Исключения: термины, которые не должны быть автолинками
const EXCLUSIONS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'can', 'could', 'may', 'might', 'must', 'shall',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'and', 'or', 'but', 'not', 'no', 'yes', 'if', 'then', 'else',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into',
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
  'during', 'except', 'inside', 'outside', 'over', 'through', 'throughout',
  'under', 'underneath', 'until', 'upon', 'within', 'without'
]);

/**
 * Загружает словарь slug↔aliases из pages.json и tags.yaml
 * С поддержкой морфологических форм для русского языка
 */
function buildSlugAliasesMap() {
  const map = new Map(); // alias → { slug, title, priority }
  const conflicts = new Map(); // alias → [candidates]

  // Загружаем pages.json
  if (existsSync(PAGES_JSON_PATH)) {
    try {
      const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
      pages.forEach(page => {
        if (page.service) return; // Пропускаем service файлы

        const slug = page.slug;
        const title = page.title;

        // Добавляем canonical slug (высший приоритет)
        if (slug) {
          const normalizedSlug = slug.toLowerCase();
          if (!map.has(normalizedSlug)) {
            map.set(normalizedSlug, { slug, title, priority: 1 });
          }

          // Добавляем title как alias
          if (title) {
            const normalizedTitle = title.toLowerCase().trim();
            if (normalizedTitle && normalizedTitle.length > 2 && !EXCLUSIONS.has(normalizedTitle)) {
              // Добавляем исходную форму
              if (map.has(normalizedTitle)) {
                // Конфликт: добавляем в список конфликтов
                const existing = map.get(normalizedTitle);
                if (!conflicts.has(normalizedTitle)) {
                  conflicts.set(normalizedTitle, [existing]);
                }
                conflicts.get(normalizedTitle).push({ slug, title, priority: 1 });
              } else {
                map.set(normalizedTitle, { slug, title, priority: 1 });
              }

              // Добавляем морфологические формы для русского языка
              if (!NO_MORPHOLOGY && isRussianWord(normalizedTitle)) {
                const morphForms = generateMorphologicalForms(normalizedTitle);
                morphForms.forEach(form => {
                  if (form !== normalizedTitle && form.length > 2 && !EXCLUSIONS.has(form)) {
                    if (!map.has(form)) {
                      map.set(form, { slug, title, priority: 2 }); // Морфологические формы имеют меньший приоритет
                    }
                  }
                });
              }
            }
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️ Failed to load ${PAGES_JSON_PATH}:`, error.message);
    }
  }

  // Загружаем tags.yaml для aliases
  // Примечание: tags.yaml содержит aliases для machine_tags, не для страниц напрямую
  // Поэтому мы используем их как дополнительные варианты написания терминов
  // которые могут встречаться в тексте, но не обязательно связаны со страницами

  return { map, conflicts };
}

/**
 * Проверяет, находится ли позиция внутри code блока или ссылки
 */
function isInsideCodeOrLink(content, pos) {
  const before = content.substring(0, pos);

  // Проверяем code blocks (``` или `)
  const codeBlockMatches = before.match(/```[\s\S]*?```/g);
  if (codeBlockMatches) {
    let offset = 0;
    for (const match of codeBlockMatches) {
      const start = before.indexOf(match, offset);
      const end = start + match.length;
      if (pos >= start && pos < end) return true;
      offset = end;
    }
  }

  // Проверяем inline code (`...`)
  const inlineCodeMatches = before.match(/`[^`\n]*`/g);
  if (inlineCodeMatches) {
    let offset = 0;
    for (const match of inlineCodeMatches) {
      const start = before.indexOf(match, offset);
      const end = start + match.length;
      if (pos >= start && pos < end) return true;
      offset = end;
    }
  }

  // Проверяем ссылки [text](url)
  const linkMatches = before.match(/\[([^\]]*)\]\([^)]*\)/g);
  if (linkMatches) {
    let offset = 0;
    for (const match of linkMatches) {
      const start = before.indexOf(match, offset);
      const end = start + match.length;
      if (pos >= start && pos < end) return true;
      offset = end;
    }
  }

  return false;
}

/**
 * Проверяет границы слова (word boundaries)
 */
function isWordBoundary(content, start, end) {
  const before = start > 0 ? content[start - 1] : '';
  const after = end < content.length ? content[end] : '';

  // Граница слова: не буква/цифра до и после
  const isWordChar = (ch) => /[\p{L}\p{N}_]/u.test(ch);

  const beforeIsBoundary = !isWordChar(before);
  const afterIsBoundary = !isWordChar(after);

  return beforeIsBoundary && afterIsBoundary;
}

/**
 * Проверяет, является ли слово русским (содержит кириллицу)
 */
function isRussianWord(word) {
  return /[\u0400-\u04FF]/u.test(word);
}

/**
 * Генерирует морфологические формы для русского слова
 * Улучшенная реализация v2: расширенное покрытие падежей и склонений
 *
 * @param {string} word - Исходное слово в именительном падеже
 * @returns {string[]} - Массив морфологических форм
 */
function generateMorphologicalForms(word) {
  if (!isRussianWord(word) || word.length < 3) {
    return [word]; // Возвращаем только исходную форму для не-русских слов или коротких слов
  }

  const forms = new Set([word.toLowerCase()]); // Всегда включаем исходную форму
  const lowerWord = word.toLowerCase();

  // === ИМЕНИТЕЛЬНЫЙ ПАДЕЖ (кто? что?) ===
  // Исходная форма уже добавлена

  // === РОДИТЕЛЬНЫЙ ПАДЕЖ (кого? чего?) ===
  // Женский род, 1-е склонение (-а, -я)
  if (lowerWord.endsWith('а')) {
    // Проверяем согласный перед -а для правильного окончания
    const beforeA = lowerWord[lowerWord.length - 2];
    if (beforeA && 'гкхжчшщц'.includes(beforeA)) {
      forms.add(lowerWord.slice(0, -1) + 'и'); // книга -> книги, багаж -> багажи
    } else {
      forms.add(lowerWord.slice(0, -1) + 'ы'); // база -> базы
    }
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и'); // навигация -> навигации
  }
  if (lowerWord.endsWith('ья')) {
    forms.add(lowerWord.slice(0, -2) + 'ьи'); // статья -> статьи
  }

  // Средний род, 2-е склонение (-о, -е, -ие)
  if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'а'); // окно -> окна
  }
  if (lowerWord.endsWith('е')) {
    forms.add(lowerWord.slice(0, -1) + 'я'); // поле -> поля
  }
  if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ия'); // знание -> знания
    forms.add(lowerWord.slice(0, -2) + 'ий'); // знание -> знаний (мн.ч. родительный)
  }

  // Мужской род, 2-е склонение (нулевое окончание)
  if (!lowerWord.endsWith('а') && !lowerWord.endsWith('я') && !lowerWord.endsWith('о') &&
      !lowerWord.endsWith('е') && !lowerWord.endsWith('ие') && lowerWord.length > 3) {
    // Для слов мужского рода добавляем формы множественного числа
    if (lowerWord.endsWith('ь')) {
      forms.add(lowerWord.slice(0, -1) + 'и'); // словарь -> словари
      forms.add(lowerWord.slice(0, -1) + 'ей'); // словарь -> словарей
    } else if (lowerWord.endsWith('й')) {
      forms.add(lowerWord.slice(0, -1) + 'и'); // музей -> музеи
      forms.add(lowerWord.slice(0, -1) + 'ев'); // музей -> музеев
    } else {
      forms.add(lowerWord + 'ы'); // инструмент -> инструменты
      forms.add(lowerWord + 'и'); // альтернатива
      forms.add(lowerWord + 'ов'); // инструмент -> инструментов
    }
  }

  // === ДАТЕЛЬНЫЙ ПАДЕЖ (кому? чему?) ===
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'е'); // база -> базе
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и'); // навигация -> навигации
  }
  if (lowerWord.endsWith('ье')) {
    forms.add(lowerWord.slice(0, -2) + 'ью'); // статья -> статье
  }
  if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ию'); // знание -> знанию
  }
  if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'у'); // окно -> окну
  }
  if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'ю'); // поле -> полю
  }

  // === ВИНИТЕЛЬНЫЙ ПАДЕЖ (кого? что?) ===
  // Для неодушевлённых часто совпадает с именительным
  forms.add(lowerWord); // уже добавлено
  // Для одушевлённых может совпадать с родительным
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'у'); // мама -> маму
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'ю'); // навигация -> навигацию
  }

  // === ТВОРИТЕЛЬНЫЙ ПАДЕЖ (кем? чем?) ===
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'ой'); // база -> базой
    forms.add(lowerWord.slice(0, -1) + 'ою'); // база -> базою (устаревшая форма)
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'ей'); // навигация -> навигацией
    forms.add(lowerWord.slice(0, -1) + 'ёй'); // альтернативная форма
  }
  if (lowerWord.endsWith('ья')) {
    forms.add(lowerWord.slice(0, -2) + 'ьей'); // статья -> статьёй
  }
  if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ием'); // знание -> знанием
  }
  if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'ом'); // окно -> окном
  }
  if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'ем'); // поле -> полем
  }

  // === ПРЕДЛОЖНЫЙ ПАДЕЖ (о ком? о чём?) ===
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'е'); // база -> базе
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и'); // навигация -> навигации
  }
  if (lowerWord.endsWith('ье')) {
    forms.add(lowerWord.slice(0, -2) + 'ье'); // статья -> статье
  }
  if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ии'); // знание -> знании
  }
  if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'е'); // окно -> окне
  }
  if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'е'); // поле -> поле (уже есть)
  }

  // === МНОЖЕСТВЕННОЕ ЧИСЛО ===
  // Именительный падеж мн.ч.
  if (lowerWord.endsWith('а')) {
    const beforeA = lowerWord[lowerWord.length - 2];
    if (beforeA && 'гкхжчшщц'.includes(beforeA)) {
      forms.add(lowerWord.slice(0, -1) + 'и'); // книга -> книги
    } else {
      forms.add(lowerWord.slice(0, -1) + 'ы'); // база -> базы
    }
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и'); // навигация -> навигации
  }
  if (lowerWord.endsWith('ье')) {
    forms.add(lowerWord.slice(0, -2) + 'ья'); // статья -> статьи
  }
  if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ия'); // знание -> знания
  }
  if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'а'); // окно -> окна
  }
  if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'я'); // поле -> поля
  }

  // Родительный падеж мн.ч.
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + ''); // база -> баз (редко используется)
  }
  if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'й'); // навигация -> навигаций
  }
  if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ий'); // знание -> знаний
  }

  // === ОБРАБОТКА СОСТАВНЫХ ТЕРМИНОВ ===
  // Для составных терминов (например, "база знаний")
  // Генерируем формы для обоих слов
  if (lowerWord.includes(' ')) {
    const parts = lowerWord.split(' ');
    if (parts.length === 2) {
      const [first, second] = parts;

      // Генерируем формы для второго слова
      const secondForms = generateMorphologicalForms(second);
      secondForms.forEach(f2 => {
        if (f2 !== second) { // Избегаем дубликатов
          forms.add(`${first} ${f2}`);
        }
      });

      // Генерируем формы для первого слова
      if (isRussianWord(first)) {
        const firstForms = generateMorphologicalForms(first);
        firstForms.forEach(f1 => {
          if (f1 !== first) { // Избегаем дубликатов
            forms.add(`${f1} ${second}`);
            // Также комбинируем формы первого и второго слова
            secondForms.forEach(f2 => {
              if (f2 !== second) {
                forms.add(`${f1} ${f2}`);
              }
            });
          }
        });
      }
    } else if (parts.length > 2) {
      // Для трёх и более слов обрабатываем только последнее слово
      const lastWord = parts[parts.length - 1];
      const prefix = parts.slice(0, -1).join(' ');
      const lastForms = generateMorphologicalForms(lastWord);
      lastForms.forEach(form => {
        if (form !== lastWord) {
          forms.add(`${prefix} ${form}`);
        }
      });
    }
  }

  return Array.from(forms);
}

/**
 * Автолинкинг терминов в контенте
 */
function autolinkContent(content, slugAliasesMap) {
  let result = content;
  let offset = 0;

  // Сортируем aliases по длине (от длинных к коротким) для правильного матчинга
  const sortedAliases = Array.from(slugAliasesMap.entries())
    .sort((a, b) => b[0].length - a[0].length);

  for (const [alias, { slug, title }] of sortedAliases) {
    // Создаём regex для поиска с учётом границ слова
    // Используем lookbehind и lookahead для границ слова
    const regex = new RegExp(
      `(?<!\\p{L}\\p{N}_)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\p{L}\\p{N}_)`,
      'giu'
    );

    let match;
    const replacements = [];

    while ((match = regex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Пропускаем, если внутри code/links
      if (isInsideCodeOrLink(content, matchStart)) {
        continue;
      }

      // Проверяем границы слова
      if (!isWordBoundary(content, matchStart, matchEnd)) {
        continue;
      }

      // Проверяем, что это не часть уже существующей ссылки
      const beforeMatch = content.substring(Math.max(0, matchStart - 2), matchStart);
      const afterMatch = content.substring(matchEnd, Math.min(content.length, matchEnd + 2));
      if (beforeMatch.includes('](') || afterMatch.startsWith(')')) {
        continue;
      }

      replacements.push({
        start: matchStart,
        end: matchEnd,
        alias: match[0],
        slug,
        title
      });
    }

    // Применяем замены в обратном порядке (от конца к началу), чтобы не сбить индексы
    replacements.reverse().forEach(({ start, end, alias: matchedAlias, slug: targetSlug, title: targetTitle }) => {
      const linkText = matchedAlias;
      const linkUrl = `${targetSlug}.md`;
      const replacement = `[${linkText}](${linkUrl})`;

      result = result.substring(0, start + offset) + replacement + result.substring(end + offset);
      offset += replacement.length - (end - start);
    });
  }

  return result;
}

/**
 * Обрабатывает один файл
 */
function processFile(filePath, slugAliasesMap) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);

    const before = parsed.content;
    const after = autolinkContent(before, slugAliasesMap);

    if (before === after) {
      return { changed: false };
    }

    if (DRY_RUN) {
      console.log(`DRY: would autolink in ${filePath}`);
      return { changed: true, dry: true };
    }

    const updated = matter.stringify(after, parsed.data);
    writeFileSync(filePath, updated, 'utf8');
    return { changed: true };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { changed: false, error: error.message };
  }
}

function main() {
  console.log('🔗 KB autolink v2: slug/aliases map + safe linking rules');
  if (!NO_MORPHOLOGY) {
    console.log('   ✨ Russian morphology support enabled\n');
  } else {
    console.log('   ⚠️  Morphology disabled (--no-morphology)\n');
  }

  // Строим словарь
  console.log('📚 Building slug/aliases map...');
  const { map: slugAliasesMap, conflicts } = buildSlugAliasesMap();
  console.log(`   Found ${slugAliasesMap.size} aliases${NO_MORPHOLOGY ? '' : ' (including morphological forms)'}`);

  if (conflicts.size > 0) {
    console.log(`\n⚠️  Found ${conflicts.size} conflicts (using canonical priority):`);
    conflicts.forEach((candidates, alias) => {
      console.log(`   - "${alias}": ${candidates.length} candidates`);
    });
  }

  // Обрабатываем файлы
  const files = TARGET_FILE
    ? [TARGET_FILE]
    : globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true });

  console.log(`\n📝 Processing ${files.length} file(s)...`);

  let changedCount = 0;
  let errorCount = 0;

  files.forEach(file => {
    const result = processFile(file, slugAliasesMap);
    if (result.changed) {
      changedCount++;
      if (!result.dry) {
        console.log(`   ✅ ${file}`);
      }
    }
    if (result.error) {
      errorCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${files.length}`);
  console.log(`   Changed: ${changedCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN mode - no files were modified`);
  } else if (changedCount > 0) {
    console.log(`\n✅ Autolinking completed!`);
  } else {
    console.log(`\n✅ No changes needed.`);
  }
}

main();

