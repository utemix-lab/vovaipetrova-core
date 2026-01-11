#!/usr/bin/env node
/**
 * Sitemap Coverage Check для Stories
 *
 * Проверяет, что все новые эпизоды и digests попадают в sitemap.xml
 * Авто-фикс "простых" пропусков (перегенерация sitemap если страницы есть в pages.json)
 *
 * Использование:
 *   node scripts/check-sitemap-stories-coverage.mjs [--fix] [--report-only]
 *
 * Переменные окружения:
 *   GITHUB_PR_NUMBER - номер PR для отчёта
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORIES_DIR = join(__dirname, '../docs/stories');
const PAGES_JSON_PATH = join(__dirname, '../prototype/data/pages.json');
const SITEMAP_PATH = join(__dirname, '../prototype/sitemap.xml');
const REPORT_PATH = join(__dirname, '../tmp/sitemap-stories-coverage-report.md');

function log(message) {
  console.log(`[sitemap-coverage] ${message}`);
}

function isStoryPage(page) {
  if (!page) return false;
  if (page.collection === 'stories') return true;
  const tags = Array.isArray(page.tags) ? page.tags : [];
  const machine = Array.isArray(page.machine_tags) ? page.machine_tags : [];
  return (
    tags.some((tag) => tag.toLowerCase() === 'story') ||
    machine.some((tag) => tag.toLowerCase() === 'content/story') ||
    (page.url && page.url.includes('/stories/'))
  );
}

function isPublicPage(page) {
  // Исключаем service страницы
  if (page.service === true) return false;
  
  // Включаем только ready и review страницы (draft исключаем)
  const status = (page.status || '').toLowerCase();
  if (status === 'draft') return false;
  
  return true;
}

function extractSlugFromFilename(filename) {
  // Убираем расширение
  const name = filename.replace(/\.md$/, '');
  
  // Для эпизодов формата YYYY-MM-DD-* берём весь slug
  // Для digest-YYYY-MM берём весь slug
  return name;
}

function getStoryFiles() {
  const files = globSync('*.md', { cwd: STORIES_DIR });
  
  // Исключаем служебные файлы
  const excluded = [
    'README',
    'CONCEPT',
    'SHARED_CONTEXT',
    'GITHUB_INSTRUCTIONS',
    'QUICK_START',
    'OPUS4_ROLE',
    'REVIEW'
  ];
  
  return files.filter(file => {
    const upper = file.toUpperCase();
    return !excluded.some(ex => upper.includes(ex));
  });
}

function getChangedStoriesFiles() {
  // Пытаемся определить изменённые файлы из git diff
  try {
    const baseRef = process.env.GITHUB_BASE_REF || 'main';
    const headRef = process.env.GITHUB_HEAD_REF || 'HEAD';
    
    let command;
    if (process.env.GITHUB_PR_NUMBER || process.env.GITHUB_BASE_REF) {
      // В CI используем git diff с base
      command = `git diff --name-only --diff-filter=A origin/${baseRef}...${headRef}`;
    } else {
      // Локально используем git diff с HEAD
      command = `git diff --name-only --diff-filter=A HEAD~1 HEAD`;
    }
    
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: join(__dirname, '..')
    });
    
    const changedFiles = output.trim().split('\n').filter(Boolean);
    return changedFiles
      .filter(file => file.startsWith('docs/stories/') && file.endsWith('.md'))
      .map(file => file.replace('docs/stories/', ''));
  } catch (e) {
    // Если не удалось определить изменённые файлы, возвращаем null
    return null;
  }
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
  
  return slugs;
}

function loadPages() {
  if (!existsSync(PAGES_JSON_PATH)) {
    log(`⚠️  ${PAGES_JSON_PATH} не найден`);
    return [];
  }
  
  return JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
}

async function main() {
  const args = {
    fix: process.argv.includes('--fix'),
    reportOnly: process.argv.includes('--report-only')
  };
  
  log('Проверка покрытия sitemap для Stories...\n');
  
  // Пытаемся определить изменённые файлы (для фокуса на новых)
  const changedFiles = getChangedStoriesFiles();
  const allStoryFiles = getStoryFiles();
  const storyFiles = changedFiles && changedFiles.length > 0 ? changedFiles : allStoryFiles;
  
  if (changedFiles && changedFiles.length > 0) {
    log(`Найдено ${changedFiles.length} изменённых файлов Stories в PR`);
  } else {
    log(`Найдено ${allStoryFiles.length} файлов Stories (проверка всех)`);
  }
  
  const pages = loadPages();
  log(`Загружено ${pages.length} страниц из pages.json`);
  
  const sitemapSlugs = parseSitemap();
  log(`Найдено ${sitemapSlugs.size} URL в sitemap.xml\n`);
  
  // Анализируем каждый файл Stories
  const issues = [];
  const fixed = [];
  
  for (const file of storyFiles) {
    const filePath = join(STORIES_DIR, file);
    const slug = extractSlugFromFilename(file);
    
    // Проверяем front matter
    let frontMatter = {};
    try {
      const raw = readFileSync(filePath, 'utf8');
      const parsed = matter(raw);
      frontMatter = parsed.data || {};
    } catch (e) {
      issues.push({
        file,
        slug,
        type: 'error',
        message: `Не удалось прочитать front matter: ${e.message}`
      });
      continue;
    }
    
    // Ищем страницу в pages.json
    const page = pages.find(p => 
      p.slug === slug || 
      p.url === `docs/stories/${file}` ||
      p.url === `docs/stories/${file.replace(/\.md$/, '')}`
    );
    
    if (!page) {
      issues.push({
        file,
        slug,
        type: 'missing_in_pages',
        message: 'Файл не найден в pages.json'
      });
      continue;
    }
    
    // Проверяем, является ли это Stories страницей
    if (!isStoryPage(page)) {
      issues.push({
        file,
        slug,
        type: 'not_story',
        message: 'Страница не определена как Stories (нет тега Story или collection)'
      });
      continue;
    }
    
    // Проверяем, является ли страница публичной
    if (!isPublicPage(page)) {
      issues.push({
        file,
        slug,
        type: 'not_public',
        message: `Страница не публичная (status: ${page.status}, service: ${page.service})`,
        status: page.status,
        service: page.service
      });
      continue;
    }
    
    // Проверяем наличие в sitemap
    if (!sitemapSlugs.has(slug)) {
      issues.push({
        file,
        slug,
        type: 'missing_in_sitemap',
        message: 'Страница есть в pages.json, но отсутствует в sitemap.xml',
        page
      });
      
      // Авто-фикс: если страница есть в pages.json и публичная, но нет в sitemap
      if (args.fix && isPublicPage(page) && isStoryPage(page)) {
        fixed.push({
          file,
          slug,
          action: 'regenerate_sitemap'
        });
      }
    }
  }
  
  // Генерируем отчёт
  const report = generateReport({
    totalFiles: storyFiles.length,
    issues,
    fixed,
    sitemapCount: sitemapSlugs.size,
    pagesCount: pages.length
  });
  
  // Сохраняем отчёт
  const reportDir = join(__dirname, '../tmp');
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  writeFileSync(REPORT_PATH, report, 'utf8');
  
  // Выводим результаты
  console.log('\n' + report);
  
  // Авто-фикс: перегенерируем sitemap если есть исправления
  if (args.fix && fixed.length > 0) {
    log(`\n🔧 Авто-фикс: перегенерация sitemap для ${fixed.length} страниц...`);
    try {
      execSync('npm run sitemap:generate', { 
        encoding: 'utf8',
        stdio: 'inherit',
        cwd: join(__dirname, '..')
      });
      log('✅ Sitemap перегенерирован');
    } catch (e) {
      log(`⚠️  Не удалось перегенерировать sitemap: ${e.message}`);
    }
  }
  
  // Прикрепляем отчёт к PR, если указан номер PR
  const prNumber = process.env.GITHUB_PR_NUMBER;
  if (prNumber && existsSync(REPORT_PATH)) {
    try {
      const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
      execSync(`gh pr comment ${prNumber} --repo ${GITHUB_REPO} --body-file "${REPORT_PATH}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, GITHUB_TOKEN }
      });
      log(`✅ Отчёт прикреплён к PR #${prNumber}`);
    } catch (e) {
      log(`⚠️  Не удалось прикрепить отчёт к PR: ${e.message}`);
    }
  }
  
  // Завершаем с кодом ошибки, если есть проблемы
  if (issues.length > 0 && !args.reportOnly) {
    process.exit(1);
  }
}

function generateReport({ totalFiles, issues, fixed, sitemapCount, pagesCount }) {
  const prNumber = process.env.GITHUB_PR_NUMBER || 'N/A';
  const lines = [
    '# Sitemap Coverage Report для Stories',
    '',
    `**PR:** #${prNumber}`,
    `**Дата:** ${new Date().toISOString()}`,
    '',
    '## Статистика',
    '',
    `- Всего файлов Stories: ${totalFiles}`,
    `- Страниц в pages.json: ${pagesCount}`,
    `- URL в sitemap.xml: ${sitemapCount}`,
    `- Проблем найдено: ${issues.length}`,
    `- Автоматически исправлено: ${fixed.length}`,
    ''
  ];
  
  if (issues.length === 0) {
    lines.push('## ✅ Результат',
      '',
      'Все эпизоды и digests Stories корректно покрыты sitemap.xml!',
      ''
    );
  } else {
    lines.push('## ⚠️ Проблемы',
      ''
    );
    
    // Группируем проблемы по типу
    const byType = {};
    for (const issue of issues) {
      if (!byType[issue.type]) {
        byType[issue.type] = [];
      }
      byType[issue.type].push(issue);
    }
    
    for (const [type, typeIssues] of Object.entries(byType)) {
      const typeLabels = {
        'missing_in_pages': '❌ Отсутствует в pages.json',
        'not_story': '⚠️ Не определена как Stories',
        'not_public': '📝 Не публичная (draft или service)',
        'missing_in_sitemap': '🗺️ Отсутствует в sitemap.xml',
        'error': '💥 Ошибка обработки'
      };
      
      lines.push(`### ${typeLabels[type] || type} (${typeIssues.length})`, '');
      
      for (const issue of typeIssues.slice(0, 20)) { // Ограничиваем до 20 для читаемости
        lines.push(`- **${issue.file}** (slug: \`${issue.slug}\`)`);
        lines.push(`  - ${issue.message}`);
        if (issue.status) {
          lines.push(`  - Статус: ${issue.status}, Service: ${issue.service}`);
        }
        lines.push('');
      }
      
      if (typeIssues.length > 20) {
        lines.push(`  - ... и ещё ${typeIssues.length - 20} проблем`);
        lines.push('');
      }
    }
  }
  
  if (fixed.length > 0) {
    lines.push('## 🔧 Автоматически исправлено', '');
    for (const fix of fixed) {
      lines.push(`- ✅ ${fix.file} (slug: \`${fix.slug}\`) - ${fix.action}`);
    }
    lines.push('');
  }
  
  lines.push('## Рекомендации', '');
  
  if (issues.some(i => i.type === 'missing_in_pages')) {
    lines.push('- Запустите `npm run build:index` для обновления pages.json');
    lines.push('');
  }
  
  if (issues.some(i => i.type === 'missing_in_sitemap')) {
    lines.push('- Запустите `npm run generate:sitemap` для обновления sitemap.xml');
    lines.push('- Или используйте `--fix` для автоматического исправления');
    lines.push('');
  }
  
  if (issues.some(i => i.type === 'not_public')) {
    lines.push('- Проверьте статус страниц: только `ready` и `review` попадают в sitemap');
    lines.push('- Убедитесь, что `service: true` не установлен для публичных Stories');
    lines.push('');
  }
  
  return lines.join('\n');
}

main().catch(error => {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
});
