#!/usr/bin/env node
/**
 * Генерация backlinks (входящих ссылок) для страниц KB
 * 
 * Строит обратный индекс: для каждой страницы находит все страницы,
 * которые ссылаются на неё.
 * 
 * Использование:
 *   node scripts/generate-backlinks.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import path from 'path';

const DOCS_ROOT = 'docs';
const PAGES_JSON_PATH = 'prototype/data/pages.json';
const BACKLINKS_OUTPUT_PATH = 'prototype/data/backlinks.json';

/**
 * Извлекает ссылки из контента Markdown файла
 */
function extractLinks(content) {
  const matches = [];
  
  // Удаляем code blocks перед парсингом ссылок
  let processedContent = content.replace(/```[\s\S]*?```/g, (match) => {
    return ' '.repeat(match.length);
  });
  
  processedContent = processedContent.replace(/`[^`\n]*`/g, (match) => {
    return ' '.repeat(match.length);
  });
  
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(processedContent)) !== null) {
    const preceding = processedContent[match.index - 1];
    if (preceding === "!") continue; // skip images
    matches.push({ text: match[1], href: match[2] });
  }
  return matches;
}

/**
 * Нормализует ссылку для поиска целевой страницы
 */
function normalizeLink(href) {
  // Убираем якоря и query-параметры
  const withoutAnchor = href.split('#')[0].split('?')[0];
  
  // Убираем относительные пути
  const base = withoutAnchor
    .replace(/^(\.\/)+/, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^docs\//, "")
    .replace(/\.md$/, "");
  
  return base.toLowerCase();
}

/**
 * Строит обратный индекс ссылок
 */
function buildBacklinksIndex(pages) {
  const backlinksMap = new Map(); // slug → [backlink pages]
  
  // Инициализируем мапу для всех страниц
  pages.forEach(page => {
    if (!page.service) {
      backlinksMap.set(page.slug.toLowerCase(), []);
    }
  });
  
  // Проходим по всем страницам и собираем ссылки
  pages.forEach(page => {
    if (page.service) return;
    
    const filePath = path.join(DOCS_ROOT, page.url.replace(/^docs\//, ''));
    if (!existsSync(filePath)) return;
    
    try {
      const raw = readFileSync(filePath, 'utf8');
      const parsed = matter(raw);
      const links = extractLinks(parsed.content);
      
      links.forEach(link => {
        const normalizedHref = normalizeLink(link.href);
        
        // Ищем целевую страницу
        const targetPage = pages.find(p => {
          if (p.service) return false;
          const normalizedSlug = p.slug.toLowerCase();
          const normalizedPath = p.url.replace(/^docs\//, '').replace(/\.md$/, '').toLowerCase();
          return normalizedSlug === normalizedHref || normalizedPath === normalizedHref;
        });
        
        if (targetPage && !targetPage.service) {
          const targetSlug = targetPage.slug.toLowerCase();
          const backlinks = backlinksMap.get(targetSlug) || [];
          
          // Проверяем, что эта страница ещё не добавлена в backlinks
          if (!backlinks.find(b => b.slug === page.slug)) {
            backlinks.push({
              slug: page.slug,
              title: page.title,
              url: page.url
            });
            backlinksMap.set(targetSlug, backlinks);
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️  Failed to process ${filePath}:`, error.message);
    }
  });
  
  // Преобразуем Map в объект
  const result = {};
  backlinksMap.forEach((backlinks, slug) => {
    if (backlinks.length > 0) {
      result[slug] = backlinks.sort((a, b) => a.title.localeCompare(b.title));
    }
  });
  
  return result;
}

function main() {
  console.log('🔗 Generating backlinks index...\n');
  
  if (!existsSync(PAGES_JSON_PATH)) {
    console.error(`❌ ${PAGES_JSON_PATH} not found. Run build-index.mjs first.`);
    process.exit(1);
  }
  
  const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
  console.log(`📚 Processing ${pages.length} pages...`);
  
  const backlinksIndex = buildBacklinksIndex(pages);
  
  const totalBacklinks = Object.values(backlinksIndex).reduce((sum, links) => sum + links.length, 0);
  const pagesWithBacklinks = Object.keys(backlinksIndex).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`   Pages with backlinks: ${pagesWithBacklinks}`);
  console.log(`   Total backlinks: ${totalBacklinks}`);
  
  writeFileSync(BACKLINKS_OUTPUT_PATH, JSON.stringify(backlinksIndex, null, 2), 'utf8');
  console.log(`\n✅ Backlinks index saved to ${BACKLINKS_OUTPUT_PATH}`);
}

main();

