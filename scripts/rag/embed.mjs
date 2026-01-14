#!/usr/bin/env node
/**
 * Эмбеддинги для RAG (локальный офлайн режим)
 *
 * Генерирует эмбеддинги для срезов из slices.jsonl.
 * Использует плейсхолдер без внешних зависимостей (готов к интеграции с реальной моделью).
 *
 * Использование:
 *   node scripts/rag/embed.mjs [--source kb|stories|both] [--sample 200]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SLICES_DIR = join(__dirname, '../../data/slices');
const EMBEDDINGS_DIR = join(__dirname, '../../data/embeddings');

/**
 * Плейсхолдер для генерации эмбеддингов
 * В реальной реализации здесь будет вызов локальной модели (например, через @xenova/transformers)
 * 
 * @param {string} text - текст для эмбеддинга
 * @param {number} dimensions - размерность вектора (по умолчанию 384 для small моделей)
 * @returns {number[]} вектор эмбеддинга
 */
function generateEmbedding(text, dimensions = 384) {
  // Плейсхолдер: простая детерминированная функция на основе хеша текста
  // В реальной реализации: использовать локальную модель эмбеддингов
  // Например: @xenova/transformers с моделью 'Xenova/all-MiniLM-L6-v2'
  
  const vector = [];
  let hash = 0;
  
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Генерируем детерминированный вектор на основе хеша
  for (let i = 0; i < dimensions; i++) {
    const seed = hash + i * 7919; // простое число для разнообразия
    const value = Math.sin(seed) * 0.5 + 0.5; // нормализация в [0, 1]
    vector.push(value);
  }
  
  // Нормализация вектора (L2 норма)
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / norm);
}

/**
 * Загружает срезы из JSONL файла
 */
function loadSlices(sourceType) {
  const slicesPath = join(SLICES_DIR, sourceType, 'slices.jsonl');
  
  if (!existsSync(slicesPath)) {
    console.warn(`⚠️  Файл не найден: ${slicesPath}`);
    return [];
  }
  
  const content = readFileSync(slicesPath, 'utf8');
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
 * Генерирует эмбеддинги для срезов
 */
function generateEmbeddings(slices, sourceType, sampleSize = null) {
  const embeddings = [];
  const total = sampleSize ? Math.min(sampleSize, slices.length) : slices.length;
  const selectedSlices = sampleSize ? slices.slice(0, sampleSize) : slices;
  
  console.log(`📊 Генерация эмбеддингов для ${total} срезов (${sourceType})...`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < selectedSlices.length; i++) {
    const slice = selectedSlices[i];
    const text = slice.text || '';
    
    if (!text.trim()) {
      console.warn(`⚠️  Пропущен пустой срез: ${slice.id}`);
      continue;
    }
    
    const vector = generateEmbedding(text);
    
    embeddings.push({
      id: slice.id,
      source_id: slice.source_id,
      source_type: sourceType,
      vector: vector,
      meta: {
        tokens: slice.tokens || 0,
        length: text.length,
        title: slice.metadata?.title || '',
        tags: slice.metadata?.tags || [],
      }
    });
    
    if ((i + 1) % 50 === 0) {
      console.log(`   Обработано: ${i + 1}/${total}`);
    }
  }
  
  const duration = Date.now() - startTime;
  const avgTime = duration / total;
  
  console.log(`✅ Сгенерировано ${embeddings.length} эмбеддингов за ${(duration / 1000).toFixed(2)}s`);
  console.log(`   Среднее время на срез: ${avgTime.toFixed(2)}ms`);
  console.log(`   Размер вектора: ${embeddings[0]?.vector.length || 0} измерений`);
  
  return embeddings;
}

/**
 * Сохраняет эмбеддинги в JSONL формат (плейсхолдер для parquet)
 * 
 * Примечание: В реальной реализации использовать библиотеку parquet (например, parquetjs)
 * для сохранения в формате parquet для эффективного хранения векторов.
 */
function saveEmbeddings(embeddings, sourceType) {
  ensureDir(EMBEDDINGS_DIR);
  
  // Сохраняем в JSONL (временный формат, пока нет parquet библиотеки)
  const outputPath = join(EMBEDDINGS_DIR, `${sourceType}.jsonl`);
  
  const lines = embeddings.map(emb => JSON.stringify(emb));
  writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  
  console.log(`✅ Сохранено: ${outputPath}`);
  console.log(`   Записей: ${embeddings.length}`);
  console.log(`   Размер файла: ${(lines.join('\n').length / 1024).toFixed(2)} KB`);
  
  // Сохраняем метаданные отдельно для быстрого доступа
  const metaPath = join(EMBEDDINGS_DIR, `${sourceType}.meta.json`);
  const metadata = {
    count: embeddings.length,
    dimensions: embeddings[0]?.vector.length || 0,
    source_type: sourceType,
    generated_at: new Date().toISOString(),
    format: 'jsonl', // TODO: перейти на parquet
    note: 'Плейсхолдер: использует детерминированный хеш вместо реальной модели эмбеддингов'
  };
  
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`✅ Метаданные сохранены: ${metaPath}`);
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  
  let source = 'both';
  let sampleSize = null;
  
  // Парсинг аргументов
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      source = args[i + 1];
      i++;
    } else if (args[i] === '--sample' && args[i + 1]) {
      sampleSize = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  console.log('🚀 Генерация эмбеддингов для RAG\n');
  console.log(`📝 Режим: ${source === 'both' ? 'KB + Stories' : source}`);
  if (sampleSize) {
    console.log(`📊 Выборка: ${sampleSize} записей`);
  }
  console.log('⚠️  Используется плейсхолдер (детерминированный хеш)\n');
  
  const sources = source === 'both' ? ['kb', 'stories'] : [source];
  
  for (const sourceType of sources) {
    console.log(`\n📦 Обработка ${sourceType}...`);
    
    const slices = loadSlices(sourceType);
    
    if (slices.length === 0) {
      console.warn(`⚠️  Нет срезов для обработки (${sourceType})`);
      continue;
    }
    
    const embeddings = generateEmbeddings(slices, sourceType, sampleSize);
    
    if (embeddings.length > 0) {
      saveEmbeddings(embeddings, sourceType);
    }
  }
  
  console.log('\n✅ Генерация эмбеддингов завершена');
  console.log('\n📝 Примечание:');
  console.log('   Для использования реальной модели эмбеддингов:');
  console.log('   1. Установить @xenova/transformers: npm install @xenova/transformers');
  console.log('   2. Заменить generateEmbedding() на вызов модели');
  console.log('   3. Добавить библиотеку parquet для сохранения векторов');
}

main();
