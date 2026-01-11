#!/usr/bin/env node
/**
 * Линтер для проверки lite-сводок (Glossary Lite)
 * 
 * Проверяет:
 * 1. Длина краткого определения (summary) ≤ 200 символов
 * 2. Наличие ссылки "Где читать" или "Читать карточку"
 * 
 * Использование:
 *   node scripts/lint-lite-summaries.mjs [файл...]
 * 
 * Если файлы не указаны, проверяет все glossary-lite*.md файлы в docs/kb/
 */

import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

const MAX_SUMMARY_LENGTH = 200;
const LITE_SUMMARY_PATTERN = /^docs\/kb\/glossary-lite.*\.md$/;

// Паттерны для ссылок "Где читать"
const READ_LINK_PATTERNS = [
  /→\s*\[Читать карточку\]\([^)]+\)/i,
  /→\s*\[Где читать\]\([^)]+\)/i,
  /→\s*\[читать карточку\]\([^)]+\)/i,
  /→\s*\[где читать\]\([^)]+\)/i,
];

/**
 * Парсит термины из Glossary Lite файла
 * 
 * Возвращает массив объектов:
 * {
 *   title: string,
 *   summary: string,
 *   hasReadLink: boolean,
 *   lineNumber: number
 * }
 */
function parseTerms(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const parsed = matter(content);
  const body = parsed.content;
  
  const lines = body.split(/\r?\n/);
  const terms = [];
  let currentTerm = null;
  let currentSummaryLines = [];
  let inTerm = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Заголовок термина: ### Title
    if (trimmed.startsWith('### ')) {
      // Сохраняем предыдущий термин, если он был
      if (currentTerm) {
        const summary = currentSummaryLines.join(' ').trim();
        currentTerm.summary = summary;
        currentTerm.hasReadLink = currentSummaryLines.some(line =>
          READ_LINK_PATTERNS.some(pattern => pattern.test(line))
        );
        terms.push(currentTerm);
      }
      
      // Начинаем новый термин
      const title = trimmed.replace(/^###\s+/, '');
      currentTerm = {
        title,
        summary: '',
        hasReadLink: false,
        lineNumber: i + 1 // +1 для удобства (1-based)
      };
      currentSummaryLines = [];
      inTerm = true;
      continue;
    }
    
    // Конец термина: следующий заголовок уровня 2 или 3, или конец файла
    if (inTerm && (trimmed.startsWith('## ') || trimmed.startsWith('### '))) {
      if (currentTerm) {
        const summary = currentSummaryLines.join(' ').trim();
        currentTerm.summary = summary;
        currentTerm.hasReadLink = currentSummaryLines.some(line =>
          READ_LINK_PATTERNS.some(pattern => pattern.test(line))
        );
        terms.push(currentTerm);
        currentTerm = null;
        currentSummaryLines = [];
        inTerm = false;
      }
      // Если это заголовок уровня 3, это начало нового термина
      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s+/, '');
        currentTerm = {
          title,
          summary: '',
          hasReadLink: false,
          lineNumber: i + 1
        };
        inTerm = true;
      }
      continue;
    }
    
    // Собираем строки определения термина
    if (inTerm && currentTerm) {
      // Проверяем, является ли это ссылкой "Читать карточку"
      const linkMatch = READ_LINK_PATTERNS.some(pattern => pattern.test(trimmed));
      if (linkMatch) {
        currentTerm.hasReadLink = true;
        // Завершаем сбор summary при обнаружении ссылки
        inTerm = false;
        continue;
      }
      
      // Пропускаем пустые строки в начале
      if (trimmed.length === 0 && currentSummaryLines.length === 0) {
        continue;
      }
      
      // Пропускаем HTML-якоря и другие служебные элементы
      if (trimmed.startsWith('<a id=') || trimmed.startsWith('</a>')) {
        continue;
      }
      
      // Добавляем строку к определению
      currentSummaryLines.push(trimmed);
    }
  }
  
  // Сохраняем последний термин
  if (currentTerm) {
    const summary = currentSummaryLines.join(' ').trim();
    currentTerm.summary = summary;
    currentTerm.hasReadLink = currentTerm.hasReadLink || currentSummaryLines.some(line =>
      READ_LINK_PATTERNS.some(pattern => pattern.test(line))
    );
    terms.push(currentTerm);
  }
  
  return terms;
}

