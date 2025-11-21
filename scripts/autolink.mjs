#!/usr/bin/env node
/**
 * KB autolink: автоматическое превращение упоминаний терминов в ссылки
 * 
 * Правила безопасного линкинга:
 * - Точные совпадения по canonical_slug и aliases
 * - Границы слова (word boundaries)
 * - Игнорировать внутри code/links
 * - При конфликте многозначности — приоритет канона, список исключений
 * 
 * Использование:
 *   node scripts/autolink.mjs [--dry] [--file <path>]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import path from 'path';

const DOCS_ROOT = 'docs';
const PAGES_JSON_PATH = 'prototype/data/pages.json';
const TAGS_YAML_PATH = 'docs/nav/tags.yaml';
const DRY_RUN = process.argv.includes('--dry');
const FILE_ARG = process.argv.indexOf('--file');
const TARGET_FILE = FILE_ARG >= 0 && process.argv[FILE_ARG + 1] ? process.argv[FILE_ARG + 1] : null;

// Исключения: термины, которые не должны быть автолинками
const EXCLUSIONS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
  'can', 'could', 'may', 'might', 'must', 'shall',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'and', 'or', 'but', 'not', 'no', 'yes', 'if', 'then', 'else',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into',
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
  'during', 'except', 'inside', 'outside', 'over', 'through', 'throughout',
  'under', 'underneath', 'until', 'upon', 'within', 'without'
]);

/**
 * Загружает словарь slug↔aliases из pages.json и tags.yaml
 */
