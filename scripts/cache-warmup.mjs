#!/usr/bin/env node
/**
 * Cache warmup: генерация компактных снапшотов контекста и словарей
 * Ускоряет первые ответы Composer за счёт предзагрузки контекста
 * 
 * Использование:
 *   node scripts/cache-warmup.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import matter from 'gray-matter';

const CACHE_DIR = '.cache';
const TAGS_YAML_PATH = 'docs/nav/tags.yaml';
const ROUTES_YAML_PATH = 'docs/nav/routes.yml';
const LINK_MAP_PATH = 'prototype/link-map.json';
const GLOSSARY_PATH = 'docs/glossarij-terminov.md';
const CONTEXT_MAP_PATH = 'docs/context-map-yaml.md';

/**
 * Загружает и парсит tags.yaml
 */
function loadTags() {
  if (!existsSync(TAGS_YAML_PATH)) {
    return { aliases: {}, canonical: {} };
  }
  
  try {
    const content = readFileSync(TAGS_YAML_PATH, 'utf8');
    return YAML.parse(content) || { aliases: {}, canonical: {} };
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${TAGS_YAML_PATH}:`, error.message);
    return { aliases: {}, canonical: {} };
  }
}

/**
 * Загружает и парсит routes.yml
 */
function loadRoutes() {
  if (!existsSync(ROUTES_YAML_PATH)) {
    return { routes: [] };
  }
  
  try {
    const content = readFileSync(ROUTES_YAML_PATH, 'utf8');
    const parsed = YAML.parse(content) || { routes: [] };
    
    // Извлекаем компактную информацию: path, title, slugs
    const compact = {
      version: parsed.version || 1,
      updated: parsed.updated || null,
      routes: parsed.routes?.map(route => ({
        path: route.path,
        title: route.title,
        slugs: route.entries?.map(e => e.slug) || []
      })) || []
    };
    
    return compact;
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${ROUTES_YAML_PATH}:`, error.message);
    return { routes: [] };
  }
}

/**
 * Загружает link-map.json
 */
function loadLinkMap() {
  if (!existsSync(LINK_MAP_PATH)) {
    return { exact: {}, patterns: [] };
  }
  
  try {
    const content = readFileSync(LINK_MAP_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${LINK_MAP_PATH}:`, error.message);
    return { exact: {}, patterns: [] };
  }
}

/**
 * Извлекает глоссарий из Markdown файла
 */
function loadGlossary() {
  if (!existsSync(GLOSSARY_PATH)) {
    return { terms: [], abbreviations: [], entities: [] };
  }
  
  try {
    const content = readFileSync(GLOSSARY_PATH, 'utf8');
    const { data: frontMatter, content: body } = matter(content);
    
    // Простой парсинг структуры глоссария
    const terms = [];
    const abbreviations = [];
    const entities = [];
    
    const lines = body.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      if (line.includes('### Термины')) {
        currentSection = 'terms';
        continue;
      } else if (line.includes('### Сокращения')) {
        currentSection = 'abbreviations';
        continue;
      } else if (line.includes('### Доменные сущности')) {
        currentSection = 'entities';
        continue;
      }
      
      if (line.trim().startsWith('-')) {
        const text = line.trim().substring(1).trim();
        if (currentSection === 'terms' && text.includes(':')) {
          const [term, definition] = text.split(':').map(s => s.trim());
          terms.push({ term, definition });
        } else if (currentSection === 'abbreviations' && text.includes(':')) {
          const [abbr, expansion] = text.split(':').map(s => s.trim());
          abbreviations.push({ abbr, expansion });
        } else if (currentSection === 'entities' && text.includes(':')) {
          const [entity, description] = text.split(':').map(s => s.trim());
          entities.push({ entity, description });
        }
      }
    }
    
    return { terms, abbreviations, entities };
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${GLOSSARY_PATH}:`, error.message);
    return { terms: [], abbreviations: [], entities: [] };
  }
}

/**
 * Загружает context-map из Markdown
 */
