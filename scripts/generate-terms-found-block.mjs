#!/usr/bin/env node
/**
 * Generate Terms Found Block: генерирует стандартизированный блок "Terms found" для PR body
 * 
 * Читает candidates_kb.json и генерирует короткий и стабильный формат блока Terms found
 * для добавления в PR по Stories.
 * 
 * Использование:
 *   node scripts/generate-terms-found-block.mjs [--max-terms=10] [--max-contexts=2]
 * 
 * Вывод: Markdown блок для вставки в PR body
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';

const CANDIDATES_PATH = 'prototype/data/candidates_kb.json';
const MAX_TERMS = parseInt(process.argv.find(arg => arg.startsWith('--max-terms='))?.split('=')[1] || '10', 10);
const MAX_CONTEXTS = parseInt(process.argv.find(arg => arg.startsWith('--max-contexts='))?.split('=')[1] || '2', 10);

function log(message) {
  console.error(`[terms-found-block] ${message}`);
}

function generateTermsFoundBlock() {
  if (!existsSync(CANDIDATES_PATH)) {
    log(`⚠️  Файл ${CANDIDATES_PATH} не найден. Запустите extractor-stories-terms.mjs сначала.`);
    return null;
  }

  try {
    const data = JSON.parse(readFileSync(CANDIDATES_PATH, 'utf8'));
    const candidates = data.candidates || [];

    if (candidates.length === 0) {
      return null;
    }

    // Сортируем по частоте и берём топ терминов
    const topTerms = candidates
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, MAX_TERMS);

    // Генерируем блок
    const lines = ['## Terms found'];
    lines.push('');
    lines.push('Термины извлечены из файлов Stories для добавления в KB:');
    lines.push('');

    for (const term of topTerms) {
      // Формат: - Термин (slug)
      lines.push(`- **${term.term}** (\`${term.slug}\`)`);

      // Добавляем 1-2 цитаты контекста, если есть
      const contexts = (term.contexts || []).slice(0, MAX_CONTEXTS);
      if (contexts.length > 0) {
        for (const context of contexts) {
          // Ограничиваем длину цитаты до 150 символов
          const shortContext = context.length > 150 
            ? context.substring(0, 147) + '...' 
            : context;
          lines.push(`  > ${shortContext}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    log(`❌ Ошибка при чтении ${CANDIDATES_PATH}: ${error.message}`);
    return null;
  }
}

function main() {
  const block = generateTermsFoundBlock();
  
  if (block) {
    console.log(block);
  } else {
    console.log('## Terms found\n\nТермины не найдены.');
  }
}

main();