function buildSlugAliasesMap() {
  const map = new Map(); // alias → { slug, title, priority }
  const conflicts = new Map(); // alias → [candidates]
  
  // Загружаем pages.json
  if (existsSync(PAGES_JSON_PATH)) {
    try {
      const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
      pages.forEach(page => {
        if (page.service) return; // Пропускаем service файлы
        
        const slug = page.slug;
        const title = page.title;
        
        // Добавляем canonical slug (высший приоритет)
        if (slug) {
          const normalizedSlug = slug.toLowerCase();
          if (!map.has(normalizedSlug)) {
            map.set(normalizedSlug, { slug, title, priority: 1 });
          }
          
          // Добавляем title как alias
          if (title) {
            const normalizedTitle = title.toLowerCase().trim();
            if (normalizedTitle && normalizedTitle.length > 2 && !EXCLUSIONS.has(normalizedTitle)) {
              if (map.has(normalizedTitle)) {
                // Конфликт: добавляем в список конфликтов
                const existing = map.get(normalizedTitle);
                if (!conflicts.has(normalizedTitle)) {
                  conflicts.set(normalizedTitle, [existing]);
                }
                conflicts.get(normalizedTitle).push({ slug, title, priority: 1 });
              } else {
                map.set(normalizedTitle, { slug, title, priority: 1 });
              }
            }
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️ Failed to load ${PAGES_JSON_PATH}:`, error.message);
    }
  }
  
  // Загружаем tags.yaml для aliases
  // Примечание: tags.yaml содержит aliases для machine_tags, не для страниц напрямую
  // Поэтому мы используем их как дополнительные варианты написания терминов
  // которые могут встречаться в тексте, но не обязательно связаны со страницами
  
  return { map, conflicts };
}

/**
 * Проверяет, находится ли позиция внутри code блока или ссылки
 */
function isInsideCodeOrLink(content, pos) {
  const before = content.substring(0, pos);
  
  // Проверяем code blocks (``` или `)
  const codeBlockMatches = before.match(/```[\s\S]*?```/g);
  if (codeBlockMatches) {
    let offset = 0;
    for (const match of codeBlockMatches) {
      const start = before.indexOf(match, offset);
      const end = start + match.length;
      if (pos >= start && pos < end) return true;
      offset = end;
    }
  }
  
  // Проверяем inline code (`...`)
  const inlineCodeMatches = before.match(/`[^`\n]*`/g);
  if (inlineCodeMatches) {
    let offset = 0;
    for (const match of inlineCodeMatches) {
      const start = before.indexOf(match, offset);
      const end = start + match.length;
      if (pos >= start && pos < end) return true;
      offset = end;
    }
  }
  
  // Проверяем ссылки [text](url)
  const linkMatches = before.match(/\[([^\]]*)\]\([^)]*\)/g);
  if (linkMatches) {
    let offset = 0;
    for (const match of linkMatches) {
      const start = before.indexOf(match, offset);
      const end = start + match.length;
      if (pos >= start && pos < end) return true;
      offset = end;
    }
  }
  
  return false;
}

/**
 * Проверяет границы слова (word boundaries)
 */
function isWordBoundary(content, start, end) {
  const before = start > 0 ? content[start - 1] : '';
  const after = end < content.length ? content[end] : '';
  
  // Граница слова: не буква/цифра до и после
  const isWordChar = (ch) => /[\p{L}\p{N}_]/u.test(ch);
  
  const beforeIsBoundary = !isWordChar(before);
  const afterIsBoundary = !isWordChar(after);
  
  return beforeIsBoundary && afterIsBoundary;
}

/**
 * Автолинкинг терминов в контенте
 */
function autolinkContent(content, slugAliasesMap) {
  let result = content;
  let offset = 0;
  
  // Сортируем aliases по длине (от длинных к коротким) для правильного матчинга
  const sortedAliases = Array.from(slugAliasesMap.entries())
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, { slug, title }] of sortedAliases) {
    // Создаём regex для поиска с учётом границ слова
    // Используем lookbehind и lookahead для границ слова
    const regex = new RegExp(
      `(?<!\\p{L}\\p{N}_)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\p{L}\\p{N}_)`,
      'giu'
    );
    
    let match;
    const replacements = [];
    
    while ((match = regex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // Пропускаем, если внутри code/links
      if (isInsideCodeOrLink(content, matchStart)) {
        continue;
      }
      
      // Проверяем границы слова
      if (!isWordBoundary(content, matchStart, matchEnd)) {
        continue;
      }
      
      // Проверяем, что это не часть уже существующей ссылки
      const beforeMatch = content.substring(Math.max(0, matchStart - 2), matchStart);
      const afterMatch = content.substring(matchEnd, Math.min(content.length, matchEnd + 2));
      if (beforeMatch.includes('](') || afterMatch.startsWith(')')) {
        continue;
      }
      
      replacements.push({
        start: matchStart,
        end: matchEnd,
        alias: match[0],
        slug,
        title
      });
    }
    
    // Применяем замены в обратном порядке (от конца к началу), чтобы не сбить индексы
    replacements.reverse().forEach(({ start, end, alias: matchedAlias, slug: targetSlug, title: targetTitle }) => {
      const linkText = matchedAlias;
      const linkUrl = `${targetSlug}.md`;
      const replacement = `[${linkText}](${linkUrl})`;
      
      result = result.substring(0, start + offset) + replacement + result.substring(end + offset);
      offset += replacement.length - (end - start);
    });
  }
  
  return result;
}

/**
 * Обрабатывает один файл
 */
function processFile(filePath, slugAliasesMap) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    
    const before = parsed.content;
    const after = autolinkContent(before, slugAliasesMap);
    
    if (before === after) {
      return { changed: false };
    }
    
    if (DRY_RUN) {
      console.log(`DRY: would autolink in ${filePath}`);
      return { changed: true, dry: true };
    }
    
    const updated = matter.stringify(after, parsed.data);
    writeFileSync(filePath, updated, 'utf8');
    return { changed: true };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { changed: false, error: error.message };
  }
}

function main() {
  console.log('🔗 KB autolink: slug/aliases map + safe linking rules\n');
  
  // Строим словарь
  console.log('📚 Building slug/aliases map...');
  const { map: slugAliasesMap, conflicts } = buildSlugAliasesMap();
  console.log(`   Found ${slugAliasesMap.size} aliases`);
  
  if (conflicts.size > 0) {
    console.log(`\n⚠️  Found ${conflicts.size} conflicts (using canonical priority):`);
    conflicts.forEach((candidates, alias) => {
      console.log(`   - "${alias}": ${candidates.length} candidates`);
    });
  }
  
  // Обрабатываем файлы
  const files = TARGET_FILE 
    ? [TARGET_FILE]
    : globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true });
  
  console.log(`\n📝 Processing ${files.length} file(s)...`);
  
  let changedCount = 0;
  let errorCount = 0;
  
  files.forEach(file => {
    const result = processFile(file, slugAliasesMap);
    if (result.changed) {
      changedCount++;
      if (!result.dry) {
        console.log(`   ✅ ${file}`);
      }
    }
    if (result.error) {
      errorCount++;
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${files.length}`);
  console.log(`   Changed: ${changedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN mode - no files were modified`);
  } else if (changedCount > 0) {
    console.log(`\n✅ Autolinking completed!`);
  } else {
    console.log(`\n✅ No changes needed.`);
  }
}

main();

