#!/usr/bin/env node
/**
 * Stories Digests JSONL Generator
 *
 * Генерирует stories_digests.jsonl из файлов docs/stories/digest-*.md
 * Формат: {"slug":"digest-2026-01","title":"...","episodes":[...],"generated_at":"..."}
 *
 * Использование:
 *   node scripts/generate-stories-digests.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORIES_DIR = join(__dirname, '../docs/stories');
const OUTPUT_PATH = join(__dirname, '../prototype/data/stories_digests.jsonl');
const SCHEMA_PATH = join(__dirname, '../prototype/data/stories_digests.schema.json');

function log(message) {
  console.log(`[stories-digests] ${message}`);
}

function extractEpisodes(content) {
  const episodes = [];
  // Ищем секции эпизодов в формате "## Эпизод: ..."
  const episodeRegex = /##\s+Эпизод:\s+(.+?)\n\n([\s\S]*?)(?=\n---|\n##|$)/g;
  let match;

  while ((match = episodeRegex.exec(content)) !== null) {
    const episodeTitle = match[1].trim();
    const episodeContent = match[2].trim();

    // Извлекаем дату
    const dateMatch = episodeContent.match(/\*\*Дата:\*\*\s+(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : null;

    // Извлекаем краткое описание
    const descMatch = episodeContent.match(/\*\*Краткое описание:\*\*\s+(.+?)(?=\n\n|\*\*|$)/);
    const description = descMatch ? descMatch[1].trim() : null;

    // Извлекаем PR ссылки
    const prLinks = [];
    const prRegex = /\[PR\s+#(\d+)\]\((https:\/\/github\.com\/[^)]+)\)/g;
    let prMatch;
    while ((prMatch = prRegex.exec(episodeContent)) !== null) {
      prLinks.push({
        number: parseInt(prMatch[1], 10),
        url: prMatch[2],
      });
    }

    // Извлекаем ссылку на эпизод
    const linkMatch = episodeContent.match(/\[Читать эпизод\s+→\]\(\.\/(.+?)\)/);
    const link = linkMatch ? linkMatch[1] : null;

    episodes.push({
      title: episodeTitle,
      date: date,
      description: description,
      pr_links: prLinks.length > 0 ? prLinks : [],
      link: link,
    });
  }

  return episodes;
}

function main() {
  log('Генерация stories_digests.jsonl...');

  if (!existsSync(STORIES_DIR)) {
    log(`❌ Директория не найдена: ${STORIES_DIR}`);
    process.exit(1);
  }

  const digestFiles = globSync(`${STORIES_DIR}/digest-*.md`, { nodir: true })
    .sort((a, b) => {
      // Сортируем по дате в slug (digest-YYYY-MM)
      const dateA = a.match(/digest-(\d{4}-\d{2})/);
      const dateB = b.match(/digest-(\d{4}-\d{2})/);
      if (dateA && dateB) {
        return dateB[1].localeCompare(dateA[1]); // Новые первыми
      }
      return a.localeCompare(b);
    });

  log(`Найдено ${digestFiles.length} файлов дайджестов`);

  const entries = [];

  for (const filePath of digestFiles) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);

      if (!data.slug || !data.title) {
        log(`⚠️  Пропущен файл без slug/title: ${filePath}`);
        continue;
      }

      const episodes = extractEpisodes(content);
      const generatedAt = data.generated_at || data.last_edited_time || new Date().toISOString();

      entries.push({
        slug: data.slug,
        title: data.title,
        summary: data.summary || '',
        episodes: episodes,
        generated_at: generatedAt,
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
  log(`   Дайджестов: ${entries.length}`);
  log(`   Всего эпизодов: ${entries.reduce((sum, e) => sum + e.episodes.length, 0)}`);

  // Создаём схему JSON Schema
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Stories Digests JSONL Schema',
    description: 'Schema for stories_digests.jsonl - one JSON object per line',
    type: 'object',
    required: ['slug', 'title', 'episodes', 'generated_at'],
    properties: {
      slug: {
        type: 'string',
        description: 'URL-friendly slug for the digest (e.g., "digest-2026-01")',
        pattern: '^digest-\\d{4}-\\d{2}$',
      },
      title: {
        type: 'string',
        description: 'Display title of the digest',
      },
      summary: {
        type: 'string',
        description: 'Brief summary of the digest',
      },
      episodes: {
        type: 'array',
        description: 'List of episodes in the digest',
        items: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              description: 'Title of the episode',
            },
            date: {
              type: 'string',
              description: 'Date of the episode (YYYY-MM-DD)',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$',
            },
            description: {
              type: 'string',
              description: 'Brief description of the episode',
            },
            pr_links: {
              type: 'array',
              description: 'List of PR links',
              items: {
                type: 'object',
                required: ['number', 'url'],
                properties: {
                  number: {
                    type: 'integer',
                    description: 'PR number',
                  },
                  url: {
                    type: 'string',
                    description: 'PR URL',
                    format: 'uri',
                  },
                },
                additionalProperties: false,
              },
            },
            link: {
              type: 'string',
              description: 'Relative path to the episode file',
            },
          },
          additionalProperties: false,
        },
      },
      generated_at: {
        type: 'string',
        description: 'ISO 8601 timestamp when the digest was generated',
        format: 'date-time',
      },
    },
    additionalProperties: false,
  };

  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf8');
  log(`✅ Создана схема: ${SCHEMA_PATH}`);
}

main();
