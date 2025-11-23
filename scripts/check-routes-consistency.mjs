#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTES_YML = join(__dirname, '../docs/nav/routes.yml');
const PAGES_JSON = join(__dirname, '../prototype/data/pages.json');
const OUTPUT_JSON = join(__dirname, '../prototype/data/orphans.json');

function normalizeDocPath(docPath) {
  // Нормализуем путь: убираем ведущие ./ и docs/, приводим к единому формату
  return docPath
    .replace(/^\.\//, '')
    .replace(/^docs\//, '')
    .toLowerCase()
    .trim();
}

function extractRoutesFromYAML(routesYAML) {
  const routes = YAML.parse(readFileSync(routesYAML, 'utf8'));
  const docPaths = new Set();
  
  function traverseEntries(entries) {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (entry.doc) {
        const normalized = normalizeDocPath(entry.doc);
        docPaths.add(normalized);
      }
      // Рекурсивно обрабатываем вложенные структуры, если есть
      if (entry.entries) {
        traverseEntries(entry.entries);
      }
    }
  }
  
  if (routes.routes && Array.isArray(routes.routes)) {
    for (const route of routes.routes) {
      if (route.entries && Array.isArray(route.entries)) {
        traverseEntries(route.entries);
      }
    }
  }
  
  return docPaths;
}

function findOrphans() {
  // Читаем routes.yml
  const routesSet = extractRoutesFromYAML(ROUTES_YML);
  
  // Читаем pages.json
  const pages = JSON.parse(readFileSync(PAGES_JSON, 'utf8'));
  
  // Находим сирот: страницы, которые не в routes и не service:true
  const orphans = [];
  
  for (const page of pages) {
    // Пропускаем служебные страницы
    if (page.service === true) continue;
    
    // Пропускаем stories (они в отдельной коллекции)
    if (page.collection === 'stories' || page.url?.includes('/stories/')) continue;
    
    // Нормализуем путь страницы для сравнения
    const pagePath = normalizeDocPath(page.url || '');
    
    // Проверяем, есть ли эта страница в routes
    let foundInRoutes = false;
    for (const routePath of routesSet) {
      const normalizedRoutePath = normalizeDocPath(routePath);
      // Сравниваем по полному пути или по slug (без расширения)
      if (normalizedRoutePath === pagePath || 
          normalizedRoutePath === pagePath.replace(/\.md$/, '') ||
          normalizedRoutePath.replace(/\.md$/, '') === pagePath.replace(/\.md$/, '')) {
        foundInRoutes = true;
        break;
      }
    }
    
    // Если не найдено в routes - это сирота
    if (!foundInRoutes) {
      orphans.push({
        slug: page.slug,
        title: page.title,
        url: page.url,
        status: page.status || 'draft'
      });
    }
  }
  
  // Сортируем по slug для консистентности
  orphans.sort((a, b) => (a.slug || '').localeCompare(b.slug || '', 'ru'));
  
  return orphans;
}

function main() {
  try {
    const orphans = findOrphans();
    
    const output = {
      version: '3.0',
      updated: new Date().toISOString(),
      orphans: orphans
    };
    
    writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`✅ Routes consistency check completed`);
    console.log(`   Found ${orphans.length} orphan page(s)`);
    
    if (orphans.length > 0) {
      console.log(`\n   Orphans:`);
      orphans.forEach((orphan, idx) => {
        console.log(`   ${idx + 1}. ${orphan.title || orphan.slug} (${orphan.status}) - ${orphan.url}`);
      });
    }
    
    console.log(`\n   Report written to: ${OUTPUT_JSON}`);
    
    // Возвращаем код выхода: 0 если сирот нет, 1 если есть (для CI)
    process.exit(orphans.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error checking routes consistency:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

