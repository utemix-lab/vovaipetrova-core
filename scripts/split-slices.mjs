#!/usr/bin/env node
/**
 * Split-slices для RAG
 *
 * Разбивает экспортированные JSONL файлы на срезы (~1-2k токенов на запись)
 * с сохранением маппинга обратно к исходным документам.
 *
 * Использование:
 *   node scripts/split-slices.mjs [--source kb|stories|both] [--max-tokens 2000]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXPORTS_DIR = join(__dirname, '../data/exports');
const SLICES_DIR = join(__dirname, '../data/slices');
const MAX_TOKENS_DEFAULT = 2000;

// Простая оценка токенов: ~4 символа на токен для русского/английского текста
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Разбивает текст на абзацы и группирует их в срезы
 */
function splitIntoSlices(text, maxTokens, sourceId, sourceType) {
  const slices = [];
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 0);

  let currentSlice = {
    text: '',
    tokens: 0,
    paragraphs: [],
  };

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);

    // Если параграф сам по себе больше лимита, разбиваем его на предложения
    if (paraTokens > maxTokens) {
      // Сохраняем текущий срез, если есть
      if (currentSlice.text.trim().length > 0) {
        slices.push({
          id: `${sourceType}_${sourceId}_${slices.length}`,
          source_id: sourceId,
          source_type: sourceType,
          text: currentSlice.text.trim(),
          tokens: currentSlice.tokens,
          paragraph_indices: currentSlice.paragraphs,
        });
        currentSlice = { text: '', tokens: 0, paragraphs: [] };
      }

      // Разбиваем большой параграф на предложения
      const sentences = para.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
      let currentSentenceSlice = { text: '', tokens: 0, startPara: paragraphs.indexOf(para) };

      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (currentSentenceSlice.tokens + sentenceTokens > maxTokens && currentSentenceSlice.text.trim().length > 0) {
          slices.push({
            id: `${sourceType}_${sourceId}_${slices.length}`,
            source_id: sourceId,
            source_type: sourceType,
            text: currentSentenceSlice.text.trim(),
            tokens: currentSentenceSlice.tokens,
            paragraph_indices: [currentSentenceSlice.startPara],
          });
          currentSentenceSlice = { text: sentence, tokens: sentenceTokens, startPara: paragraphs.indexOf(para) };
        } else {
          currentSentenceSlice.text += (currentSentenceSlice.text ? ' ' : '') + sentence;
          currentSentenceSlice.tokens += sentenceTokens;
        }
      }

      // Сохраняем последний срез из предложений
      if (currentSentenceSlice.text.trim().length > 0) {
        slices.push({
          id: `${sourceType}_${sourceId}_${slices.length}`,
          source_id: sourceId,
          source_type: sourceType,
          text: currentSentenceSlice.text.trim(),
          tokens: currentSentenceSlice.tokens,
          paragraph_indices: [currentSentenceSlice.startPara],
        });
      }
    } else if (currentSlice.tokens + paraTokens > maxTokens) {
      // Текущий срез заполнен, сохраняем его
      if (currentSlice.text.trim().length > 0) {
        slices.push({
          id: `${sourceType}_${sourceId}_${slices.length}`,
          source_id: sourceId,
          source_type: sourceType,
          text: currentSlice.text.trim(),
          tokens: currentSlice.tokens,
          paragraph_indices: currentSlice.paragraphs,
        });
      }
      currentSlice = { text: para, tokens: paraTokens, paragraphs: [paragraphs.indexOf(para)] };
    } else {
      // Добавляем параграф к текущему срезу
      currentSlice.text += (currentSlice.text ? '\n\n' : '') + para;
      currentSlice.tokens += paraTokens;
      if (!currentSlice.paragraphs.includes(paragraphs.indexOf(para))) {
        currentSlice.paragraphs.push(paragraphs.indexOf(para));
      }
    }
  }

  // Сохраняем последний срез
  if (currentSlice.text.trim().length > 0) {
    slices.push({
      id: `${sourceType}_${sourceId}_${slices.length}`,
      source_id: sourceId,
      source_type: sourceType,
      text: currentSlice.text.trim(),
      tokens: currentSlice.tokens,
      paragraph_indices: currentSlice.paragraphs,
    });
  }

  return slices;
}

/**
 * Обрабатывает KB термины
 */
function processKB(source, maxTokens) {
  const slices = [];
  const lines = source.split('\n').filter(line => line.trim().length > 0);

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const text = entry.full_text_md || '';
      const entrySlices = splitIntoSlices(text, maxTokens, entry.slug, 'kb');

      // Добавляем метаданные из исходной записи
      for (const slice of entrySlices) {
        slice.meta = {
          slug: entry.slug,
          title: entry.title,
          lite_summary: entry.lite_summary,
          tags: entry.tags || [],
          links: entry.links || [],
          updated_at: entry.updated_at,
        };
      }

      slices.push(...entrySlices);
    } catch (error) {
      console.warn(`⚠️  Ошибка обработки KB записи: ${error.message}`);
    }
  }

  return slices;
}

