#!/usr/bin/env node
/**
 * Валидация static/routes.json
 *
 * Проверяет формат и консистентность файла static/routes.json
 *
 * Использование:
 *   node scripts/validate-static-routes.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTES_JSON_PATH = join(__dirname, '../static/routes.json');

function log(message) {
  console.log(`[validate-static-routes] ${message}`);
}

function validateRoutes(routes) {
  const errors = [];
  const warnings = [];
  const seenPaths = new Set();
  
  if (!Array.isArray(routes)) {
    errors.push('routes должен быть массивом');
    return { errors, warnings };
  }
  
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const prefix = `routes[${i}]`;
    
    // Проверка обязательных полей
    if (!route.path) {
      errors.push(`${prefix}: отсутствует обязательное поле "path"`);
    } else {
      // Проверка формата path
      if (typeof route.path !== 'string') {
        errors.push(`${prefix}: поле "path" должно быть строкой`);
      } else if (!route.path.startsWith('/')) {
        errors.push(`${prefix}: поле "path" должно начинаться с "/"`);
      }
      
      // Проверка на дубликаты
      if (seenPaths.has(route.path)) {
        errors.push(`${prefix}: дубликат пути "${route.path}"`);
      } else {
        seenPaths.add(route.path);
      }
    }
    
    if (!route.title) {
      errors.push(`${prefix}: отсутствует обязательное поле "title"`);
    } else if (typeof route.title !== 'string') {
      errors.push(`${prefix}: поле "title" должно быть строкой`);
    }
    
    if (typeof route.in_sitemap !== 'boolean') {
      errors.push(`${prefix}: поле "in_sitemap" должно быть boolean`);
    }
    
    // Проверка опционального поля og
    if (route.og !== undefined) {
      if (typeof route.og !== 'object' || route.og === null) {
        errors.push(`${prefix}: поле "og" должно быть объектом`);
      } else {
        if (route.og.title && typeof route.og.title !== 'string') {
          errors.push(`${prefix}.og.title: должно быть строкой`);
        }
        if (route.og.description && typeof route.og.description !== 'string') {
          errors.push(`${prefix}.og.description: должно быть строкой`);
        }
        if (route.og.image !== null && route.og.image !== undefined && typeof route.og.image !== 'string') {
          errors.push(`${prefix}.og.image: должно быть строкой или null`);
        }
      }
    }
  }
  
  return { errors, warnings };
}

function main() {
  log('Валидация static/routes.json...\n');
  
  if (!existsSync(ROUTES_JSON_PATH)) {
    log(`❌ Файл ${ROUTES_JSON_PATH} не найден`);
    log(`   Запустите: npm run static:routes:generate`);
    process.exit(1);
  }
  
  let data;
  try {
    const content = readFileSync(ROUTES_JSON_PATH, 'utf8');
    data = JSON.parse(content);
  } catch (e) {
    log(`❌ Ошибка чтения/парсинга JSON: ${e.message}`);
    process.exit(1);
  }
  
  // Проверка структуры корневого объекта
  if (!data.routes || !Array.isArray(data.routes)) {
    log(`❌ Отсутствует поле "routes" или оно не является массивом`);
    process.exit(1);
  }
  
  // Валидация маршрутов
  const { errors, warnings } = validateRoutes(data.routes);
  
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
  log(`   Маршрутов: ${data.routes.length}`);
  log(`   В sitemap: ${data.routes.filter(r => r.in_sitemap).length}`);
  log(`   С OG-тегами: ${data.routes.filter(r => r.og).length}`);
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
