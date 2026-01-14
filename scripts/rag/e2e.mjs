#!/usr/bin/env node
/**
 * E2E "вопрос→контекст" для RAG (без генерации)
 *
 * Пробрасывает запрос через tokenize → embed → retrieve,
 * склеивает контекст (max N токенов) и пишет отчёт.
 *
 * Использование:
 *   node scripts/rag/e2e.mjs --q "вопрос" [--max-tokens 2000] [--src kb|stories|both]
 *   node scripts/rag/e2e.mjs --test  # запуск на контрольных вопросах
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tokenize } from './tokenize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ARTIFACTS_DIR = join(__dirname, '../../artifacts/rag');

/**
 * Генерирует эмбеддинг для запроса (та же функция, что в embed.mjs)
 */
function generateQueryEmbedding(text) {
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
 * Загружает эмбеддинги
 */
function loadEmbeddings(sourceType) {
  const { readFileSync, existsSync } = require('fs');
  const embeddingsPath = join(__dirname, '../../data/embeddings', `${sourceType}.jsonl`);
  
  if (!existsSync(embeddingsPath)) {
    return [];
  }
  
  const content = readFileSync(embeddingsPath, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/**
 * Загружает исходные срезы
 */
function loadSlices(sourceType) {
  const { readFileSync, existsSync } = require('fs');
  const slicesPath = join(__dirname, '../../data/slices', sourceType, 'slices.jsonl');
  
  if (!existsSync(slicesPath)) {
    return {};
  }
  
  const content = readFileSync(slicesPath, 'utf8');
  const lines = content.trim().split('\n');
  const slicesMap = {};
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const slice = JSON.parse(line);
      slicesMap[slice.id] = slice;
    } catch {
      continue;
    }
  }
  
  return slicesMap;
}

/**
 * Вычисляет косинусное сходство
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Выполняет поиск (упрощённая версия retrieve)
 */
function retrieve(queryEmbedding, embeddings, k = 5) {
  const results = embeddings.map(emb => ({
    id: emb.id,
    source_id: emb.source_id,
    source_type: emb.source_type,
    score: cosineSimilarity(queryEmbedding, emb.vector),
    meta: emb.meta,
  }));
  
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}

/**
 * Оценивает количество токенов в тексте
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * Склеивает контекст из результатов поиска
 */
function buildContext(results, slicesMap, maxTokens) {
  const contextParts = [];
  let totalTokens = 0;
  
  for (const result of results) {
    const slice = slicesMap[result.id];
    if (!slice || !slice.text) continue;
    
    const sliceTokens = estimateTokens(slice.text);
    
    if (totalTokens + sliceTokens > maxTokens) {
      // Пытаемся добавить часть текста, если есть место
      const remainingTokens = maxTokens - totalTokens;
      if (remainingTokens > 100) { // Минимум 100 токенов для части
        const partialText = slice.text.substring(0, remainingTokens * 4);
        contextParts.push({
          id: result.id,
          source_id: result.source_id,
          score: result.score,
          text: partialText + '...',
          tokens: estimateTokens(partialText),
          truncated: true,
        });
      }
      break;
    }
    
    contextParts.push({
      id: result.id,
      source_id: result.source_id,
      score: result.score,
      text: slice.text,
      tokens: sliceTokens,
      truncated: false,
    });
    
    totalTokens += sliceTokens;
  }
  
  return {
    parts: contextParts,
    totalTokens,
    usedResults: contextParts.length,
  };
}

/**
 * Форматирует отчёт
 */
function formatReport(query, normalizedQuery, context, results, duration) {
  const timestamp = new Date().toISOString();
  
  return {
    timestamp,
    query: {
      original: query,
      normalized: normalizedQuery,
      tokens: estimateTokens(normalizedQuery),
    },
    retrieval: {
      resultsCount: results.length,
      topScore: results[0]?.score || 0,
      minScore: results[results.length - 1]?.score || 0,
      avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length || 0,
    },
    context: {
      partsCount: context.parts.length,
      totalTokens: context.totalTokens,
      usedResults: context.usedResults,
    },
    performance: {
      durationMs: duration,
      durationSec: (duration / 1000).toFixed(2),
    },
    results: results.map(r => ({
      id: r.id,
      source_id: r.source_id,
      score: r.score.toFixed(4),
    })),
    contextParts: context.parts.map(p => ({
      id: p.id,
      source_id: p.source_id,
      score: p.score.toFixed(4),
      tokens: p.tokens,
      truncated: p.truncated,
      preview: p.text.substring(0, 100) + (p.text.length > 100 ? '...' : ''),
    })),
  };
}

/**
 * Сохраняет отчёт в artifacts
 */
function saveReport(report, querySlug) {
  ensureDir(ARTIFACTS_DIR);
  
  const filename = `e2e-${querySlug}-${Date.now()}.json`;
  const filepath = join(ARTIFACTS_DIR, filename);
  
  writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
  
  console.log(`\n📄 Отчёт сохранён: ${filepath}`);
  
  return filepath;
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Создаёт slug из текста запроса
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Контрольные вопросы для тестирования
 */
const TEST_QUERIES = [
  'Что такое автолинкинг?',
  'Как работает система тегов?',
  'Какие есть инструменты для автоматизации?',
  'Как экспортировать данные для RAG?',
  'Что такое canonical slug?',
];

function main() {
  const args = process.argv.slice(2);
  
  // Режим тестирования
  if (args.includes('--test')) {
    console.log('🧪 Запуск E2E тестов на контрольных вопросах...\n');
    
    const { readFileSync } = require('fs');
    const sources = ['kb'];
    let maxTokens = 2000;
    
    // Загружаем эмбеддинги и срезы один раз
    const allEmbeddings = [];
    const allSlicesMap = {};
    
    for (const sourceType of sources) {
      const embeddings = loadEmbeddings(sourceType);
      allEmbeddings.push(...embeddings);
      
      const slicesMap = loadSlices(sourceType);
      Object.assign(allSlicesMap, slicesMap);
    }
    
    console.log(`📦 Загружено ${allEmbeddings.length} эмбеддингов`);
    console.log(`📄 Загружено ${Object.keys(allSlicesMap).length} срезов\n`);
    
    const reports = [];
    
    for (const query of TEST_QUERIES) {
      console.log(`\n🔍 Обработка: "${query}"`);
      
      const startTime = Date.now();
      
      // 1. Токенизация
      const tokenized = tokenize(query);
      const normalizedQuery = tokenized.normalized;
      
      // 2. Эмбеддинг
      const queryEmbedding = generateQueryEmbedding(normalizedQuery);
      
      // 3. Поиск
      const results = retrieve(queryEmbedding, allEmbeddings, 5);
      
      // 4. Контекст
      const context = buildContext(results, allSlicesMap, maxTokens);
      
      const duration = Date.now() - startTime;
      
      // 5. Отчёт
      const report = formatReport(query, normalizedQuery, context, results, duration);
      reports.push(report);
      
      console.log(`   ✅ Найдено ${results.length} результатов, контекст: ${context.totalTokens} токенов`);
      console.log(`   ⏱️  Время: ${report.performance.durationSec}s`);
    }
    
    // Сохраняем сводный отчёт
    const summaryReport = {
      timestamp: new Date().toISOString(),
      testQueries: TEST_QUERIES.length,
      reports,
      summary: {
        avgResults: reports.reduce((sum, r) => sum + r.retrieval.resultsCount, 0) / reports.length,
        avgContextTokens: reports.reduce((sum, r) => sum + r.context.totalTokens, 0) / reports.length,
        avgDurationMs: reports.reduce((sum, r) => sum + r.performance.durationMs, 0) / reports.length,
      },
    };
    
    const summaryPath = saveReport(summaryReport, 'test-summary');
    console.log(`\n✅ Все тесты завершены. Сводный отчёт: ${summaryPath}`);
    
    return;
  }
  
  // Обычный режим
  let query = null;
  let source = 'both';
  let maxTokens = 2000;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--q' && args[i + 1]) {
      query = args[i + 1];
      i++;
    } else if (args[i] === '--src' && args[i + 1]) {
      source = args[i + 1];
      i++;
    } else if (args[i] === '--max-tokens' && args[i + 1]) {
      maxTokens = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  if (!query) {
    console.error('❌ Не указан запрос. Используйте: --q "текст запроса"');
    console.error('   Или запустите тесты: --test');
    process.exit(1);
  }
  
  console.log(`🚀 E2E обработка запроса: "${query}"\n`);
  
  const startTime = Date.now();
  
  // 1. Токенизация
  console.log('1️⃣  Токенизация...');
  const tokenized = tokenize(query);
  const normalizedQuery = tokenized.normalized;
  console.log(`   Нормализовано: "${normalizedQuery}"`);
  
  // 2. Эмбеддинг
  console.log('\n2️⃣  Генерация эмбеддинга...');
  const queryEmbedding = generateQueryEmbedding(normalizedQuery);
  console.log(`   Размерность: ${queryEmbedding.length}`);
  
  // 3. Загрузка данных
  console.log('\n3️⃣  Загрузка эмбеддингов и срезов...');
  const sources = source === 'both' ? ['kb', 'stories'] : [source];
  const allEmbeddings = [];
  const allSlicesMap = {};
  
  for (const sourceType of sources) {
    const embeddings = loadEmbeddings(sourceType);
    allEmbeddings.push(...embeddings);
    console.log(`   ✅ ${sourceType}: ${embeddings.length} эмбеддингов`);
    
    const slicesMap = loadSlices(sourceType);
    Object.assign(allSlicesMap, slicesMap);
    console.log(`   ✅ ${sourceType}: ${Object.keys(slicesMap).length} срезов`);
  }
  
  // 4. Поиск
  console.log('\n4️⃣  Поиск...');
  const results = retrieve(queryEmbedding, allEmbeddings, 10);
  console.log(`   Найдено ${results.length} результатов`);
  if (results.length > 0) {
    console.log(`   Top score: ${results[0].score.toFixed(4)}`);
  }
  
  // 5. Контекст
  console.log(`\n5️⃣  Построение контекста (max ${maxTokens} токенов)...`);
  const context = buildContext(results, allSlicesMap, maxTokens);
  console.log(`   Использовано ${context.parts.length} частей`);
  console.log(`   Всего токенов: ${context.totalTokens}`);
  
  const duration = Date.now() - startTime;
  
  // 6. Отчёт
  console.log('\n6️⃣  Формирование отчёта...');
  const report = formatReport(query, normalizedQuery, context, results, duration);
  
  const querySlug = createSlug(query);
  const reportPath = saveReport(report, querySlug);
  
  console.log('\n✅ E2E обработка завершена');
  console.log(`\n📊 Краткая статистика:`);
  console.log(`   Запрос: "${query}"`);
  console.log(`   Результатов: ${results.length}`);
  console.log(`   Контекст: ${context.totalTokens} токенов`);
  console.log(`   Время: ${report.performance.durationSec}s`);
  console.log(`   Отчёт: ${reportPath}`);
}

main();