/**
 * Обрабатывает Stories эпизоды
 */
function processStories(source, maxTokens) {
  const slices = [];
  const lines = source.split('\n').filter(line => line.trim().length > 0);

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      // Используем machine_report_md, если есть, иначе tldr
      const text = entry.machine_report_md || entry.tldr || '';
      if (!text) continue;

      const entrySlices = splitIntoSlices(text, maxTokens, entry.slug, 'stories');

      // Добавляем метаданные из исходной записи
      for (const slice of entrySlices) {
        slice.meta = {
          slug: entry.slug,
          tldr: entry.tldr,
          series_id: entry.series_id,
          refs: entry.refs || { prs: [], commits: [] },
          updated_at: entry.updated_at,
        };
      }

      slices.push(...entrySlices);
    } catch (error) {
      console.warn(`⚠️  Ошибка обработки Stories записи: ${error.message}`);
    }
  }

  return slices;
}

function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='))?.split('=')[1] ||
                     (args.includes('--source') && args[args.indexOf('--source') + 1]) ||
                     'both';
  const maxTokensArg = args.find(arg => arg.startsWith('--max-tokens='))?.split('=')[1] ||
                       (args.includes('--max-tokens') && args[args.indexOf('--max-tokens') + 1]) ||
                       MAX_TOKENS_DEFAULT;
  const maxTokens = parseInt(maxTokensArg, 10);

  console.log(`[split-slices] Разбиение на срезы (max tokens: ${maxTokens})...`);

  // Создаём директории
  mkdirSync(SLICES_DIR, { recursive: true });
  mkdirSync(join(SLICES_DIR, 'kb'), { recursive: true });
  mkdirSync(join(SLICES_DIR, 'stories'), { recursive: true });

  let kbSlices = [];
  let storiesSlices = [];

  // Обрабатываем KB
  if (sourceArg === 'kb' || sourceArg === 'both') {
    const kbPath = join(EXPORTS_DIR, 'kb_terms.v1.jsonl');
    if (existsSync(kbPath)) {
      console.log('Обработка KB терминов...');
      const kbSource = readFileSync(kbPath, 'utf8');
      kbSlices = processKB(kbSource, maxTokens);
      console.log(`  Создано ${kbSlices.length} срезов из KB`);
    } else {
      console.warn(`⚠️  Файл не найден: ${kbPath}`);
    }
  }

  // Обрабатываем Stories
  if (sourceArg === 'stories' || sourceArg === 'both') {
    const storiesPath = join(EXPORTS_DIR, 'stories.v1.jsonl');
    if (existsSync(storiesPath)) {
      console.log('Обработка Stories эпизодов...');
      const storiesSource = readFileSync(storiesPath, 'utf8');
      storiesSlices = processStories(storiesSource, maxTokens);
      console.log(`  Создано ${storiesSlices.length} срезов из Stories`);
    } else {
      console.warn(`⚠️  Файл не найден: ${storiesPath}`);
    }
  }

  // Сохраняем срезы в JSONL файлы
  if (kbSlices.length > 0) {
    const kbOutputPath = join(SLICES_DIR, 'kb', 'slices.jsonl');
    const kbJsonl = kbSlices.map(slice => JSON.stringify(slice)).join('\n') + '\n';
    writeFileSync(kbOutputPath, kbJsonl, 'utf8');
    console.log(`✅ Создан ${kbOutputPath}`);
  }

  if (storiesSlices.length > 0) {
    const storiesOutputPath = join(SLICES_DIR, 'stories', 'slices.jsonl');
    const storiesJsonl = storiesSlices.map(slice => JSON.stringify(slice)).join('\n') + '\n';
    writeFileSync(storiesOutputPath, storiesJsonl, 'utf8');
    console.log(`✅ Создан ${storiesOutputPath}`);
  }

  // Создаём маппинг обратно к исходным документам
  const mapping = {
    kb: {},
    stories: {},
  };

  for (const slice of kbSlices) {
    if (!mapping.kb[slice.source_id]) {
      mapping.kb[slice.source_id] = [];
    }
    mapping.kb[slice.source_id].push(slice.id);
  }

  for (const slice of storiesSlices) {
    if (!mapping.stories[slice.source_id]) {
      mapping.stories[slice.source_id] = [];
    }
    mapping.stories[slice.source_id].push(slice.id);
  }

  const mappingPath = join(SLICES_DIR, 'source_mapping.json');
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`✅ Создан маппинг: ${mappingPath}`);

  console.log(`\n✅ Разбиение завершено:`);
  console.log(`   KB срезов: ${kbSlices.length}`);
  console.log(`   Stories срезов: ${storiesSlices.length}`);
  console.log(`   Всего: ${kbSlices.length + storiesSlices.length}`);
}

main();
