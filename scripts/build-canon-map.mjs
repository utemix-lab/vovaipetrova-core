#!/usr/bin/env node
/**
 * Canon map и alias-словарь
 *
 * Генерирует data/exports/canon_map.v1.json с маппингом:
 * canonical_slug → {aliases[], preferred_title}
 *
 * Источники данных:
 * - tags.yaml: aliases для тегов
 * - pages.json: canonical slugs для страниц
 * - KB файлы: canonical slugs для терминов
 *
 * Использование:
 *   node scripts/build-canon-map.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TAGS_YAML_PATH = join(__dirname, '../docs/nav/tags.yaml');
const PAGES_JSON_PATH = join(__dirname, '../prototype/data/pages.json');
const KB_DIR = join(__dirname, '../docs/kb');
const OUTPUT_DIR = join(__dirname, '../data/exports');
const OUTPUT_PATH = join(OUTPUT_DIR, 'canon_map.v1.json');

function log(message) {
  console.log(`[build-canon-map] ${message}`);
}

/**
 * Загружает aliases из tags.yaml
 */
function loadTagsAliases() {
  const map = new Map();

  if (!existsSync(TAGS_YAML_PATH)) {
    log(`⚠️  Файл не найден: ${TAGS_YAML_PATH}`);
    return map;
  }

  try {
    const content = readFileSync(TAGS_YAML_PATH, 'utf8');
    const data = YAML.parse(content);

    if (data.aliases && typeof data.aliases === 'object') {
      for (const [alias, canonicals] of Object.entries(data.aliases)) {
        if (Array.isArray(canonicals) && canonicals.length > 0) {
          // Первый элемент - канонический тег
          const canonical = canonicals[0];
          if (!map.has(canonical)) {
            map.set(canonical, {
              aliases: [],
              preferred_title: canonical,
            });
          }
          const entry = map.get(canonical);
          if (!entry.aliases.includes(alias)) {
            entry.aliases.push(alias);
          }
        }
      }
    }
  } catch (error) {
    log(`⚠️  Ошибка загрузки tags.yaml: ${error.message}`);
  }

  return map;
}

/**
 * Загружает canonical slugs из pages.json
 */
function loadPagesCanonical() {
  const map = new Map();

  if (!existsSync(PAGES_JSON_PATH)) {
    log(`⚠️  Файл не найден: ${PAGES_JSON_PATH}`);
    return map;
  }

  try {
    const content = readFileSync(PAGES_JSON_PATH, 'utf8');
    const pages = JSON.parse(content);

    if (Array.isArray(pages)) {
      for (const page of pages) {
        if (page.slug && page.title) {
          // Используем slug как canonical
          if (!map.has(page.slug)) {
            map.set(page.slug, {
              aliases: [],
              preferred_title: page.title,
            });
          }
          // Если есть другие варианты slug (например, с суффиксами), добавляем как aliases
          // Но сейчас просто используем основной slug
        }
      }
    }
  } catch (error) {
    log(`⚠️  Ошибка загрузки pages.json: ${error.message}`);
  }

  return map;
}

/**
 * Загружает canonical slugs из KB файлов
 */
function loadKBCanonical() {
  const map = new Map();

  if (!existsSync(KB_DIR)) {
    log(`⚠️  Директория не найдена: ${KB_DIR}`);
    return map;
  }

  try {
    const kbFiles = globSync(`${KB_DIR}/*.md`, { nodir: true })
      .filter(f => {
        const raw = readFileSync(f, 'utf8');
        const { data } = matter(raw);
        return !data.service;
      });

    for (const filePath of kbFiles) {
      const raw = readFileSync(filePath, 'utf8');
      const { data } = matter(raw);

      if (data.slug && data.title) {
        if (!map.has(data.slug)) {
          map.set(data.slug, {
            aliases: [],
            preferred_title: data.title,
          });
        }
      }
    }
  } catch (error) {
    log(`⚠️  Ошибка загрузки KB файлов: ${error.message}`);
  }

  return map;
}

/**
 * Объединяет все источники в единый canon map
 */
function mergeCanonMaps(...maps) {
  const result = new Map();

  for (const sourceMap of maps) {
    for (const [canonical, entry] of sourceMap.entries()) {
      if (!result.has(canonical)) {
        result.set(canonical, {
          aliases: [...entry.aliases],
          preferred_title: entry.preferred_title,
        });
      } else {
        const existing = result.get(canonical);
        // Объединяем aliases
        for (const alias of entry.aliases) {
          if (!existing.aliases.includes(alias)) {
            existing.aliases.push(alias);
          }
        }
        // Предпочитаем более длинный preferred_title (обычно более полный)
        if (entry.preferred_title.length > existing.preferred_title.length) {
          existing.preferred_title = entry.preferred_title;
        }
      }
    }
  }

  return result;
}

function main() {
  log('Построение canon map...');

  // Создаём выходную директорию
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Загружаем данные из всех источников
  log('Загрузка aliases из tags.yaml...');
  const tagsMap = loadTagsAliases();
  log(`  Найдено ${tagsMap.size} канонических тегов`);

  log('Загрузка canonical slugs из pages.json...');
  const pagesMap = loadPagesCanonical();
  log(`  Найдено ${pagesMap.size} канонических страниц`);

  log('Загрузка canonical slugs из KB файлов...');
  const kbMap = loadKBCanonical();
  log(`  Найдено ${kbMap.size} канонических терминов`);

  // Объединяем все источники
  log('Объединение данных...');
  const canonMap = mergeCanonMaps(tagsMap, pagesMap, kbMap);
  log(`  Всего канонических записей: ${canonMap.size}`);

  // Преобразуем Map в объект для JSON
  const result = {};
  for (const [canonical, entry] of canonMap.entries()) {
    result[canonical] = {
      aliases: entry.aliases.sort(),
      preferred_title: entry.preferred_title,
    };
  }

  // Записываем JSON файл
  writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  log(`✅ Создан ${OUTPUT_PATH}`);
  log(`   Канонических записей: ${Object.keys(result).length}`);
  log(`   Всего aliases: ${Object.values(result).reduce((sum, e) => sum + e.aliases.length, 0)}`);
}

main();