/**
 * Проверяет один файл
 */
function lintFile(filePath) {
  const errors = [];
  
  try {
    const terms = parseTerms(filePath);
    
    for (const term of terms) {
      // Проверка 1: длина определения
      if (term.summary.length === 0) {
        errors.push({
          file: filePath.replace(/\\/g, '/'),
          term: term.title,
          line: term.lineNumber,
          issue: 'missing_summary',
          message: `Термин "${term.title}" не имеет определения`
        });
      } else if (term.summary.length > MAX_SUMMARY_LENGTH) {
        errors.push({
          file: filePath.replace(/\\/g, '/'),
          term: term.title,
          line: term.lineNumber,
          issue: 'summary_too_long',
          message: `Определение термина "${term.title}" слишком длинное: ${term.summary.length} символов (максимум ${MAX_SUMMARY_LENGTH})`,
          summary: term.summary.slice(0, 100) + (term.summary.length > 100 ? '...' : '')
        });
      }
      
      // Проверка 2: наличие ссылки "Где читать"
      if (!term.hasReadLink) {
        errors.push({
          file: filePath.replace(/\\/g, '/'),
          term: term.title,
          line: term.lineNumber,
          issue: 'missing_read_link',
          message: `Термин "${term.title}" не имеет ссылки "Где читать" или "Читать карточку"`
        });
      }
    }
  } catch (error) {
    errors.push({
      file: filePath.replace(/\\/g, '/'),
      term: null,
      line: null,
      issue: 'parse_error',
      message: `Ошибка при парсинге файла: ${error.message}`
    });
  }
  
  return errors;
}

/**
 * Форматирует отчёт об ошибках
 */
function formatReport(allErrors) {
  if (allErrors.length === 0) {
    return '✅ Все lite-сводки соответствуют требованиям.\n';
  }
  
  let report = `❌ Обнаружено ${allErrors.length} нарушений в lite-сводках:\n\n`;
  
  // Группируем по файлам
  const byFile = {};
  for (const error of allErrors) {
    if (!byFile[error.file]) {
      byFile[error.file] = [];
    }
    byFile[error.file].push(error);
  }
  
  // Выводим по файлам
  for (const [file, errors] of Object.entries(byFile)) {
    report += `📄 ${file}\n`;
    report += `${'='.repeat(Math.max(60, file.length + 3))}\n\n`;
    
    for (const error of errors) {
      report += `  ❌ Строка ${error.line || '?'}: ${error.message}\n`;
      if (error.term) {
        report += `     Термин: "${error.term}"\n`;
      }
      if (error.summary) {
        report += `     Определение (начало): "${error.summary}"\n`;
      }
      report += '\n';
    }
    report += '\n';
  }
  
  report += `\n📋 Правила:\n`;
  report += `   • Длина определения: ≤ ${MAX_SUMMARY_LENGTH} символов\n`;
  report += `   • Обязательная ссылка: "→ [Читать карточку](...)" или "→ [Где читать](...)"\n`;
  
  return report;
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);
  
  let files = [];
  if (args.length > 0) {
    // Проверяем указанные файлы
    files = args.filter(f => existsSync(f));
    if (files.length === 0) {
      console.error('❌ Указанные файлы не найдены');
      process.exit(1);
    }
  } else {
    // Ищем все glossary-lite*.md файлы
    files = globSync('docs/kb/glossary-lite*.md', { nodir: true });
    if (files.length === 0) {
      console.log('ℹ️  Файлы Glossary Lite не найдены');
      process.exit(0);
    }
  }
  
  console.log(`🔍 Проверка ${files.length} файл(ов) lite-сводок...\n`);
  
  const allErrors = [];
  for (const file of files) {
    const errors = lintFile(file);
    allErrors.push(...errors);
  }
  
  const report = formatReport(allErrors);
  console.log(report);
  
  // Выход с кодом ошибки, если есть нарушения
  if (allErrors.length > 0) {
    process.exit(1);
  }
}

main();
