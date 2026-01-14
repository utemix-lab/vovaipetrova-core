#!/usr/bin/env node
/**
 * Метрики точности извлечения для RAG
 *
 * Вычисляет метрики accuracy@k, MRR, nDCG по golden_set.
 *
 * Использование:
 *   node scripts/rag/eval_retrieval.mjs [--k 5] [--golden-set path/to/golden_set.jsonl]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tokenize } from './tokenize.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GOLDEN_SET_PATH = join(__dirname, '../../data/rag/golden_set.jsonl');
const ARTIFACTS_DIR = join(__dirname, '../../artifacts/rag');
const EMBEDDINGS_DIR = join(__dirname, '../../data/embeddings');
const SLICES_DIR = join(__dirname, '../../data/slices');

/**
 * Генерирует эмбеддинг для запроса (та же функция, что в retrieve.mjs)
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
 * Загружает эмбеддинги
 */
function loadEmbeddings(sourceType) {
  const embeddingsPath = join(EMBEDDINGS_DIR, `${sourceType}.jsonl`);

  if (!existsSync(embeddingsPath)) {
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
 * Загружает source_mapping для получения source_id из slice_id
 */
function loadSourceMapping() {
  const mappingPath = join(SLICES_DIR, 'source_mapping.json');
  if (!existsSync(mappingPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(mappingPath, 'utf8'));
  } catch (error) {
    console.warn(`⚠️  Ошибка загрузки source_mapping: ${error.message}`);
    return {};
  }
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
 * Пытается определить source_id по slice_id через source_mapping
 */
function resolveSourceId(sliceId, sourceMapping, sourceTypeHint = 'both') {
  const sourceTypes = sourceTypeHint === 'both' ? ['kb', 'stories'] : [sourceTypeHint];
  for (const type of sourceTypes) {
    const mapping = sourceMapping[type] || {};
    for (const [sourceSlug, sliceIds] of Object.entries(mapping)) {
      if (Array.isArray(sliceIds) && sliceIds.includes(sliceId)) {
        return sourceSlug;
      }
    }
  }
  return null;
}

/**
 * Выполняет поиск по эмбеддингам
 */
function retrieve(queryEmbedding, embeddings, k = 5) {
  const results = embeddings.map(emb => {
    const score = cosineSimilarity(queryEmbedding, emb.vector);
    return {
      id: emb.id,
      source_id: emb.source_id,
      source_type: emb.source_type,
      score,
      meta: emb.meta,
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}

/**
 * Вычисляет accuracy@k
 */
function accuracyAtK(retrieved, expected, k) {
  const retrievedSet = new Set(retrieved.slice(0, k).map(r => r.source_id));
  const expectedSet = new Set(expected);

  for (const expectedId of expectedSet) {
    if (retrievedSet.has(expectedId)) {
      return 1;
    }
  }
  return 0;
}

/**
 * Вычисляет Mean Reciprocal Rank (MRR)
 */
function reciprocalRank(retrieved, expected) {
  const expectedSet = new Set(expected);

  for (let i = 0; i < retrieved.length; i++) {
    if (expectedSet.has(retrieved[i].source_id)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Вычисляет Normalized Discounted Cumulative Gain (nDCG)
 */
function nDCG(retrieved, expected, k) {
  const expectedSet = new Set(expected);
  let dcg = 0;
  let idcg = 0;

  // DCG: релевантность на позиции i = 1 если в expected, иначе 0
  for (let i = 0; i < Math.min(retrieved.length, k); i++) {
    const relevance = expectedSet.has(retrieved[i].source_id) ? 1 : 0;
    const position = i + 1;
    dcg += relevance / Math.log2(position + 1);
  }

  // IDCG: идеальный случай (все релевантные документы в начале)
  const numRelevant = Math.min(expected.length, k);
  for (let i = 0; i < numRelevant; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

function generateMarkdownReport(report) {
  const { metrics, summary, k } = report;
  let md = `# RAG eval_retrieval report\n\n`;
  md += `**Дата:** ${report.timestamp}\n`;
  md += `**Top-K:** ${k}\n\n`;
  md += `## Метрики\n\n`;
  md += `- **Accuracy@${k}**: ${metrics.accuracy_at_k.toFixed(4)}\n`;
  md += `- **MRR**: ${metrics.mrr.toFixed(4)}\n`;
  md += `- **nDCG@${k}**: ${metrics.ndcg_at_k.toFixed(4)}\n\n`;
  md += `## Сводка\n\n`;
  md += `- Всего вопросов: ${summary.total_questions}\n`;
  md += `- Успешных: ${summary.correct}\n`;
  md += `- Проваленных: ${summary.incorrect}\n\n`;
  md += `## Детали по вопросам\n\n`;
  md += `| ID | Accuracy | MRR | nDCG | Expected | Retrieved |\n`;
  md += `| --- | --- | --- | --- | --- | --- |\n`;
  report.results.forEach((item) => {
    md += `| ${item.id} | ${item.accuracy.toFixed(3)} | ${item.mrr.toFixed(3)} | ${item.ndcg.toFixed(3)} | ${item.expected.join(', ')} | ${item.retrieved.join(', ')} |\n`;
  });
  md += `\n`;
  return md;
}

function generateHtmlReport(report) {
  const { metrics, summary, k } = report;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAG eval_retrieval — ${report.timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1 { color: #1f2933; }
    .summary { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: 600; }
    .metric { font-family: monospace; }
  </style>
</head>
<body>
  <h1>RAG eval_retrieval report</h1>
  <div class="summary">
    <p><strong>Дата:</strong> ${report.timestamp}</p>
    <p><strong>Top-K:</strong> ${k}</p>
    <p><strong>Accuracy@${k}:</strong> <span class="metric">${metrics.accuracy_at_k.toFixed(4)}</span></p>
    <p><strong>MRR:</strong> <span class="metric">${metrics.mrr.toFixed(4)}</span></p>
    <p><strong>nDCG@${k}:</strong> <span class="metric">${metrics.ndcg_at_k.toFixed(4)}</span></p>
  </div>

  <h2>Сводка</h2>
  <ul>
    <li>Всего вопросов: ${summary.total_questions}</li>
    <li>Успешных: ${summary.correct}</li>
    <li>Проваленных: ${summary.incorrect}</li>
  </ul>

  <h2>Детали по вопросам</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Accuracy</th>
        <th>MRR</th>
        <th>nDCG</th>
        <th>Expected</th>
        <th>Retrieved</th>
      </tr>
    </thead>
    <tbody>
      ${report.results.map(item => `
        <tr>
          <td>${item.id}</td>
          <td class="metric">${item.accuracy.toFixed(3)}</td>
          <td class="metric">${item.mrr.toFixed(3)}</td>
          <td class="metric">${item.ndcg.toFixed(3)}</td>
          <td>${item.expected.join(', ')}</td>
          <td>${item.retrieved.join(', ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Загружает golden set
 */
function loadGoldenSet(path) {
  if (!existsSync(path)) {
    console.error(`❌ Файл golden_set не найден: ${path}`);
    process.exit(1);
  }

  const content = readFileSync(path, 'utf8');
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

function main() {
  const args = process.argv.slice(2);
  let k = 5;
  let goldenSetPath = GOLDEN_SET_PATH;

  // Парсинг аргументов
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--k' && args[i + 1]) {
      k = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--golden-set' && args[i + 1]) {
      goldenSetPath = args[i + 1];
      i++;
    }
  }

  console.log('📊 Оценка точности извлечения RAG\n');
  console.log(`🎯 Top-K: ${k}`);
  console.log(`📋 Golden Set: ${goldenSetPath}\n`);

  // Загрузка golden set
  const goldenSet = loadGoldenSet(goldenSetPath);
  console.log(`✅ Загружено ${goldenSet.length} контрольных вопросов\n`);

  // Загрузка эмбеддингов
  const kbEmbeddings = loadEmbeddings('kb');
  const storiesEmbeddings = loadEmbeddings('stories');
  const allEmbeddings = [...kbEmbeddings, ...storiesEmbeddings];

  if (allEmbeddings.length === 0) {
    console.error('❌ Не найдено эмбеддингов. Запустите сначала: node scripts/rag/embed.mjs');
    process.exit(1);
  }

  console.log(`✅ Загружено ${allEmbeddings.length} эмбеддингов (KB: ${kbEmbeddings.length}, Stories: ${storiesEmbeddings.length})\n`);

  // Загрузка source_mapping
  const sourceMapping = loadSourceMapping();

  // Оценка по каждому вопросу
  const results = [];
  let totalAccuracy = 0;
  let totalMRR = 0;
  let totalNDCG = 0;

  for (const question of goldenSet) {
    const tokenized = tokenize(question.question);
    const queryEmbedding = generateQueryEmbedding(tokenized.normalized);

    // Определяем источники для поиска
    const sourceType = getSourceTypeFromNotes(question.notes);
    const sources = sourceType === 'both' ? ['kb', 'stories'] : [sourceType];

    let relevantEmbeddings = allEmbeddings;
    if (sourceType !== 'both') {
      relevantEmbeddings = allEmbeddings.filter(emb => emb.source_type === sourceType);
    }

    // Поиск
    const retrieved = retrieve(queryEmbedding, relevantEmbeddings, k);

    // Преобразуем slice_id в source_id через mapping
    const retrievedWithSourceId = retrieved.map(r => {
      // Пытаемся найти source_id через mapping
      let sourceId = r.source_id;

      // Ищем в source_mapping
      const resolved = resolveSourceId(r.id, sourceMapping, sourceType);
      if (resolved) {
        sourceId = resolved;
      }

      return {
        ...r,
        source_id: sourceId,
      };
    });

    // Вычисление метрик
    const expectedIds = question.expected_ids || [];
    const acc = accuracyAtK(retrievedWithSourceId, expectedIds, k);
    const rr = reciprocalRank(retrievedWithSourceId, expectedIds);
    const ndcg = nDCG(retrievedWithSourceId, expectedIds, k);

    totalAccuracy += acc;
    totalMRR += rr;
    totalNDCG += ndcg;

    results.push({
      id: question.id,
      question: question.question,
      expected: expectedIds,
      retrieved: retrievedWithSourceId.map(r => r.source_id),
      accuracy: acc,
      mrr: rr,
      ndcg: ndcg,
      notes: question.notes || '',
    });

    console.log(`${question.id}: ${acc === 1 ? '✅' : '❌'} Accuracy=${acc.toFixed(3)}, MRR=${rr.toFixed(3)}, nDCG=${ndcg.toFixed(3)}`);
  }

  // Средние метрики
  const avgAccuracy = totalAccuracy / goldenSet.length;
  const avgMRR = totalMRR / goldenSet.length;
  const avgNDCG = totalNDCG / goldenSet.length;

  console.log('\n📊 Итоговые метрики:');
  console.log(`   Accuracy@${k}: ${avgAccuracy.toFixed(4)}`);
  console.log(`   MRR: ${avgMRR.toFixed(4)}`);
  console.log(`   nDCG@${k}: ${avgNDCG.toFixed(4)}`);

  // Сохранение отчёта
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().split('T')[0];
  const reportBase = `eval_report_${timestamp}`;
  const reportPath = join(ARTIFACTS_DIR, `${reportBase}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    k,
    metrics: {
      accuracy_at_k: avgAccuracy,
      mrr: avgMRR,
      ndcg_at_k: avgNDCG,
    },
    results,
    summary: {
      total_questions: goldenSet.length,
      correct: results.filter(r => r.accuracy === 1).length,
      incorrect: results.filter(r => r.accuracy === 0).length,
    },
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Отчёт сохранён: ${reportPath}`);

  const mdPath = join(ARTIFACTS_DIR, `${reportBase}.md`);
  writeFileSync(mdPath, generateMarkdownReport(report), 'utf8');
  console.log(`📄 Markdown отчёт: ${mdPath}`);

  const htmlPath = join(ARTIFACTS_DIR, `${reportBase}.html`);
  writeFileSync(htmlPath, generateHtmlReport(report), 'utf8');
  console.log(`📄 HTML отчёт: ${htmlPath}`);
}

main();
