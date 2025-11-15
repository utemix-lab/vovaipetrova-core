import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

const PAGES_JSON = 'prototype/data/pages.json';
const BROKEN_LINKS_JSON = 'prototype/data/broken-links.json';
const OUTPUT_JSON = 'prototype/data/stats.json';

function generateStats() {
  const pages = JSON.parse(readFileSync(PAGES_JSON, 'utf8'));
  const brokenLinks = JSON.parse(readFileSync(BROKEN_LINKS_JSON, 'utf8'));
  
  // Фильтруем только неслужебные страницы
  const docPages = pages.filter(p => !p.service && !p.url.includes('/stories/'));
  
  // Группируем issues по файлам
  const issuesByFile = new Map();
  brokenLinks.issues.forEach(issue => {
    const file = issue.file;
    if (!issuesByFile.has(file)) {
      issuesByFile.set(file, []);
    }
    issuesByFile.get(file).push(issue);
  });
  
  // Создаем список проблемных страниц с подсчетом issues
  const problems = [];
  issuesByFile.forEach((issues, file) => {
    const page = docPages.find(p => p.url.includes(file) || p.slug === file.replace('.md', ''));
    if (page) {
      const internalMissing = issues.filter(i => i.reason === 'missing' && !i.link.startsWith('http')).length;
      const service = issues.filter(i => i.reason === 'service' || i.link.includes('service')).length;
      const external = issues.filter(i => i.link.startsWith('http')).length;
      const unknown = issues.filter(i => i.reason === 'unknown_target' || i.reason === 'unknown').length;
      
      const score = internalMissing * 3 + service * 2 + unknown * 1;
      
      if (score > 0) {
        problems.push({
          slug: page.slug,
          title: page.title,
          issues_total: issues.length,
          issues_internal_missing: internalMissing,
          issues_service: service,
          issues_external: external,
          issues_unknown: unknown,
          score: score
        });
      }
    }
  });
  
  // Сортируем по score (по убыванию)
  problems.sort((a, b) => b.score - a.score);
  
  // Подсчитываем totals
  const totals = {
    pages: docPages.length,
    statuses: {
      ready: docPages.filter(p => p.status === 'ready').length,
      review: docPages.filter(p => p.status === 'review').length,
      draft: docPages.filter(p => p.status === 'draft').length
    },
    issues_total: brokenLinks.brokenCount,
    issues_internal_missing: brokenLinks.issues.filter(i => i.reason === 'missing' && !i.link.startsWith('http')).length,
    issues_service: brokenLinks.issues.filter(i => i.reason === 'service' || i.link.includes('service')).length,
    issues_external: brokenLinks.issues.filter(i => i.link.startsWith('http')).length,
    issues_unknown: brokenLinks.issues.filter(i => i.reason === 'unknown_target' || i.reason === 'unknown').length
  };
  
  const result = {
    generatedAt: new Date().toISOString(),
    totals,
    topProblems: problems.slice(0, 20), // Топ 20 проблемных страниц
    issuesPerPage: problems.slice(0, 50) // Топ 50 для детального анализа
  };
  
  writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ Generated ${OUTPUT_JSON}`);
  console.log(`📊 Total pages: ${totals.pages}`);
  console.log(`⚠️  Total issues: ${totals.issues_total}`);
  console.log(`🔝 Top problems: ${result.topProblems.length}`);
  
  return result;
}

generateStats();

