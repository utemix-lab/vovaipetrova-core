#!/usr/bin/env node
/**
 * Генерация индекса историй (Stories)
 * 
 * Создаёт индекс эпизодов Stories, сгруппированных по годам/месяцам или batch'ам эпизодов.
 * 
 * Использование:
 *   node scripts/generate-stories-index.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const PAGES_JSON_PATH = 'prototype/data/pages.json';
const STORIES_INDEX_OUTPUT_PATH = 'prototype/data/stories-index.json';

/**
 * Извлекает номер эпизода из slug
 */
function getStoryOrder(slug) {
  if (!slug || typeof slug !== 'string') return null;
  
  // Пытаемся извлечь номер из начала slug (001-, 002-, и т.д.)
  const match = slug.match(/^(\d{1,3})-/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Извлекает дату из slug (формат YYYY-MM-DD)
 */
function getStoryDate(slug) {
  if (!slug || typeof slug !== 'string') return null;
  
  // Пытаемся извлечь дату из slug (2025-11-23-...)
  const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})-/);
  if (dateMatch) {
    return dateMatch[1];
  }
  
  return null;
}

/**
 * Определяет группу для истории (год-месяц или batch эпизодов)
 */
function getStoryGroup(story) {
  const slug = story.slug || '';
  const date = getStoryDate(slug);
  
  // Если есть дата в slug, группируем по году-месяцу
  if (date) {
    const [year, month] = date.split('-');
    return `${year}-${month}`;
  }
  
  // Иначе группируем по batch'ам эпизодов (001-010, 011-020, и т.д.)
  const order = getStoryOrder(slug);
  if (order !== null) {
    const batchStart = Math.floor(order / 10) * 10;
    const batchEnd = batchStart + 9;
    return `episodes-${String(batchStart).padStart(3, '0')}-${String(batchEnd).padStart(3, '0')}`;
  }
  
  // Если нет ни даты, ни номера, помещаем в "other"
  return 'other';
}

/**
 * Генерирует индекс историй
 */
function generateStoriesIndex(pages) {
  // Фильтруем только истории
  const stories = pages.filter(page => {
    if (page.service) return false;
    
    // Проверяем collection
    if (page.collection === 'stories') return true;
    
    // Проверяем tags
    const tags = page.tags || [];
    if (tags.some(tag => tag === 'Story' || tag.toLowerCase() === 'story')) {
      return true;
    }
    
    // Проверяем machine_tags
    const machineTags = page.machine_tags || [];
    if (machineTags.some(tag => tag === 'content/story' || tag.startsWith('content/story'))) {
      return true;
    }
    
    // Проверяем путь
    const url = page.url || '';
    if (url.includes('/stories/')) {
      return true;
    }
    
    return false;
  });
  
  // Дедуплицируем истории по slug (оставляем лучшую версию)
  const storiesBySlug = new Map();
  stories.forEach(story => {
    const slug = story.slug;
    if (!slug) return;
    
    const existing = storiesBySlug.get(slug);
    if (!existing) {
      storiesBySlug.set(slug, story);
    } else {
      // Приоритет: ready > review > draft
      const statusOrder = { ready: 0, review: 1, draft: 2 };
      const existingStatus = statusOrder[existing.status] ?? 2;
      const newStatus = statusOrder[story.status] ?? 2;
      
      // Если новая версия имеет лучший статус, заменяем
      if (newStatus < existingStatus) {
        storiesBySlug.set(slug, story);
      } else if (newStatus === existingStatus) {
        // При одинаковом статусе выбираем по дате (если есть) или оставляем существующую
        const existingDate = getStoryDate(existing.slug);
        const newDate = getStoryDate(story.slug);
        if (newDate && (!existingDate || newDate > existingDate)) {
          storiesBySlug.set(slug, story);
        }
      }
    }
  });
  
  // Группируем по группам (теперь без дубликатов)
  const indexByGroup = {};
  
  storiesBySlug.forEach(story => {
    const group = getStoryGroup(story);
    
    if (!indexByGroup[group]) {
      indexByGroup[group] = [];
    }
    
    // Извлекаем порядковый номер для сортировки
    const order = getStoryOrder(story.slug) || 9999;
    const date = getStoryDate(story.slug);
    
    indexByGroup[group].push({
      slug: story.slug,
      title: story.title,
      url: story.url,
      summary: story.summary || '',
      status: story.status || 'draft',
      story_order: order,
      date: date || null,
      story_type: story.story_type || null
    });
  });
  
  // Сортируем истории внутри каждой группы
  Object.keys(indexByGroup).forEach(group => {
    indexByGroup[group].sort((a, b) => {
      // Сначала по порядковому номеру
      if (a.story_order !== b.story_order) {
        return a.story_order - b.story_order;
      }
      
      // Затем по дате (если есть)
      if (a.date && b.date) {
        return a.date.localeCompare(b.date);
      }
      if (a.date) return -1;
      if (b.date) return 1;
      
      // Затем по статусу (ready > review > draft)
      const statusOrder = { ready: 0, review: 1, draft: 2 };
      const statusDiff = (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
      if (statusDiff !== 0) return statusDiff;
      
      // В конце по заголовку
      return a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' });
    });
  });
  
  // Сортируем группы
  const sortedGroups = Object.keys(indexByGroup).sort((a, b) => {
    // Группы с датами идут первыми (в обратном порядке - новые первыми)
    if (a.match(/^\d{4}-\d{2}$/) && b.match(/^\d{4}-\d{2}$/)) {
      return b.localeCompare(a); // Обратный порядок для дат
    }
    if (a.match(/^\d{4}-\d{2}$/)) return -1;
    if (b.match(/^\d{4}-\d{2}$/)) return 1;
    
    // Затем batch'и эпизодов (по возрастанию)
    if (a.startsWith('episodes-') && b.startsWith('episodes-')) {
      return a.localeCompare(b);
    }
    if (a.startsWith('episodes-')) return -1;
    if (b.startsWith('episodes-')) return 1;
    
    // В конце "other"
    if (a === 'other') return 1;
    if (b === 'other') return -1;
    
    return a.localeCompare(b);
  });
  
  return {
    generatedAt: new Date().toISOString(),
    totalStories: storiesBySlug.size,
    groups: sortedGroups,
    index: indexByGroup
  };
}

function main() {
  console.log('📚 Generating Stories index...\n');
  
  if (!existsSync(PAGES_JSON_PATH)) {
    console.error(`❌ ${PAGES_JSON_PATH} not found. Run build-index.mjs first.`);
    process.exit(1);
  }
  
  const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
  console.log(`📚 Processing ${pages.length} pages...`);
  
  const storiesIndex = generateStoriesIndex(pages);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Stories found: ${storiesIndex.totalStories}`);
  console.log(`   Groups: ${storiesIndex.groups.length}`);
  
  // Показываем статистику по группам
  console.log(`\n📋 Stories per group:`);
  storiesIndex.groups.forEach(group => {
    const count = storiesIndex.index[group].length;
    console.log(`   ${group}: ${count} story/stories`);
  });
  
  writeFileSync(STORIES_INDEX_OUTPUT_PATH, JSON.stringify(storiesIndex, null, 2), 'utf8');
  console.log(`\n✅ Stories index saved to ${STORIES_INDEX_OUTPUT_PATH}`);
}

main();

