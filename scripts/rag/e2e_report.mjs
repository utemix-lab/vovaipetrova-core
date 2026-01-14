#!/usr/bin/env node
/**
 * E2E отчёт для RAG (регрессионное тестирование)
 *
 * Генерирует сводную таблицу после каждого обновления эмбеддингов.
 *
 * Использование:
 *   node scripts/rag/e2e_report.mjs [--golden-set path/to/golden_set.jsonl]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tokenize } from './tokenize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GOLDEN_SET_PATH = join(__dirname, '../../data/rag/golden_set.jsonl');
const ARTIFACTS_DIR = join(__dirname, '../../artifacts/rag');
const PROTOTYPE_DIR = join(__dirname, '../../prototype');

/**
 * Генерирует эмбеддинг для запроса
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
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Извлекает source_type из notes (если указан)
 */
function getSourceTypeFromNotes(notes) {
  if (!notes || typeof notes !== 'string') return 'both';
  const match = notes.match(/source_type=([a-z]+)/i);
  if (!match) return 'both';
  const value = match[1].toLowerCase();
  if (value === 'kb' || value === 'stories' || value === 'both') {
    return value;
  }
  return 'both';
}

/**
 * Загружает эмбеддинги
 */
function loadEmbeddings(sourceType) {
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
 * Выполняет поиск
 */
function retrieve(queryEmbedding, embeddings, k = 5) {
  const results = embeddings.map(emb => {
    const score = cosineSimilarity(queryEmbedding, emb.vector);
    return {
      id: emb.id,
      source_id: emb.source_id,
      score,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}

/**
 * Загружает golden set
 */
function loadGoldenSet(path) {
  if (!existsSync(path)) {
    return [];
  }

  const content = readFileSync(path, 'utf8');
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
 * Генерирует HTML отчёт
 */
function generateHTMLReport(results, timestamp) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAG E2E Report — ${timestamp}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
    }
    h1 { color: #333; }
    .summary {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f0f0f0;
      font-weight: 600;
    }
    .status-pass { color: green; }
    .status-fail { color: red; }
    .score { font-family: monospace; }
  </style>
</head>
<body>
  <h1>RAG E2E Report</h1>
  <div class="summary">
    <p><strong>Дата:</strong> ${timestamp}</p>
    <p><strong>Всего вопросов:</strong> ${results.length}</p>
    <p><strong>Успешных:</strong> ${results.filter(r => r.passed).length}</p>
    <p><strong>Проваленных:</strong> ${results.filter(r => !r.passed).length}</p>
  </div>

  <h2 id="rag">Результаты по вопросам</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Вопрос</th>
        <th>Ожидалось</th>
        <th>Найдено</th>
        <th>Топ-1 Score</th>
        <th>Статус</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(r => `
        <tr>
          <td>${r.id}</td>
          <td>${r.question}</td>
          <td>${r.expected.join(', ')}</td>
          <td>${r.retrieved.length > 0 ? r.retrieved[0].source_id : '—'}</td>
          <td class="score">${r.retrieved.length > 0 ? r.retrieved[0].score.toFixed(4) : '—'}</td>
          <td class="${r.passed ? 'status-pass' : 'status-fail'}">${r.passed ? '✅' : '❌'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

function main() {
  const args = process.argv.slice(2);
  let goldenSetPath = GOLDEN_SET_PATH;

  if (args.includes('--golden-set') && args[args.indexOf('--golden-set') + 1]) {
    goldenSetPath = args[args.indexOf('--golden-set') + 1];
  }

  console.log('📊 Генерация E2E отчёта для RAG\n');

  // Загрузка данных
  const goldenSet = loadGoldenSet(goldenSetPath);
  const kbEmbeddings = loadEmbeddings('kb');
  const storiesEmbeddings = loadEmbeddings('stories');
  const allEmbeddings = [...kbEmbeddings, ...storiesEmbeddings];

  if (goldenSet.length === 0) {
    console.error('❌ Golden set пуст или не найден');
    process.exit(1);
  }

  if (allEmbeddings.length === 0) {
    console.error('❌ Эмбеддинги не найдены');
    process.exit(1);
  }

  console.log(`✅ Загружено:`);
  console.log(`   Вопросов: ${goldenSet.length}`);
  console.log(`   Эмбеддингов: ${allEmbeddings.length}\n`);

  // Обработка каждого вопроса
  const results = [];

  for (const question of goldenSet) {
    const tokenized = tokenize(question.question);
    const queryEmbedding = generateQueryEmbedding(tokenized.normalized);

    const sourceType = getSourceTypeFromNotes(question.notes);
    const sources = sourceType === 'both' ? ['kb', 'stories'] : [sourceType];

    let relevantEmbeddings = allEmbeddings;
    if (sourceType !== 'both') {
      relevantEmbeddings = allEmbeddings.filter(emb => emb.source_type === sourceType);
    }

    const retrieved = retrieve(queryEmbedding, relevantEmbeddings, 5);
    const retrievedIds = retrieved.map(r => r.source_id);
    const expectedIds = question.expected_ids || [];
    const passed = expectedIds.some(expected => retrievedIds.includes(expected));

    results.push({
      id: question.id,
      question: question.question,
      expected: expectedIds,
      notes: question.notes || '',
      retrieved: retrieved,
      passed,
    });
  }

  // Генерация отчётов
  const timestamp = new Date().toISOString().split('T')[0];
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  // JSON отчёт
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
    },
    results,
  };

  const jsonPath = join(ARTIFACTS_DIR, `e2e_report_${timestamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  // HTML отчёт
  const htmlPath = join(PROTOTYPE_DIR, `rag-e2e-report.html`);
  const html = generateHTMLReport(results, timestamp);
  writeFileSync(htmlPath, html);

  console.log(`📄 JSON отчёт: ${jsonPath}`);
  console.log(`📄 HTML отчёт: ${htmlPath}`);
  console.log(`\n✅ Отчёты сгенерированы`);
}

main();
