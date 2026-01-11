#!/usr/bin/env node
/**
 * KB Glossary Lite JSONL Generator
 *
 * Генерирует kb_glossary_lite.jsonl из файлов docs/kb/
 * Формат: {"slug":"...","title":"...","lite_summary":"...","link":"kb/..."}
 *
 * Использование:
 *   node scripts/generate-kb-glossary-lite.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KB_DIR = join(__dirname, '../docs/kb');
const OUTPUT_PATH = join(__dirname, '../kb_glossary_lite.jsonl');
const SCHEMA_PATH = join(__dirname, '../kb_glossary_lite.schema.json');

function log(message) {
  console.log(`[kb-glossary-lite] ${message}`);
}

function extractLiteSummary(content, summary) {
  // Используем summary из front matter, если есть
  if (summary && summary.trim().length > 0) {
    return summary.trim();
  }

  // Иначе извлекаем TL;DR из контента
  const tldrMatch = content.match(/##\s+TL;DR\s*\n\n([\s\S]*?)(?=\n##|\n#|$)/);
  if (tldrMatch && tldrMatch[1]) {
    return tldrMatch[1].trim().split('\n').filter(line => line.trim().length > 0).join(' ').slice(0, 300);
  }

  // Или первый абзац
  const firstPara = content.split(/\n{2,}/).find(p => p.trim().length > 0);
  if (firstPara) {
    return firstPara.trim().slice(0, 300);
  }

  return '';
}

function main() {
  log('Генерация kb_glossary_lite.jsonl...');

  if (!existsSync(KB_DIR)) {
    log(`❌ Директория не найдена: ${KB_DIR}`);
    process.exit(1);
  }

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
      const fileName = filePath.split(/[/\\]/).pop();
      const relativePath = `kb/${fileName}`;

      if (!data.slug || !data.title) {
        log(`⚠️  Пропущен файл без slug/title: ${fileName}`);
        continue;
      }

      const liteSummary = extractLiteSummary(content, data.summary);

      entries.push({
        slug: data.slug,
        title: data.title,
        lite_summary: liteSummary,
        link: relativePath,
      });
    } catch (error) {
      log(`⚠️  Ошибка обработки ${filePath}: ${error.message}`);
    }
  }

  // Записываем JSONL (каждая строка - валидный JSON)
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const jsonlLines = entries.map(entry => JSON.stringify(entry));
  writeFileSync(OUTPUT_PATH, jsonlLines.join('\n') + '\n', 'utf8');

  log(`✅ Создан ${OUTPUT_PATH}`);
  log(`   Записей: ${entries.length}`);

  // Создаём схему JSON Schema
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'KB Glossary Lite JSONL Schema',
    description: 'Schema for kb_glossary_lite.jsonl - one JSON object per line',
    type: 'object',
    required: ['slug', 'title', 'lite_summary', 'link'],
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
        description: 'Brief summary (max 300 chars)',
        maxLength: 300,
      },
      link: {
        type: 'string',
        description: 'Relative path to the KB document (e.g., "kb/aliases.md")',
        pattern: '^kb/.+\\.md$',
      },
    },
    additionalProperties: false,
  };

  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf8');
  log(`✅ Создана схема: ${SCHEMA_PATH}`);
}

main();
