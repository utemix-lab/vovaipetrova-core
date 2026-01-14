#!/usr/bin/env node
/**
 * Генерация metadata для RAG datapack
 *
 * Использование:
 *   node scripts/rag/update-datapack-meta.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPORTS_DIR = join(__dirname, '../../data/exports');
const EMBEDDINGS_DIR = join(__dirname, '../../data/embeddings');
const SLICES_DIR = join(__dirname, '../../data/slices');
const RAG_DIR = join(__dirname, '../../data/rag');
const META_PATH = join(RAG_DIR, 'datapack.meta.json');

function countJsonlLines(filePath) {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath, 'utf8').trim();
  if (!content) return 0;
  return content.split('\n').filter(line => line.trim().length > 0).length;
}

function getFileTimestamp(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return statSync(filePath).mtime.toISOString();
  } catch (error) {
    return null;
  }
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const kbPath = join(EXPORTS_DIR, 'kb_terms.v1.jsonl');
  const storiesPath = join(EXPORTS_DIR, 'stories.v1.jsonl');
  const slicesKbPath = join(SLICES_DIR, 'kb', 'slices.jsonl');
  const slicesStoriesPath = join(SLICES_DIR, 'stories', 'slices.jsonl');
  const embeddingsKbMetaPath = join(EMBEDDINGS_DIR, 'kb.meta.json');
  const embeddingsStoriesMetaPath = join(EMBEDDINGS_DIR, 'stories.meta.json');

  const kbCount = countJsonlLines(kbPath);
  const storiesCount = countJsonlLines(storiesPath);
  const slicesKbCount = countJsonlLines(slicesKbPath);
  const slicesStoriesCount = countJsonlLines(slicesStoriesPath);

  const embeddingsKbMeta = readJson(embeddingsKbMetaPath) || {};
  const embeddingsStoriesMeta = readJson(embeddingsStoriesMetaPath) || {};
  const embeddingsTotal = (embeddingsKbMeta.count || 0) + (embeddingsStoriesMeta.count || 0);

  const meta = {
    version: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    kb: {
      count: kbCount,
      updated_at: getFileTimestamp(kbPath)
    },
    stories: {
      count: storiesCount,
      updated_at: getFileTimestamp(storiesPath)
    },
    slices: {
      kb: slicesKbCount,
      stories: slicesStoriesCount,
      total: slicesKbCount + slicesStoriesCount
    },
    embeddings: {
      kb: {
        count: embeddingsKbMeta.count || 0,
        dimensions: embeddingsKbMeta.dimensions || 0,
        generated_at: embeddingsKbMeta.generated_at || null
      },
      stories: {
        count: embeddingsStoriesMeta.count || 0,
        dimensions: embeddingsStoriesMeta.dimensions || 0,
        generated_at: embeddingsStoriesMeta.generated_at || null
      },
      total: embeddingsTotal
    }
  };

  if (!existsSync(RAG_DIR)) {
    mkdirSync(RAG_DIR, { recursive: true });
  }

  writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`✅ RAG datapack metadata saved: ${META_PATH}`);
}

main();