function loadContextMap() {
  if (!existsSync(CONTEXT_MAP_PATH)) {
    return { facets: {}, aliases: {}, policies: {} };
  }
  
  try {
    const content = readFileSync(CONTEXT_MAP_PATH, 'utf8');
    const match = content.match(/```yaml[\r\n]+([\s\S]*?)```/i);
    
    if (match && match[1]) {
      return YAML.parse(match[1]) || { facets: {}, aliases: {}, policies: {} };
    }
    
    return { facets: {}, aliases: {}, policies: {} };
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${CONTEXT_MAP_PATH}:`, error.message);
    return { facets: {}, aliases: {}, policies: {} };
  }
}

/**
 * Генерирует компактный снапшот всех данных
 */
function generateSnapshot() {
  console.log('🔥 Cache warmup: генерация снапшотов контекста и словарей...\n');
  
  const tags = loadTags();
  const routes = loadRoutes();
  const linkMap = loadLinkMap();
  const glossary = loadGlossary();
  const contextMap = loadContextMap();
  
  const snapshot = {
    version: 1,
    generated: new Date().toISOString(),
    tags: {
      aliases: tags.aliases || {},
      canonical: tags.canonical || {},
      count: Object.keys(tags.aliases || {}).length
    },
    routes: {
      version: routes.version,
      updated: routes.updated,
      paths: routes.routes?.map(r => r.path) || [],
      totalSlugs: routes.routes?.reduce((sum, r) => sum + (r.slugs?.length || 0), 0) || 0,
      routes: routes.routes || []
    },
    linkMap: {
      exactCount: Object.keys(linkMap.exact || {}).length,
      patternsCount: (linkMap.patterns || []).length,
      exact: linkMap.exact || {},
      patterns: linkMap.patterns || []
    },
    glossary: {
      termsCount: glossary.terms?.length || 0,
      abbreviationsCount: glossary.abbreviations?.length || 0,
      entitiesCount: glossary.entities?.length || 0,
      terms: glossary.terms || [],
      abbreviations: glossary.abbreviations || [],
      entities: glossary.entities || []
    },
    contextMap: {
      facets: contextMap.facets || {},
      aliases: contextMap.aliases || {},
      policies: contextMap.policies || {}
    }
  };
  
  return snapshot;
}

/**
 * Генерирует быстрые справки (quick reference)
 */
function generateQuickReference(snapshot) {
  // Быстрая справка по тегам (топ-20 алиасов)
  const topAliases = Object.entries(snapshot.tags.aliases)
    .slice(0, 20)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  
  // Быстрая справка по маршрутам (path → slugs)
  const routesQuickRef = snapshot.routes.routes?.reduce((acc, route) => {
    acc[route.path] = route.slugs || [];
    return acc;
  }, {}) || {};
  
  // Быстрая справка по link-map (топ-10 exact mappings)
  const linkMapQuickRef = Object.entries(snapshot.linkMap.exact)
    .slice(0, 10)
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  
  return {
    tags: topAliases,
    routes: routesQuickRef,
    linkMap: linkMapQuickRef,
    glossary: {
      terms: snapshot.glossary.terms?.slice(0, 10) || [],
      abbreviations: snapshot.glossary.abbreviations?.slice(0, 10) || []
    }
  };
}

function main() {
  // Генерируем полный снапшот
  const snapshot = generateSnapshot();
  
  // Генерируем быстрые справки
  const quickRef = generateQuickReference(snapshot);
  
  // Сохраняем снапшоты
  const snapshotPath = join(CACHE_DIR, 'context-snapshot.json');
  const quickRefPath = join(CACHE_DIR, 'quick-reference.json');
  
  // Создаём директорию кеша, если её нет
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  writeFileSync(quickRefPath, JSON.stringify(quickRef, null, 2), 'utf8');
  
  console.log('✅ Снапшоты сгенерированы:');
  console.log(`   📄 ${snapshotPath}`);
  console.log(`   📄 ${quickRefPath}`);
  console.log('\n📊 Статистика:');
  console.log(`   Теги (алиасы): ${snapshot.tags.count}`);
  console.log(`   Маршруты: ${snapshot.routes.routes?.length || 0} путей, ${snapshot.routes.totalSlugs} slugs`);
  console.log(`   Link-map: ${snapshot.linkMap.exactCount} exact, ${snapshot.linkMap.patternsCount} patterns`);
  console.log(`   Глоссарий: ${snapshot.glossary.termsCount} терминов, ${snapshot.glossary.abbreviationsCount} сокращений`);
  console.log('\n✅ Cache warmup завершён');
}

// Проверка, что скрипт запущен напрямую
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
                     process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || import.meta.url.endsWith('cache-warmup.mjs')) {
  main();
}

export { generateSnapshot, generateQuickReference };

