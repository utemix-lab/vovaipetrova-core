#!/usr/bin/env node
/**
 * Валидация входящих дельт графа
 *
 * Использование:
 *   node scripts/graph/validate_delta.mjs
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const INBOX_DIR = join(ROOT, 'data', 'graph', 'inbox');
const SCHEMA_PATH = join(ROOT, 'docs', 'graph', 'universe.schema.json');
const LOGS_DIR = join(ROOT, 'logs');
const REPORT_MD = join(LOGS_DIR, 'graph-delta-report.md');
const REPORT_HTML = join(LOGS_DIR, 'graph-delta-report.html');

function log(message) {
  console.log(`[validate-delta] ${message}`);
}

function formatEdgeKey(from, to) {
  return `${from} -> ${to}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectJsonlFiles() {
  if (!existsSync(INBOX_DIR)) {
    log(`❌ Директория ${INBOX_DIR} не найдена`);
    process.exit(1);
  }

  return readdirSync(INBOX_DIR)
    .filter(name => name.endsWith('.jsonl'))
    .map(name => join(INBOX_DIR, name));
}

function main() {
  if (!existsSync(SCHEMA_PATH)) {
    log(`❌ Файл ${SCHEMA_PATH} не найден`);
    process.exit(1);
  }

  const deltaFiles = collectJsonlFiles();
  if (deltaFiles.length === 0) {
    log('ℹ️  Delta inbox пуст — нет файлов для проверки');
    log('✅ Валидация пройдена (0 файлов, 0 строк)');
    return;
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const deltaSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Graph Delta Schema (candidate_edge)',
    type: 'object',
    required: ['delta_type', 'from', 'to', 'edge_type', 'rationale', 'confidence', 'source'],
    properties: {
      delta_type: { const: 'candidate_edge' },
      from: { type: 'string', minLength: 1 },
      to: { type: 'string', minLength: 1 },
      edge_type: {
        type: 'string',
        enum: ['related_to', 'see_also', 'semantic_near'],
      },
      rationale: { type: 'string', minLength: 1 },
      confidence: { type: 'string', enum: ['low', 'med', 'high'] },
      source: { type: 'string', minLength: 1 },
    },
    additionalProperties: true,
  };
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validateUniverse = ajv.compile(schema);
  const validateDelta = ajv.compile(deltaSchema);

  let hasErrors = false;
  let totalLines = 0;
  let validLines = 0;
  let warningsCount = 0;
  let conflictsCount = 0;
  const conflicts = [];
  const warnings = [];
  const edgeIndex = new Map(); // edgeKey -> { types: Set, sources: Set, entries: [] }

  for (const filePath of deltaFiles) {
    const raw = readFileSync(filePath, 'utf8');
    const lines = raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      log(`ℹ️  ${filePath}: пустой файл (0 строк)`);
      continue;
    }

    const fileName = filePath.split(/[/\\]/).pop();
    log(`Проверка ${filePath} (${lines.length} строк)`);
    totalLines += lines.length;

    lines.forEach((line, index) => {
      let payload;
      try {
        payload = JSON.parse(line);
      } catch (error) {
        hasErrors = true;
        log(`❌ ${filePath} строка ${index + 1}: некорректный JSON (${error.message})`);
        return;
      }

      const isDelta = payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'delta_type');
      const validator = isDelta ? validateDelta : validateUniverse;
      const valid = validator(payload);
      if (!valid) {
        hasErrors = true;
        log(`❌ ${filePath} строка ${index + 1}: ошибка схемы`);
        for (const err of validator.errors || []) {
          log(`   - ${err.instancePath} ${err.message}`);
        }
        return;
      }

      validLines += 1;

      // Анализ конфликтов и предупреждений только для candidate_edge
      if (isDelta && payload.delta_type === 'candidate_edge') {
        const edgeKey = formatEdgeKey(payload.from, payload.to);
        const edgeType = payload.edge_type;
        const entry = edgeIndex.get(edgeKey) || { types: new Set(), sources: new Set(), entries: [] };
        entry.types.add(edgeType);
        entry.sources.add(fileName);
        entry.entries.push({
          edge_type: edgeType,
          rationale: payload.rationale,
          confidence: payload.confidence,
          source: payload.source,
          file: fileName,
          line: index + 1,
        });
        edgeIndex.set(edgeKey, entry);
      }
    });
  }

  // Анализ конфликтов и предупреждений
  for (const [edgeKey, entry] of edgeIndex.entries()) {
    if (entry.types.size > 1) {
      // Конфликт: одна и та же пара from->to с разными edge_type
      conflictsCount += 1;
      conflicts.push({
        edge_key: edgeKey,
        edge_types: Array.from(entry.types.values()),
        sources: Array.from(entry.sources.values()),
        entries: entry.entries,
      });
    } else if (entry.entries.length > 1) {
      // Предупреждение: дубликаты одной и той же дельты
      warningsCount += 1;
      warnings.push({
        edge_key: edgeKey,
        edge_type: entry.entries[0]?.edge_type,
        count: entry.entries.length,
        sources: Array.from(entry.sources.values()),
        entries: entry.entries,
      });
    }
  }

  // Генерация отчётов
  mkdirSync(LOGS_DIR, { recursive: true });

  const mdLines = [
    '# Graph Delta Validation Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Files: ${deltaFiles.length}`,
    `- Lines: ${totalLines}`,
    `- Valid: ${validLines}`,
    `- Warnings: ${warningsCount}`,
    `- Conflicts: ${conflictsCount}`,
    '',
    '## Conflicts',
    '',
  ];

  if (conflicts.length === 0) {
    mdLines.push('- None');
  } else {
    for (const conflict of conflicts) {
      mdLines.push(
        `- **${conflict.edge_key}**`,
        `  - edge_types: ${conflict.edge_types.join(', ')}`,
        `  - sources: ${conflict.sources.join(', ')}`,
        `  - entries:`
      );
      for (const entry of conflict.entries) {
        mdLines.push(
          `    - ${entry.edge_type} (confidence: ${entry.confidence}, source: ${entry.source}, file: ${entry.file}:${entry.line})`,
          `      rationale: ${entry.rationale}`
        );
      }
    }
  }

  mdLines.push('', '## Warnings', '');
  if (warnings.length === 0) {
    mdLines.push('- None');
  } else {
    for (const warning of warnings) {
      mdLines.push(
        `- **${warning.edge_key}**`,
        `  - edge_type: ${warning.edge_type}`,
        `  - count: ${warning.count}`,
        `  - sources: ${warning.sources.join(', ')}`,
        `  - entries:`
      );
      for (const entry of warning.entries) {
        mdLines.push(
          `    - ${entry.file}:${entry.line} (confidence: ${entry.confidence}, source: ${entry.source})`
        );
      }
    }
  }

  writeFileSync(REPORT_MD, mdLines.join('\n') + '\n', 'utf8');

  // HTML отчёт
  const htmlBody = `<pre>${escapeHtml(mdLines.join('\n'))}</pre>`;
  writeFileSync(REPORT_HTML, `<!doctype html><html><head><meta charset="utf-8"><title>Graph Delta Validation Report</title></head><body>${htmlBody}</body></html>\n`, 'utf8');

  // Короткий сигнал для CI (≤10 строк, без автопринятия)
  log(`Summary: files=${deltaFiles.length} lines=${totalLines} valid=${validLines} warnings=${warningsCount} conflicts=${conflictsCount}`);

  if (conflicts.length > 0) {
    log(`⚠️  CONFLICTS: ${conflicts.length} detected`);
    // Выводим максимум 3 конфликта для краткости
    const conflictsToShow = conflicts.slice(0, 3);
    for (const conflict of conflictsToShow) {
      log(`  type=edge_type_mismatch edge_key="${conflict.edge_key}" sources=[${conflict.sources.join(',')}]`);
    }
    if (conflicts.length > 3) {
      log(`  ... +${conflicts.length - 3} more (see artifact)`);
    }
    log(`Next step: manual review required | Details: ${REPORT_MD.split(/[/\\]/).pop()}`);
  } else if (warnings.length > 0) {
    log(`⚠️  Warnings: ${warningsCount} duplicates (see artifact)`);
  }

  if (hasErrors) {
    process.exit(1);
  }

  log(`✅ Валидация пройдена (${deltaFiles.length} файлов, ${totalLines} строк)`);
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
