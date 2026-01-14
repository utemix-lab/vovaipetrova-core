#!/usr/bin/env node
/**
 * Экспорт Stories JSONL (машинная линия)
 *
 * Генерирует data/exports/stories.v1.jsonl с данными эпизодов Stories:
 * - slug: идентификатор эпизода
 * - tldr: краткое описание (summary из front matter)
 * - machine_report_md: содержимое секции MACHINE_REPORT (если есть)
 * - refs: объект с массивами prs[] и commits[]
 * - series_id: идентификатор серии (если есть)
 * - updated_at: дата последнего обновления
 *
 * Использование:
 *   node scripts/export-stories-jsonl.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORIES_DIR = join(__dirname, '../docs/stories');
const OUTPUT_DIR = join(__dirname, '../data/exports');
const OUTPUT_PATH = join(OUTPUT_DIR, 'stories.v1.jsonl');
const SCHEMA_DIR = join(__dirname, '../docs/data-schemas');
const SCHEMA_PATH = join(SCHEMA_DIR, 'stories.schema.json');

function log(message) {
  console.log(`[export-stories-jsonl] ${message}`);
}

/**
 * Извлекает секцию MACHINE_REPORT из контента
 */
function extractMachineReport(content) {
  // Ищем секцию ## MACHINE_REPORT или ## MACHINE REPORT
  const machineReportRegex = /##\s+MACHINE[_\s]REPORT\s*\n\n([\s\S]*?)(?=\n##\s+|$)/i;
  const match = content.match(machineReportRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Извлекает ссылки на PR из front matter и контента
 */
function extractPRs(data, content) {
  const prs = [];
  
  // Из front matter
  if (data.pr_number && data.pr_url) {
    prs.push({
      number: typeof data.pr_number === 'number' ? data.pr_number : parseInt(data.pr_number, 10),
      url: data.pr_url,
    });
  }

  // Из контента (ищем ссылки вида [PR #123](url))
  const prRegex = /\[PR\s+#(\d+)\]\((https:\/\/github\.com\/[^)]+)\)/gi;
  let match;
  while ((match = prRegex.exec(content)) !== null) {
    const number = parseInt(match[1], 10);
    const url = match[2];
    // Проверяем, не дубликат ли это
    if (!prs.find(p => p.number === number)) {
      prs.push({ number, url });
    }
  }

  return prs;
}

/**
 * Извлекает ссылки на коммиты из контента
 */
function extractCommits(content) {
  const commits = [];
  // Ищем ссылки на коммиты в формате [commit hash](url) или прямые ссылки
  const commitRegex = /\[([a-f0-9]{7,40})\]\((https:\/\/github\.com\/[^)]+\/commit\/[a-f0-9]+)\)/gi;
  let match;
  while ((match = commitRegex.exec(content)) !== null) {
    const hash = match[1];
    const url = match[2];
    if (!commits.find(c => c.hash === hash)) {
      commits.push({ hash, url });
    }
  }
  return commits;
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
  log('Экспорт Stories JSONL (машинная линия)...');

  if (!existsSync(STORIES_DIR)) {
    log(`❌ Директория не найдена: ${STORIES_DIR}`);
    process.exit(1);
  }

  // Создаём выходные директории
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(SCHEMA_DIR, { recursive: true });

  // Ищем все эпизоды (исключаем дайджесты, шаблоны и концепты)
  const storyFiles = globSync(`${STORIES_DIR}/*.md`, { nodir: true })
    .filter(f => {
      const fileName = f.split(/[/\\]/).pop();
      // Исключаем дайджесты, шаблоны, концепты
      if (
        fileName.startsWith('digest-') ||
        fileName.startsWith('episode-') ||
        fileName.startsWith('concept-') ||
        fileName.startsWith('stories-') ||
        fileName.startsWith('gateway-') ||
        fileName.startsWith('opus4-') ||
        fileName.startsWith('seed-') ||
        fileName.includes('template') ||
        fileName.includes('readme') ||
        fileName.includes('quick-start') ||
        fileName.includes('shared-context') ||
        fileName.includes('instructions')
      ) {
        return false;
      }
      return true;
    })
    .sort();

  log(`Найдено ${storyFiles.length} файлов эпизодов`);

  const entries = [];

  for (const filePath of storyFiles) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);

      if (!data.slug) {
        log(`⚠️  Пропущен файл без slug: ${filePath}`);
        continue;
      }

      const tldr = data.summary || '';
      const machineReportMd = extractMachineReport(content);
      const prs = extractPRs(data, content);
      const commits = extractCommits(content);
      const seriesId = data.series_id || null;
      const updatedAt = data.updated_at || data.last_edited_time || data.merged_at || getUpdatedAt(filePath);

      entries.push({
        slug: data.slug,
        tldr: tldr,
        machine_report_md: machineReportMd || null,
        refs: {
          prs: prs,
          commits: commits,
        },
        series_id: seriesId,
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
    title: 'Stories JSONL Schema v1',
    description: 'Schema for stories.v1.jsonl - one JSON object per line',
    type: 'object',
    required: ['slug', 'tldr', 'machine_report_md', 'refs', 'series_id', 'updated_at'],
    properties: {
      slug: {
        type: 'string',
        description: 'URL-friendly slug for the episode',
      },
      tldr: {
        type: 'string',
        description: 'Brief summary from front matter',
      },
      machine_report_md: {
        type: ['string', 'null'],
        description: 'Content of MACHINE_REPORT section (if exists)',
      },
      refs: {
        type: 'object',
        description: 'References to PRs and commits',
        required: ['prs', 'commits'],
        properties: {
          prs: {
            type: 'array',
            description: 'Array of PR references',
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
            },
          },
          commits: {
            type: 'array',
            description: 'Array of commit references',
            items: {
              type: 'object',
              required: ['hash', 'url'],
              properties: {
                hash: {
                  type: 'string',
                  description: 'Commit hash',
                },
                url: {
                  type: 'string',
                  description: 'Commit URL',
                  format: 'uri',
                },
              },
            },
          },
        },
      },
      series_id: {
        type: ['string', 'null'],
        description: 'Series identifier (if episode belongs to a series)',
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
