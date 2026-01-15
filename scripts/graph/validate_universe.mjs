#!/usr/bin/env node
/**
 * Валидация graph.jsonl по universe.schema.json
 *
 * Использование:
 *   node scripts/graph/validate_universe.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const GRAPH_PATH = join(ROOT, 'data', 'graph', 'graph.jsonl');
const SCHEMA_PATH = join(ROOT, 'docs', 'graph', 'universe.schema.json');

function log(message) {
  console.log(`[validate-universe] ${message}`);
}

function main() {
  if (!existsSync(GRAPH_PATH)) {
    log(`❌ Файл ${GRAPH_PATH} не найден`);
    process.exit(1);
  }

  if (!existsSync(SCHEMA_PATH)) {
    log(`❌ Файл ${SCHEMA_PATH} не найден`);
    process.exit(1);
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const lines = readFileSync(GRAPH_PATH, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  let hasErrors = false;

  lines.forEach((line, index) => {
    let payload;
    try {
      payload = JSON.parse(line);
    } catch (error) {
      hasErrors = true;
      log(`❌ Строка ${index + 1}: некорректный JSON (${error.message})`);
      return;
    }

    const valid = validate(payload);
    if (!valid) {
      hasErrors = true;
      log(`❌ Строка ${index + 1}: ошибка схемы`);
      for (const err of validate.errors || []) {
        log(`   - ${err.instancePath} ${err.message}`);
      }
    }
  });

  if (hasErrors) {
    process.exit(1);
  }

  log(`✅ Валидация пройдена (${lines.length} строк)`);
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
