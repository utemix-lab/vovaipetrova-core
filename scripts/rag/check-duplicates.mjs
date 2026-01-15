#!/usr/bin/env node
/**
 * Проверка дубликатов и "слипшихся" карточек в RAG данных
 *
 * Сверяет дубликаты по нормализованным названиям/alias,
 * генерирует отчёт и авто-правку safe-кейсов.
 *
 * Использование:
 *   node scripts/rag/check-duplicates.mjs [--fix]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { normalizeText } from './tokenize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KB_TERMS_PATH = join(__dirname, '../../data/exports/kb_terms.v1.jsonl');
const STORIES_PATH = join(__dirname, '../../data/exports/stories.v1.jsonl');
const CANON_MAP_PATH = join(__dirname, '../../data/exports/canon_map.v1.json');
const ARTIFACTS_DIR = join(__dirname, '../../artifacts/rag');

/**
 * Нормализует название для сравнения
 */
function normalizeTitle(title) {
  if (!title) return '';
  return normalizeText(title.toLowerCase())
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Загружает KB термины
 */
function loadKBTerms() {
  if (!existsSync(KB_TERMS_PATH)) {
    return [];
  }

  const content = readFileSync(KB_TERMS_PATH, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map((line, index) => {
    try {
      const term = JSON.parse(line);
      return {
        ...term,
        normalized_title: normalizeTitle(term.title),
        source: 'kb',
      };
    } catch (error) {
      console.warn(`⚠️  Ошибка парсинга KB строки ${index + 1}: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Загружает Stories эпизоды
 */
function loadStories() {
  if (!existsSync(STORIES_PATH)) {
    return [];
  }

  const content = readFileSync(STORIES_PATH, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map((line, index) => {
    try {
      const story = JSON.parse(line);
      return {
        ...story,
        normalized_title: normalizeTitle(story.tldr || story.slug),
        source: 'stories',
      };
    } catch (error) {
      console.warn(`⚠️  Ошибка парсинга Stories строки ${index + 1}: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Загружает canon_map для проверки алиасов
 */
function loadCanonMap() {
  if (!existsSync(CANON_MAP_PATH)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(CANON_MAP_PATH, 'utf8'));
  } catch (error) {
    console.warn(`⚠️  Ошибка загрузки canon_map: ${error.message}`);
    return {};
  }
}

function writeJsonl(filePath, items) {
  const lines = items.map(item => JSON.stringify(item));
  writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function applySafeFixes(kbTerms, stories, safeFixes) {
  const removeSet = new Set();
  const appliedFixes = [];

  safeFixes.forEach(({ fix }) => {
    if (fix?.remove?.slug) {
      removeSet.add(`${fix.remove.source}:${fix.remove.slug}`);
      appliedFixes.push({
        keep: fix.keep,
        remove: fix.remove,
      });
    }
  });

  const updatedKbTerms = kbTerms.filter(item => !removeSet.has(`kb:${item.slug}`));
  const updatedStories = stories.filter(item => !removeSet.has(`stories:${item.slug}`));

  return {
    updatedKbTerms,
    updatedStories,
    appliedFixes,
  };
}

/**
 * Находит дубликаты по нормализованным названиям
 */
function findDuplicates(items) {
  const titleMap = new Map();
  const duplicates = [];

  for (const item of items) {
    const normalized = item.normalized_title;
    if (!normalized) continue;

    if (!titleMap.has(normalized)) {
      titleMap.set(normalized, []);
    }
    titleMap.get(normalized).push(item);
  }

  for (const [normalizedTitle, items] of titleMap.entries()) {
    if (items.length > 1) {
      duplicates.push({
        normalized_title: normalizedTitle,
        items,
        count: items.length,
      });
    }
  }

  return duplicates;
}

/**
 * Проверяет, можно ли безопасно исправить дубликат
 */
function isSafeToFix(duplicate, canonMap) {
  // Если только 2 элемента и один из них имеет канонический slug
  if (duplicate.items.length !== 2) {
    return false;
  }

  const [item1, item2] = duplicate.items;

  // Проверяем, есть ли один из них в canon_map как канонический
  const canon1 = canonMap[item1.slug];
  const canon2 = canonMap[item2.slug];

  if (canon1 && !canon2) {
    return { safe: true, keep: item1, remove: item2 };
  }
  if (canon2 && !canon1) {
    return { safe: true, keep: item2, remove: item1 };
  }

  // Если один из них имеет больше алиасов
  if (canon1 && canon2) {
    const aliases1 = (canon1.aliases || []).length;
    const aliases2 = (canon2.aliases || []).length;
    if (aliases1 > aliases2) {
      return { safe: true, keep: item1, remove: item2 };
    }
    if (aliases2 > aliases1) {
      return { safe: true, keep: item2, remove: item1 };
    }
  }

  return { safe: false };
}

function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  console.log('🔍 Проверка дубликатов в RAG данных\n');

  // Загрузка данных
  const kbTerms = loadKBTerms();
  const stories = loadStories();
  const canonMap = loadCanonMap();

  console.log(`✅ Загружено:`);
  console.log(`   KB терминов: ${kbTerms.length}`);
  console.log(`   Stories эпизодов: ${stories.length}`);
  console.log(`   Canon map записей: ${Object.keys(canonMap).length}\n`);

  // Поиск дубликатов
  const allItems = [...kbTerms, ...stories];
  const duplicates = findDuplicates(allItems);

  console.log(`📊 Найдено дубликатов: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log('✅ Дубликаты не найдены');
    return;
  }

  // Анализ дубликатов
  const safeFixes = [];
  const unsafeDuplicates = [];

  for (const duplicate of duplicates) {
    const fixCheck = isSafeToFix(duplicate, canonMap);
    if (fixCheck.safe) {
      safeFixes.push({
        duplicate,
        fix: fixCheck,
      });
    } else {
      unsafeDuplicates.push(duplicate);
    }
  }

  console.log(`✅ Безопасных исправлений: ${safeFixes.length}`);
  console.log(`⚠️  Требуют ручной проверки: ${unsafeDuplicates.length}\n`);

  // Вывод дубликатов
  for (const duplicate of duplicates) {
    console.log(`📋 "${duplicate.normalized_title}" (${duplicate.count} записей):`);
    for (const item of duplicate.items) {
      console.log(`   - ${item.source}: ${item.slug} (${item.title || item.tldr})`);
    }
    console.log('');
  }

  // Генерация отчёта
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const reportPath = join(ARTIFACTS_DIR, `duplicates_report_${new Date().toISOString().split('T')[0]}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_duplicates: duplicates.length,
      safe_fixes: safeFixes.length,
      unsafe_duplicates: unsafeDuplicates.length,
    },
    applied_fixes: [],
    duplicates: duplicates.map(d => ({
      normalized_title: d.normalized_title,
      count: d.count,
      items: d.items.map(i => ({
        source: i.source,
        slug: i.slug,
        title: i.title || i.tldr,
      })),
    })),
    safe_fixes: safeFixes.map(f => ({
      normalized_title: f.duplicate.normalized_title,
      keep: {
        source: f.fix.keep.source,
        slug: f.fix.keep.slug,
      },
      remove: {
        source: f.fix.remove.source,
        slug: f.fix.remove.slug,
      },
    })),
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Отчёт сохранён: ${reportPath}`);

  if (shouldFix && safeFixes.length > 0) {
    console.log('\n🔧 Применение безопасных исправлений...');
    const { updatedKbTerms, updatedStories, appliedFixes } = applySafeFixes(kbTerms, stories, safeFixes);

    if (appliedFixes.length > 0) {
      writeJsonl(KB_TERMS_PATH, updatedKbTerms);
      writeJsonl(STORIES_PATH, updatedStories);

      report.applied_fixes = appliedFixes;
      writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`✅ Исправления применены: ${appliedFixes.length}`);
      console.log(`   Обновлены файлы:`);
      console.log(`   - ${KB_TERMS_PATH}`);
      console.log(`   - ${STORIES_PATH}`);
    } else {
      console.log('ℹ️  Безопасные исправления не найдены.');
    }
  }
}

main();
