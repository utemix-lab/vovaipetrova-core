#!/usr/bin/env node
/**
 * Генерация static/routes.json для Static First контракта
 *
 * Выгружает текущие маршруты прототипа в упрощённый формат для внешнего IDE-агента.
 * Формат: {path, title, in_sitemap, og?}
 *
 * Использование:
 *   node scripts/generate-static-routes.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTES_JSON_PATH = join(__dirname, '../prototype/data/routes.json');
const SITEMAP_PATH = join(__dirname, '../prototype/sitemap.xml');
const PAGES_JSON_PATH = join(__dirname, '../prototype/data/pages.json');
const OUTPUT_PATH = join(__dirname, '../static/routes.json');
const BASE_URL = 'https://utemix-lab.github.io/vovaipetrova-core';

function log(message) {
  console.log(`[static-routes] ${message}`);
}

function parseSitemap() {
  if (!existsSync(SITEMAP_PATH)) {
    return new Set();
  }
  
  const content = readFileSync(SITEMAP_PATH, 'utf8');
  const slugs = new Set();
  
  // Парсим URLs из sitemap.xml
  const urlMatches = content.matchAll(/<loc>https?:\/\/[^<]+\/page\/([^<]+)\.html<\/loc>/g);
  for (const match of urlMatches) {
    slugs.add(match[1]);
  }
  
  // Также добавляем главную страницу
  if (content.includes(`<loc>${BASE_URL}</loc>`) || content.includes(`<loc>${BASE_URL}/</loc>`)) {
    slugs.add('__root__');
  }
  
  return slugs;
}

function loadPages() {
  if (!existsSync(PAGES_JSON_PATH)) {
    log(`⚠️  ${PAGES_JSON_PATH} не найден`);
    return [];
  }
  
  return JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
}

function buildOGTags(page) {
  if (!page) return null;
  
  const og = {
    title: page.title || '',
    description: page.summary ? String(page.summary).slice(0, 200) : '',
    image: null // Можно добавить позже, если будет поле image
  };
  
  // Убираем пустые поля
  if (!og.title && !og.description) {
    return null;
  }
  
  return og;
}

function main() {
  log('Генерация static/routes.json...\n');
  
  // Загружаем данные
  if (!existsSync(ROUTES_JSON_PATH)) {
    log(`❌ ${ROUTES_JSON_PATH} не найден. Запустите сначала build-index.mjs`);
    process.exit(1);
  }
  
  const routesData = JSON.parse(readFileSync(ROUTES_JSON_PATH, 'utf8'));
  const sitemapSlugs = parseSitemap();
  const pages = loadPages();
  
  log(`Загружено ${routesData.routes.length} маршрутов из routes.json`);
  log(`Найдено ${sitemapSlugs.size} URL в sitemap.xml`);
  log(`Загружено ${pages.length} страниц из pages.json\n`);
  
  // Создаём мапу страниц по slug для быстрого поиска
  const pagesBySlug = new Map();
  for (const page of pages) {
    if (page.slug) {
      pagesBySlug.set(page.slug, page);
    }
  }
  
  // Генерируем упрощённые маршруты
  const staticRoutes = [];
  const seenPaths = new Set();
  
  // Обрабатываем маршруты из routes.json
  for (const route of routesData.routes) {
    const routePath = route.path;
    const routeTitle = route.title;
    
    // Проверяем, есть ли страницы этого маршрута в sitemap
    let inSitemap = false;
    if (route.entries && Array.isArray(route.entries)) {
      // Если хотя бы одна страница маршрута в sitemap, считаем маршрут в sitemap
      inSitemap = route.entries.some(entry => {
        if (entry.slug) {
          return sitemapSlugs.has(entry.slug);
        }
        return false;
      });
    }
    
    // Собираем OG-теги из первой страницы маршрута (если есть)
    let og = null;
    if (route.entries && route.entries.length > 0) {
      const firstEntry = route.entries[0];
      if (firstEntry.slug) {
        const page = pagesBySlug.get(firstEntry.slug);
        if (page) {
          og = buildOGTags(page);
        }
      }
    }
    
    // Если OG не найден, создаём базовый
    if (!og) {
      og = {
        title: routeTitle,
        description: route.description || '',
        image: null
      };
      if (!og.description) {
        og = null;
      }
    }
    
    // Избегаем дубликатов
    if (!seenPaths.has(routePath)) {
      seenPaths.add(routePath);
      staticRoutes.push({
        path: routePath,
        title: routeTitle,
        in_sitemap: inSitemap,
        og: og || undefined
      });
    }
  }
  
  // Добавляем главную страницу, если её ещё нет
  if (!seenPaths.has('/')) {
    seenPaths.add('/');
    staticRoutes.unshift({
      path: '/',
      title: 'Главная',
      in_sitemap: sitemapSlugs.has('__root__'),
      og: {
        title: 'Vova & Petrova',
        description: 'База знаний, экспортированная из Notion в Markdown',
        image: null
      }
    });
  }
  
  // Добавляем отдельные страницы из sitemap, которых нет в routes.json
  const routesPaths = new Set(staticRoutes.map(r => r.path));
  for (const slug of sitemapSlugs) {
    if (slug === '__root__') continue;
    
    const page = pagesBySlug.get(slug);
    if (page && !routesPaths.has(`/page/${slug}`)) {
      // Проверяем, не является ли это страницей из существующего маршрута
      let belongsToRoute = false;
      for (const route of routesData.routes) {
        if (route.entries && route.entries.some(e => e.slug === slug)) {
          belongsToRoute = true;
          break;
        }
      }
      
      if (!belongsToRoute) {
        staticRoutes.push({
          path: `/page/${slug}`,
          title: page.title || slug,
          in_sitemap: true,
          og: buildOGTags(page) || undefined
        });
      }
    }
  }
  
  // Формируем итоговый JSON
  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    routes: staticRoutes
  };
  
  // Сохраняем файл
  const outputDir = join(__dirname, '../static');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  
  log(`✅ Создан ${OUTPUT_PATH}`);
  log(`   Маршрутов: ${staticRoutes.length}`);
  log(`   В sitemap: ${staticRoutes.filter(r => r.in_sitemap).length}`);
  log(`   С OG-тегами: ${staticRoutes.filter(r => r.og).length}`);
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
