#!/usr/bin/env node
/**
 * Валидация входящих дельт графа
 *
 * Использование:
 *   node scripts/graph/validate_delta.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const INBOX_DIR = join(ROOT, 'data', 'graph', 'inbox');
const SCHEMA_PATH = join(ROOT, 'docs', 'graph', 'universe.schema.json');

function log(message) {
  console.log(`[validate-delta] ${message}`);
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
      }
    });
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
