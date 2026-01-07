#!/usr/bin/env node
/**
 * Backlinks Watchdog: мониторинг и проверка backlinks на регрессии и проблемы
 * 
 * Проверяет:
 * - Регрессии в количестве backlinks (сравнение с предыдущим состоянием)
 * - Несоответствия между фактическими ссылками и backlinks индексом
 * - Несуществующие страницы в backlinks
 * - Циклические ссылки
 * 
 * Использование:
 *   node scripts/backlinks-watchdog.mjs [--pr <pr-number>] [--strict] [--verbose]
 * 
 * Опции:
 *   --pr <number>    Добавить комментарий в PR при обнаружении проблем
 *   --strict         Завершить с ошибкой при обнаружении проблем
 *   --verbose        Подробный вывод
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES_JSON_PATH = join(__dirname, '../prototype/data/pages.json');
const BACKLINKS_JSON_PATH = join(__dirname, '../prototype/data/backlinks.json');
const BACKLINKS_BASELINE_PATH = join(__dirname, '../prototype/data/backlinks-baseline.json');
const DOCS_ROOT = join(__dirname, '../docs');

const PR_NUMBER_ARG = process.argv.indexOf('--pr');
const PR_NUMBER = PR_NUMBER_ARG >= 0 && process.argv[PR_NUMBER_ARG + 1] ? process.argv[PR_NUMBER_ARG + 1] : null;
const STRICT_MODE = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Загружает данные из JSON файла
 */
