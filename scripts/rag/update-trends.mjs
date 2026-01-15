#!/usr/bin/env node
/**
 * Обновляет тренды RAG готовности (docs/stories/slices) для прототипа
 *
 * Использование:
 *   node scripts/rag/update-trends.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const META_PATH = join(__dirname, '../../data/rag/datapack.meta.json');
const OUTPUT_PATH = join(__dirname, '../../prototype/data/rag-trends.json');
const EXPORTS_DIR = join(__dirname, '../../data/exports');
const SLICES_DIR = join(__dirname, '../../data/slices');

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`⚠️  Failed to read ${filePath}: ${error.message}`);
    return fallback;
  }
}

function ensureDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function toDateKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

function trimSeries(series, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return series.filter(entry => new Date(entry.date) >= cutoff);
}

function countJsonlLines(filePath) {
  if (!existsSync(filePath)) return 0;
  try {
    const content = readFileSync(filePath, 'utf8').trim();
    if (!content) return 0;
    return content.split('\n').filter(line => line.trim()).length;
  } catch (error) {
    console.warn(`⚠️  Failed to read ${filePath}: ${error.message}`);
    return 0;
  }
}

function main() {
  const meta = readJson(META_PATH, null);
  const dateKey = toDateKey(meta?.version || meta?.generated_at);
  let docsCount = 0;
  let storiesCount = 0;
  let slicesCount = 0;

  if (meta) {
    docsCount = meta.kb?.count ?? 0;
    storiesCount = meta.stories?.count ?? 0;
    slicesCount = meta.slices?.total ?? 0;
  } else {
    console.warn(`⚠️  datapack.meta.json не найден: ${META_PATH}. Используем подсчёт из exports/slices.`);
    docsCount = countJsonlLines(join(EXPORTS_DIR, 'kb_terms.v1.jsonl'));
    storiesCount = countJsonlLines(join(EXPORTS_DIR, 'stories.v1.jsonl'));
    slicesCount = countJsonlLines(join(SLICES_DIR, 'kb', 'slices.jsonl'))
      + countJsonlLines(join(SLICES_DIR, 'stories', 'slices.jsonl'));
  }

  const entry = {
    date: dateKey,
    docs_count: docsCount,
    stories_count: storiesCount,
    slices_count: slicesCount,
  };

  const existing = readJson(OUTPUT_PATH, { series: [] });
  const series = Array.isArray(existing.series) ? existing.series : [];
  const filtered = series.filter(item => item.date !== dateKey);
  filtered.push(entry);
  const updated = trimSeries(filtered, 30).sort((a, b) => a.date.localeCompare(b.date));

  ensureDir(OUTPUT_PATH);
  const output = {
    generatedAt: new Date().toISOString(),
    series: updated,
  };
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Updated RAG trends: ${OUTPUT_PATH}`);
}

main();
