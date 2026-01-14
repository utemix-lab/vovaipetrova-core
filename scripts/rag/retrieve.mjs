#!/usr/bin/env node
/**
 * Поисковый скелет (retrieval API) для RAG
 *
 * Выполняет поиск по эмбеддингам с использованием косинусного расстояния.
 * Поддерживает фильтрацию по источникам, тегам и series_id.
 *
 * Использование:
 *   node scripts/rag/retrieve.mjs --q "вопрос" --src kb --k 5
 *   node scripts/rag/retrieve.mjs --q "вопрос" --src both --k 10 --tags "tag1,tag2"
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tokenize as tokenizeText } from './tokenize.mjs';
import { extractSnippet } from './snippet-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EMBEDDINGS_DIR = join(__dirname, '../../data/embeddings');
const SLICES_DIR = join(__dirname, '../../data/slices');
const OVERRIDES_PATH = join(__dirname, '../../data/rag/overrides.json');
const RAG_CONFIG_PATH = join(__dirname, '../../config/rag.json');

const DEFAULT_RAG_CONFIG = {
  k: 5,
  max_context_tokens: 1200,
  min_score: 0,
  snippet_max_length: 300,
  snippet_context_before: 50,
  snippet_context_after: 50,
};

/**
 * Вычисляет косинусное сходство между двумя векторами
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error(`Размерности векторов не совпадают: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Загружает эмбеддинги из JSONL файла
 */
