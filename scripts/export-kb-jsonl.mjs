#!/usr/bin/env node
/**
 * Экспорт KB JSONL (канон)
 *
 * Генерирует data/exports/kb_terms.v1.jsonl с полными данными терминов:
 * - slug: идентификатор термина
 * - title: название термина
 * - lite_summary: краткое определение (≤200 символов)
 * - full_text_md: полный текст документа в Markdown
 * - tags: массив тегов из front matter
 * - links: массив внутренних ссылок из контента
 * - updated_at: дата последнего обновления
 *
 * Использование:
 *   node scripts/export-kb-jsonl.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KB_DIR = join(__dirname, '../docs/kb');
const OUTPUT_DIR = join(__dirname, '../data/exports');
const OUTPUT_PATH = join(OUTPUT_DIR, 'kb_terms.v1.jsonl');
const SCHEMA_DIR = join(__dirname, '../docs/data-schemas');
const SCHEMA_PATH = join(SCHEMA_DIR, 'kb_terms.schema.json');

function log(message) {
  console.log(`[export-kb-jsonl] ${message}`);
}

/**
 * Извлекает краткое определение из контента или front matter
 */
function extractLiteSummary(content, summary) {
  // Используем summary из front matter, если есть
  if (summary && summary.trim().length > 0) {
    return summary.trim().slice(0, 200);
  }

  // Иначе извлекаем TL;DR из контента
  const tldrMatch = content.match(/##\s+TL;DR\s*\n\n([\s\S]*?)(?=\n##|\n#|$)/);
  if (tldrMatch && tldrMatch[1]) {
    return tldrMatch[1].trim().split('\n').filter(line => line.trim().length > 0).join(' ').slice(0, 200);
  }

  // Или первый абзац
  const firstPara = content.split(/\n{2,}/).find(p => p.trim().length > 0);
  if (firstPara) {
    return firstPara.trim().slice(0, 200);
  }

  return '';
}

/**
 * Извлекает внутренние ссылки из Markdown контента
 */
function extractLinks(content) {
  const links = [];
  // Ищем ссылки в формате [текст](путь) или [текст](./путь)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];
    // Пропускаем внешние ссылки (http/https)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      continue;
    }
    // Пропускаем якоря (#)
    if (url.startsWith('#')) {
      continue;
    }
    // Нормализуем путь (убираем ./)
    const normalized = url.replace(/^\.\//, '').replace(/\.md$/, '');
    if (normalized && !links.includes(normalized)) {
      links.push(normalized);
    }
  }

  return links;
}

/**
 * Получает дату последнего обновления файла
 */
function getUpdatedAt(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.mtime.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function main() {
  log('Экспорт KB JSONL (канон)...');

  if (!existsSync(KB_DIR)) {
    log(`❌ Директория не найдена: ${KB_DIR}`);
    process.exit(1);
  }

  // Создаём выходные директории
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(SCHEMA_DIR, { recursive: true });

  const kbFiles = globSync(`${KB_DIR}/*.md`, { nodir: true })
    .filter(f => {
      // Исключаем service файлы
      const raw = readFileSync(f, 'utf8');
      const { data } = matter(raw);
      return !data.service;
    })
    .sort();

  log(`Найдено ${kbFiles.length} файлов KB`);

  const entries = [];

  for (const filePath of kbFiles) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);

      if (!data.slug || !data.title) {
        log(`⚠️  Пропущен файл без slug/title: ${filePath}`);
        continue;
      }

      const liteSummary = extractLiteSummary(content, data.summary);
      const tags = Array.isArray(data.tags) ? data.tags : [];
      const links = extractLinks(content);
      const updatedAt = data.updated_at || data.last_edited_time || getUpdatedAt(filePath);

      entries.push({
        slug: data.slug,
        title: data.title,
        lite_summary: liteSummary,
        full_text_md: content.trim(),
        tags: tags,
        links: links,
        updated_at: updatedAt,
      });
    } catch (error) {
      log(`⚠️  Ошибка обработки ${filePath}: ${error.message}`);
    }
  }

  // Записываем JSONL (каждая строка - валидный JSON)
  const jsonlLines = entries.map(entry => JSON.stringify(entry));
  writeFileSync(OUTPUT_PATH, jsonlLines.join('\n') + '\n', 'utf8');

  log(`✅ Создан ${OUTPUT_PATH}`);
  log(`   Записей: ${entries.length}`);

  // Создаём схему JSON Schema
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'KB Terms JSONL Schema v1',
    description: 'Schema for kb_terms.v1.jsonl - one JSON object per line',
    type: 'object',
    required: ['slug', 'title', 'lite_summary', 'full_text_md', 'tags', 'links', 'updated_at'],
    properties: {
      slug: {
        type: 'string',
        description: 'URL-friendly slug for the term',
      },
      title: {
        type: 'string',
        description: 'Display title of the term',
      },
      lite_summary: {
        type: 'string',
        description: 'Brief summary (max 200 chars)',
        maxLength: 200,
      },
      full_text_md: {
        type: 'string',
        description: 'Full Markdown content of the document',
      },
      tags: {
        type: 'array',
        description: 'Array of tags from front matter',
        items: {
          type: 'string',
        },
      },
      links: {
        type: 'array',
        description: 'Array of internal links found in content',
        items: {
          type: 'string',
        },
      },
      updated_at: {
        type: 'string',
        description: 'ISO 8601 timestamp of last update',
        format: 'date-time',
      },
    },
    additionalProperties: false,
  };

  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf8');
  log(`✅ Создана схема: ${SCHEMA_PATH}`);
}

main();