function loadJSON(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`⚠️  Failed to load ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Извлекает ссылки из контента Markdown файла
 */
function extractLinks(content) {
  const matches = [];
  
  // Удаляем code blocks перед парсингом ссылок
  let processedContent = content.replace(/```[\s\S]*?```/g, () => ' ');
  processedContent = processedContent.replace(/`[^`\n]*`/g, () => ' ');
  
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
  const withoutAnchor = href.split('#')[0].split('?')[0];
  const base = withoutAnchor
    .replace(/^(\.\/)+/, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^docs\//, "")
    .replace(/\.md$/, "");
  return base.toLowerCase();
}

/**
 * Проверяет регрессии в количестве backlinks
 */
function checkBacklinksRegression(currentBacklinks, baselineBacklinks) {
  const issues = [];
  const warnings = [];
  
  if (!baselineBacklinks) {
    if (VERBOSE) {
      console.log('ℹ️  No baseline found, skipping regression check');
    }
    return { issues, warnings };
  }
  
  // Проверяем страницы, которые потеряли backlinks
  for (const [slug, currentLinks] of Object.entries(currentBacklinks)) {
    const baselineLinks = baselineBacklinks[slug] || [];
    const currentCount = currentLinks.length;
    const baselineCount = baselineLinks.length;
    
    if (currentCount < baselineCount) {
      const lostCount = baselineCount - currentCount;
      const lostLinks = baselineLinks
        .filter(bl => !currentLinks.find(cl => cl.slug === bl.slug))
        .map(bl => bl.title)
        .slice(0, 3);
      
      issues.push({
        type: 'regression',
        slug,
        message: `Lost ${lostCount} backlink(s)`,
        details: `Was: ${baselineCount}, Now: ${currentCount}`,
        lostLinks: lostLinks.length > 0 ? lostLinks : null
      });
    }
  }
  
  // Проверяем новые страницы с backlinks (это хорошо, но можно предупредить)
  for (const [slug, currentLinks] of Object.entries(currentBacklinks)) {
    if (!baselineBacklinks[slug] && currentLinks.length > 0) {
      warnings.push({
        type: 'new_backlinks',
        slug,
        message: `New page with ${currentLinks.length} backlink(s)`,
        count: currentLinks.length
      });
    }
  }
  
  return { issues, warnings };
}

/**
 * Проверяет несоответствия между фактическими ссылками и backlinks индексом
 */
function checkBacklinksConsistency(pages, backlinks) {
  const issues = [];
  const warnings = [];
  
  // Строим обратную мапу: страница → страницы, на которые она ссылается
  const pageToTargets = new Map();
  
  pages.forEach(page => {
    if (page.service) return;
    
    const filePath = join(DOCS_ROOT, page.url.replace(/^docs\//, ''));
    if (!existsSync(filePath)) return;
    
    try {
      const raw = readFileSync(filePath, 'utf8');
      const parsed = matter(raw);
      const links = extractLinks(parsed.content);
      
      const targets = new Set();
      links.forEach(link => {
        const normalizedHref = normalizeLink(link.href);
        const targetPage = pages.find(p => {
          if (p.service) return false;
          const normalizedSlug = p.slug.toLowerCase();
          const normalizedPath = p.url.replace(/^docs\//, '').replace(/\.md$/, '').toLowerCase();
          return normalizedSlug === normalizedHref || normalizedPath === normalizedHref;
        });
        
        if (targetPage && !targetPage.service) {
          targets.add(targetPage.slug.toLowerCase());
        }
      });
      
      pageToTargets.set(page.slug.toLowerCase(), Array.from(targets));
    } catch (error) {
      if (VERBOSE) {
        console.warn(`⚠️  Failed to process ${filePath}:`, error.message);
      }
    }
  });
  
  // Проверяем, что backlinks соответствуют фактическим ссылкам
  for (const [targetSlug, backlinkList] of Object.entries(backlinks)) {
    backlinkList.forEach(backlink => {
      const sourceSlug = backlink.slug.toLowerCase();
      const actualTargets = pageToTargets.get(sourceSlug) || [];
      
      if (!actualTargets.includes(targetSlug)) {
        issues.push({
          type: 'inconsistency',
          sourceSlug: backlink.slug,
          targetSlug,
          message: `Backlink mismatch: ${backlink.title} → ${targetSlug}`,
          details: `Backlinks index claims this link exists, but it's not found in source file`
        });
      }
    });
  }
  
  // Проверяем обратное: есть ссылки, но нет backlinks
  pageToTargets.forEach((targets, sourceSlug) => {
    targets.forEach(targetSlug => {
      const backlinkList = backlinks[targetSlug] || [];
      const hasBacklink = backlinkList.some(bl => bl.slug.toLowerCase() === sourceSlug);
      
      if (!hasBacklink) {
        warnings.push({
          type: 'missing_backlink',
          sourceSlug,
          targetSlug,
          message: `Link exists but not in backlinks index: ${sourceSlug} → ${targetSlug}`
        });
      }
    });
  });
  
  return { issues, warnings };
}

/**
 * Проверяет несуществующие страницы в backlinks
 */
function checkInvalidBacklinks(pages, backlinks) {
  const issues = [];
  
  const validSlugs = new Set(
    pages.filter(p => !p.service).map(p => p.slug.toLowerCase())
  );
  
  for (const [targetSlug, backlinkList] of Object.entries(backlinks)) {
    // Проверяем, что целевая страница существует
    if (!validSlugs.has(targetSlug)) {
      issues.push({
        type: 'invalid_target',
        targetSlug,
        message: `Target page does not exist: ${targetSlug}`,
        backlinksCount: backlinkList.length
      });
    }
    
    // Проверяем, что все страницы в backlinks существуют
    backlinkList.forEach(backlink => {
      const sourceSlug = backlink.slug.toLowerCase();
      if (!validSlugs.has(sourceSlug)) {
        issues.push({
          type: 'invalid_source',
          sourceSlug: backlink.slug,
          targetSlug,
          message: `Source page in backlinks does not exist: ${backlink.title}`
        });
      }
    });
  }
  
  return { issues, warnings: [] };
}

/**
 * Генерирует отчёт о проблемах
 */
function generateReport(allIssues, allWarnings) {
  const report = [];
  
  if (allIssues.length === 0 && allWarnings.length === 0) {
    report.push('✅ **No backlinks issues detected**');
    report.push('');
    report.push('All backlinks are consistent and valid.');
    return report.join('\n');
  }
  
  report.push('## 🔍 Backlinks Watchdog Report');
  report.push('');
  
  if (allIssues.length > 0) {
    report.push(`### ❌ Issues (${allIssues.length})`);
    report.push('');
    
    // Группируем по типу
    const byType = {};
    allIssues.forEach(issue => {
      if (!byType[issue.type]) {
        byType[issue.type] = [];
      }
      byType[issue.type].push(issue);
    });
    
    for (const [type, issues] of Object.entries(byType)) {
      report.push(`#### ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${issues.length})`);
      report.push('');
      
      issues.slice(0, 10).forEach(issue => {
        report.push(`- **${issue.slug || issue.sourceSlug || issue.targetSlug}**: ${issue.message}`);
        if (issue.details) {
          report.push(`  - ${issue.details}`);
        }
        if (issue.lostLinks && issue.lostLinks.length > 0) {
          report.push(`  - Lost links: ${issue.lostLinks.join(', ')}`);
        }
      });
      
      if (issues.length > 10) {
        report.push(`  - _... and ${issues.length - 10} more_`);
      }
      report.push('');
    }
  }
  
  if (allWarnings.length > 0) {
    report.push(`### ⚠️  Warnings (${allWarnings.length})`);
    report.push('');
    
    allWarnings.slice(0, 10).forEach(warning => {
      report.push(`- **${warning.slug || warning.sourceSlug || warning.targetSlug}**: ${warning.message}`);
    });
    
    if (allWarnings.length > 10) {
      report.push(`- _... and ${allWarnings.length - 10} more_`);
    }
    report.push('');
  }
  
  report.push(`_Generated at ${new Date().toISOString()}_`);
  
  return report.join('\n');
}

/**
 * Сохраняет текущее состояние как baseline
 */
function saveBaseline(backlinks) {
  try {
    writeFileSync(BACKLINKS_BASELINE_PATH, JSON.stringify(backlinks, null, 2), 'utf8');
    console.log(`✅ Baseline saved to ${BACKLINKS_BASELINE_PATH}`);
  } catch (error) {
    console.warn(`⚠️  Failed to save baseline:`, error.message);
  }
}

function main() {
  console.log('🔍 Backlinks Watchdog: monitoring and validation\n');
  
  // Загружаем данные
  const pages = loadJSON(PAGES_JSON_PATH);
  if (!pages) {
    console.error(`❌ ${PAGES_JSON_PATH} not found. Run generate-diagnostics.mjs first.`);
    process.exit(1);
  }
  
  const backlinks = loadJSON(BACKLINKS_JSON_PATH);
  if (!backlinks) {
    console.error(`❌ ${BACKLINKS_JSON_PATH} not found. Run generate-backlinks.mjs first.`);
    process.exit(1);
  }
  
  const baselineBacklinks = loadJSON(BACKLINKS_BASELINE_PATH);
  
  console.log(`📚 Processing ${pages.length} pages...`);
  console.log(`🔗 Found ${Object.keys(backlinks).length} pages with backlinks`);
  console.log(`   Total backlinks: ${Object.values(backlinks).reduce((sum, links) => sum + links.length, 0)}`);
  console.log('');
  
  // Выполняем проверки
  const allIssues = [];
  const allWarnings = [];
  
  // 1. Проверка регрессий
  if (baselineBacklinks) {
    console.log('📊 Checking for regressions...');
    const { issues, warnings } = checkBacklinksRegression(backlinks, baselineBacklinks);
    allIssues.push(...issues);
    allWarnings.push(...warnings);
    if (VERBOSE || issues.length > 0 || warnings.length > 0) {
      console.log(`   Found ${issues.length} issues, ${warnings.length} warnings`);
    }
  }
  
  // 2. Проверка консистентности
  console.log('🔍 Checking consistency...');
  const consistency = checkBacklinksConsistency(pages, backlinks);
  allIssues.push(...consistency.issues);
  allWarnings.push(...consistency.warnings);
  if (VERBOSE || consistency.issues.length > 0 || consistency.warnings.length > 0) {
    console.log(`   Found ${consistency.issues.length} issues, ${consistency.warnings.length} warnings`);
  }
  
  // 3. Проверка валидности
  console.log('✅ Checking validity...');
  const validity = checkInvalidBacklinks(pages, backlinks);
  allIssues.push(...validity.issues);
  allWarnings.push(...validity.warnings);
  if (VERBOSE || validity.issues.length > 0 || validity.warnings.length > 0) {
    console.log(`   Found ${validity.issues.length} issues, ${validity.warnings.length} warnings`);
  }
  
  console.log('');
  
  // Генерируем отчёт
  const report = generateReport(allIssues, allWarnings);
  console.log(report);
  
  // Сохраняем baseline, если нет проблем или если это первый запуск
  if (allIssues.length === 0 || !baselineBacklinks) {
    saveBaseline(backlinks);
  }
  
  // Добавляем комментарий в PR, если указан
  if (PR_NUMBER && (allIssues.length > 0 || allWarnings.length > 0)) {
    const repo = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
    const token = process.env.GITHUB_TOKEN;
    
    if (!token) {
      console.warn('\n⚠️  GITHUB_TOKEN not found, skipping PR comment');
    } else {
      try {
        const tmpFile = join(__dirname, '../tmp-backlinks-watchdog-report.txt');
        writeFileSync(tmpFile, report, 'utf8');
        
        execSync(
          `gh pr comment ${PR_NUMBER} --repo ${repo} --body-file "${tmpFile}"`,
          {
            stdio: 'inherit',
            encoding: 'utf-8',
            env: { ...process.env, GITHUB_TOKEN: token }
          }
        );
        console.log(`\n✅ Comment added to PR #${PR_NUMBER}`);
        
        // Удаляем временный файл
        try {
          unlinkSync(tmpFile);
        } catch (e) {
          // Игнорируем ошибки удаления
        }
      } catch (error) {
        console.error(`\n⚠️  Failed to add PR comment:`, error.message);
      }
    }
  }
  
  // Завершаем с ошибкой в strict mode, если есть проблемы
  if (STRICT_MODE && allIssues.length > 0) {
    console.error(`\n❌ Backlinks watchdog found ${allIssues.length} issue(s) (strict mode)`);
    process.exit(1);
  }
  
  if (allIssues.length === 0 && allWarnings.length === 0) {
    console.log('\n✅ All checks passed!');
  } else {
    console.log(`\n⚠️  Found ${allIssues.length} issue(s) and ${allWarnings.length} warning(s)`);
  }
}

main();

