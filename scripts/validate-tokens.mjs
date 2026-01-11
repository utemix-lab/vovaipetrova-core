#!/usr/bin/env node
/**
 * Валидация static/tokens.json
 *
 * Проверяет формат и консистентность файла static/tokens.json по schema.json
 *
 * Использование:
 *   node scripts/validate-tokens.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKENS_JSON_PATH = join(__dirname, '../static/tokens.json');
const SCHEMA_JSON_PATH = join(__dirname, '../static/schema.json');

function log(message) {
  console.log(`[validate-tokens] ${message}`);
}

function validateColor(value) {
  // Проверка HEX (#RRGGBB или #RGB)
  if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
    return true;
  }
  // Проверка rgba/rgb
  if (/^rgba?\([^)]+\)$/.test(value)) {
    return true;
  }
  return false;
}

function validateTokens(tokens) {
  const errors = [];
  const warnings = [];
  
  // Проверка обязательных полей верхнего уровня
  if (!tokens.version) {
    errors.push('Отсутствует обязательное поле "version"');
  }
  
  if (!tokens.colors) {
    errors.push('Отсутствует обязательное поле "colors"');
  } else {
    // Проверка colors
    if (!tokens.colors.background || !tokens.colors.background.primary) {
      errors.push('colors.background.primary обязателен');
    }
    if (!tokens.colors.text || !tokens.colors.text.primary) {
      errors.push('colors.text.primary обязателен');
    }
    if (!tokens.colors.border || !tokens.colors.border.default) {
      errors.push('colors.border.default обязателен');
    }
    if (!tokens.colors.status) {
      errors.push('colors.status обязателен');
    } else {
      if (!tokens.colors.status.ready || !validateColor(tokens.colors.status.ready)) {
        errors.push('colors.status.ready должен быть валидным HEX цветом');
      }
      if (!tokens.colors.status.review || !validateColor(tokens.colors.status.review)) {
        errors.push('colors.status.review должен быть валидным HEX цветом');
      }
      if (!tokens.colors.status.draft || !validateColor(tokens.colors.status.draft)) {
        errors.push('colors.status.draft должен быть валидным HEX цветом');
      }
    }
  }
  
  if (!tokens.typography) {
    errors.push('Отсутствует обязательное поле "typography"');
  } else {
    if (!tokens.typography.fontFamily || !tokens.typography.fontFamily.primary) {
      errors.push('typography.fontFamily.primary обязателен');
    }
    if (!tokens.typography.fontSize || !tokens.typography.fontSize.base) {
      errors.push('typography.fontSize.base обязателен');
    }
    if (!tokens.typography.fontWeight || !tokens.typography.fontWeight.normal) {
      errors.push('typography.fontWeight.normal обязателен');
    }
    if (!tokens.typography.lineHeight || !tokens.typography.lineHeight.normal) {
      errors.push('typography.lineHeight.normal обязателен');
    }
  }
  
  if (!tokens.spacing) {
    errors.push('Отсутствует обязательное поле "spacing"');
  } else {
    if (!tokens.spacing.base) {
      errors.push('spacing.base обязателен');
    }
  }
  
  if (!tokens.radius) {
    errors.push('Отсутствует обязательное поле "radius"');
  } else {
    if (!tokens.radius.base) {
      errors.push('radius.base обязателен');
    }
  }
  
  return { errors, warnings };
}

function main() {
  log('Валидация static/tokens.json...\n');
  
  if (!existsSync(TOKENS_JSON_PATH)) {
    log(`❌ Файл ${TOKENS_JSON_PATH} не найден`);
    log(`   Создайте файл tokens.json в директории static/`);
    process.exit(1);
  }
  
  if (!existsSync(SCHEMA_JSON_PATH)) {
    log(`⚠️  Файл ${SCHEMA_JSON_PATH} не найден, пропускаем проверку по схеме`);
  }
  
  let tokens;
  try {
    const content = readFileSync(TOKENS_JSON_PATH, 'utf8');
    tokens = JSON.parse(content);
  } catch (e) {
    log(`❌ Ошибка чтения/парсинга JSON: ${e.message}`);
    process.exit(1);
  }
  
  // Валидация структуры
  const { errors, warnings } = validateTokens(tokens);
  
  if (warnings.length > 0) {
    for (const warning of warnings) {
      log(`⚠️  ${warning}`);
    }
    log('');
  }
  
  if (errors.length > 0) {
    log('❌ Найдены ошибки валидации:');
    for (const error of errors) {
      log(`   - ${error}`);
    }
    process.exit(1);
  }
  
  log(`✅ Валидация пройдена`);
  log(`   Версия: ${tokens.version}`);
  log(`   Цвета: ${Object.keys(tokens.colors || {}).length} категорий`);
  log(`   Типографика: ${Object.keys(tokens.typography?.fontSize || {}).length} размеров`);
  log(`   Spacing: ${Object.keys(tokens.spacing || {}).length} значений`);
  log(`   Radius: ${Object.keys(tokens.radius || {}).length} значений`);
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