function loadEmbeddings(sourceType) {
  const embeddingsPath = join(EMBEDDINGS_DIR, `${sourceType}.jsonl`);

  if (!existsSync(embeddingsPath)) {
    console.warn(`⚠️  Файл эмбеддингов не найден: ${embeddingsPath}`);
    return [];
  }

  const content = readFileSync(embeddingsPath, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());

  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      console.warn(`⚠️  Ошибка парсинга строки ${index + 1}: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Загружает исходные срезы для получения полного текста
 */
function loadSliceText(sliceId, sourceType) {
  const slicesPath = join(SLICES_DIR, sourceType, 'slices.jsonl');

  if (!existsSync(slicesPath)) {
    return null;
  }

  const content = readFileSync(slicesPath, 'utf8');
  const lines = content.trim().split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const slice = JSON.parse(line);
      if (slice.id === sliceId) {
        return slice.text || '';
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

/**
 * Фильтрует эмбеддинги по тегам
 */
function filterByTags(embeddings, tags) {
  if (!tags || tags.length === 0) return embeddings;

  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  return embeddings.filter(emb => {
    const embTags = (emb.meta?.tags || []).map(t => t.toLowerCase());
    return embTags.some(t => tagSet.has(t));
  });
}

/**
 * Фильтрует эмбеддинги по series_id (для Stories)
 */
function filterBySeries(embeddings, seriesId) {
  if (!seriesId) return embeddings;

  return embeddings.filter(emb => {
    // Проверяем метаданные на наличие series_id
    return emb.meta?.series_id === seriesId;
  });
}

/**
 * Загружает оверрайды (blacklist/boost)
 */
function loadOverrides() {
  if (!existsSync(OVERRIDES_PATH)) {
    return { blacklist: [], boost: [] };
  }

  try {
    const content = readFileSync(OVERRIDES_PATH, 'utf8');
    const overrides = JSON.parse(content);
    return {
      blacklist: overrides.blacklist || [],
      boost: overrides.boost || [],
    };
  } catch (error) {
    console.warn(`⚠️  Ошибка загрузки overrides: ${error.message}`);
    return { blacklist: [], boost: [] };
  }
}

/**
 * Загружает RAG конфиг (если доступен)
 */
function loadRagConfig() {
  if (!existsSync(RAG_CONFIG_PATH)) {
    return { ...DEFAULT_RAG_CONFIG };
  }
  try {
    const content = readFileSync(RAG_CONFIG_PATH, 'utf8');
    const data = JSON.parse(content);
    return { ...DEFAULT_RAG_CONFIG, ...data };
  } catch (error) {
    console.warn(`⚠️  Ошибка загрузки rag config: ${error.message}`);
    return { ...DEFAULT_RAG_CONFIG };
  }
}

/**
 * Выполняет поиск по эмбеддингам с учётом оверрайдов
 */
function retrieve(queryEmbedding, embeddings, options = {}) {
  const {
    k = 5,
    minScore = 0,
    tags = null,
    seriesId = null,
    overrides = null,
  } = options;

  // Загрузка оверрайдов
  const overridesData = overrides || loadOverrides();
  const blacklistSet = new Set(overridesData.blacklist.map(item => item.id));
  const boostMap = new Map(overridesData.boost.map(item => [item.id, item.weight]));

  // Фильтрация
  let filtered = embeddings;

  // Применяем blacklist
  filtered = filtered.filter(emb => !blacklistSet.has(emb.id));

  if (tags) {
    filtered = filterByTags(filtered, Array.isArray(tags) ? tags : tags.split(','));
  }

  if (seriesId) {
    filtered = filterBySeries(filtered, seriesId);
  }

  // Вычисление сходства
  const results = filtered.map(emb => {
    let score = cosineSimilarity(queryEmbedding, emb.vector);

    // Применяем boost
    const boostWeight = boostMap.get(emb.id);
    if (boostWeight && boostWeight > 0) {
      score = score * boostWeight;
    }

    return {
      id: emb.id,
      source_id: emb.source_id,
      source_type: emb.source_type,
      score,
      meta: emb.meta,
    };
  });

  // Сортировка по убыванию сходства
  results.sort((a, b) => b.score - a.score);

  // Фильтрация по минимальному порогу
  const filteredResults = results.filter(r => r.score >= minScore);

  // Возвращаем top-k
  return filteredResults.slice(0, k);
}

/**
 * Генерирует эмбеддинг для запроса (использует ту же функцию, что и embed.mjs)
 */
function generateQueryEmbedding(text) {
  // Используем ту же логику, что и в embed.mjs
  // В реальной реализации здесь будет вызов модели эмбеддингов

  const dimensions = 384;
  const vector = [];
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }

  for (let i = 0; i < dimensions; i++) {
    const seed = hash + i * 7919;
    const value = Math.sin(seed) * 0.5 + 0.5;
    vector.push(value);
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / norm);
}

/**
 * Форматирует результат для вывода с улучшенными сниппетами
 */
function formatResult(result, sourceType, ragConfig, query = null) {
  const sliceText = loadSliceText(result.id, sourceType);

  let snippet = 'Текст недоступен';
  let highlighted = false;

  if (sliceText) {
    const maxChars = ragConfig.max_context_tokens ? ragConfig.max_context_tokens * 4 : null;
    const snippetSource = maxChars ? sliceText.slice(0, maxChars) : sliceText;
    if (query) {
      const snippetResult = extractSnippet(snippetSource, query, {
        maxLength: ragConfig.snippet_max_length,
        contextBefore: ragConfig.snippet_context_before,
        contextAfter: ragConfig.snippet_context_after,
        highlight: true,
      });
      snippet = snippetResult.snippet;
      highlighted = snippetResult.highlighted;
    } else {
      snippet = snippetSource.substring(0, ragConfig.snippet_max_length)
        + (snippetSource.length > ragConfig.snippet_max_length ? '...' : '');
    }
  }

  return {
    id: result.id,
    source_id: result.source_id,
    score: result.score.toFixed(4),
    snippet,
    highlighted,
    meta: {
      title: result.meta?.title || '',
      tags: result.meta?.tags || [],
      tokens: result.meta?.tokens || 0,
    }
  };
}

function main() {
  const args = process.argv.slice(2);

  let query = null;
  let source = 'both';
  let k = null;
  let tags = null;
  let seriesId = null;
  let minScore = null;
  const ragConfig = loadRagConfig();

  if (args.includes('--test-overrides')) {
    const queryEmbedding = [1, 0];
    const embeddings = [
      { id: 'keep', source_id: 'keep', source_type: 'kb', vector: [1, 0], meta: {} },
      { id: 'blacklisted', source_id: 'blacklisted', source_type: 'kb', vector: [1, 0], meta: {} },
      { id: 'boosted', source_id: 'boosted', source_type: 'kb', vector: [1, 0], meta: {} },
    ];
    const overridesData = {
      blacklist: [{ id: 'blacklisted' }],
      boost: [{ id: 'boosted', weight: 2 }],
    };
    const results = retrieve(queryEmbedding, embeddings, { k: 3, overrides: overridesData });
    const ids = results.map(r => r.id);
    const passed = !ids.includes('blacklisted') && ids[0] === 'boosted';
    if (!passed) {
      console.error('❌ Overrides test failed:', ids);
      process.exit(1);
    }
    console.log('✅ Overrides test passed');
    return;
  }

  // Парсинг аргументов
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--q' && args[i + 1]) {
      query = args[i + 1];
      i++;
    } else if (args[i] === '--src' && args[i + 1]) {
      source = args[i + 1];
      i++;
    } else if (args[i] === '--k' && args[i + 1]) {
      k = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--tags' && args[i + 1]) {
      tags = args[i + 1];
      i++;
    } else if (args[i] === '--series' && args[i + 1]) {
      seriesId = args[i + 1];
      i++;
    } else if (args[i] === '--min-score' && args[i + 1]) {
      minScore = parseFloat(args[i + 1]);
      i++;
    }
  }

  if (!query) {
    console.error('❌ Не указан запрос. Используйте: --q "текст запроса"');
    process.exit(1);
  }

  if (k === null) k = ragConfig.k;
  if (minScore === null) minScore = ragConfig.min_score;

  console.log(`🔍 Поиск по запросу: "${query}"\n`);

  // Нормализация запроса
  const tokenized = tokenizeText(query);
  const normalizedQuery = tokenized.normalized;

  console.log(`📝 Нормализованный запрос: "${normalizedQuery}"`);
  console.log(`📊 Источники: ${source === 'both' ? 'KB + Stories' : source}`);
  console.log(`🎯 Top-K: ${k}`);
  if (tags) console.log(`🏷️  Теги: ${tags}`);
  if (seriesId) console.log(`📚 Series ID: ${seriesId}`);
  console.log('');

  // Генерация эмбеддинга запроса
  const queryEmbedding = generateQueryEmbedding(normalizedQuery);

  // Загрузка эмбеддингов
  const sources = source === 'both' ? ['kb', 'stories'] : [source];
  let allEmbeddings = [];

  for (const sourceType of sources) {
    const embeddings = loadEmbeddings(sourceType);
    if (embeddings.length > 0) {
      console.log(`✅ Загружено ${embeddings.length} эмбеддингов из ${sourceType}`);
      allEmbeddings = allEmbeddings.concat(embeddings);
    }
  }

  if (allEmbeddings.length === 0) {
    console.error('❌ Не найдено эмбеддингов. Запустите сначала: node scripts/rag/embed.mjs');
    process.exit(1);
  }

  console.log(`📦 Всего эмбеддингов: ${allEmbeddings.length}\n`);

  // Поиск
  const results = retrieve(queryEmbedding, allEmbeddings, {
    k,
    minScore,
    tags,
    seriesId,
  });

  if (results.length === 0) {
    console.log('❌ Результаты не найдены');
    process.exit(0);
  }

  // Форматирование и вывод результатов
  console.log(`✅ Найдено ${results.length} результатов:\n`);

  const formattedResults = results.map((result, index) => {
    const sourceType = result.source_type;
    const formatted = formatResult(result, sourceType, ragConfig, normalizedQuery);

    console.log(`${index + 1}. [${formatted.score}] ${formatted.id}`);
    console.log(`   Источник: ${formatted.source_id} (${sourceType})`);
    if (formatted.meta.title) {
      console.log(`   Заголовок: ${formatted.meta.title}`);
    }
    if (formatted.meta.tags.length > 0) {
      console.log(`   Теги: ${formatted.meta.tags.join(', ')}`);
    }
    console.log(`   Сниппет: ${formatted.snippet}`);
    if (formatted.highlighted) {
      console.log(`   ✨ Подсветка запроса активна`);
    }
    console.log('');

    return formatted;
  });

  // JSON вывод для программного использования
  const jsonOutput = {
    query: normalizedQuery,
    results: formattedResults,
    count: formattedResults.length,
  };

  console.log('📄 JSON вывод:');
  console.log(JSON.stringify(jsonOutput, null, 2));
}

main();
