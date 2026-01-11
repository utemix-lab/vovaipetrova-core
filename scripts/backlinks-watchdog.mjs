#!/usr/bin/env node
/**
 * Backlinks Watchdog v2: мониторинг и проверка backlinks с авто-фиксом
 *
 * Проверяет:
 * - Регрессии в количестве backlinks (сравнение с предыдущим состоянием)
 * - Несоответствия между фактическими ссылками и backlinks индексом
 * - Несуществующие страницы в backlinks
 * - Битые якоря (#section) - авто-фикс: удаление несуществующего якоря
 * - Несоответствия регистра (case mismatch) - авто-фикс: исправление регистра
 *
 * Использование:
 *   node scripts/backlinks-watchdog.mjs [--pr <pr-number>] [--strict] [--verbose] [--fix]
 *
 * Опции:
 *   --pr <number>    Добавить комментарий в PR при обнаружении проблем
 *   --strict         Завершить с ошибкой при обнаружении проблем
 *   --verbose        Подробный вывод
 *   --fix            Применить авто-исправления (битые якоря, регистры)
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
const FIX_MODE = process.argv.includes('--fix');
const DRY_RUN = process.argv.includes('--dry-run');

// Путь для сохранения отчёта (для CI-артефакта)
const REPORT_OUTPUT_DIR = process.env.CI_ARTIFACTS_DIR || join(__dirname, '../tmp');
const REPORT_OUTPUT_PATH = join(REPORT_OUTPUT_DIR, 'backlinks-watchdog-report.md');
const FIXES_OUTPUT_PATH = join(REPORT_OUTPUT_DIR, 'backlinks-fixes-applied.json');

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
 * Извлекает ссылки из контента Markdown файла с позициями
 */
function extractLinks(content) {
    const matches = [];

    // Сохраняем позиции для авто-фикса
    let processedContent = content.replace(/```[\s\S]*?```/g, (match, offset) => {
        return ' '.repeat(match.length);
    });
    processedContent = processedContent.replace(/`[^`\n]*`/g, (match, offset) => {
        return ' '.repeat(match.length);
    });

    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(processedContent)) !== null) {
        const preceding = processedContent[match.index - 1];
        if (preceding === "!") continue; // skip images
        matches.push({
            text: match[1],
            href: match[2],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            fullMatch: match[0]
        });
    }
    return matches;
}

/**
 * Генерирует slug для заголовка (аналогично GitHub/Markdown)
 */
function headerToId(headerText) {
    return headerText
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Удаляем спецсимволы
        .replace(/\s+/g, '-') // Пробелы в дефисы
        .replace(/-+/g, '-') // Множественные дефисы в один
        .replace(/^-|-$/g, ''); // Удаляем дефисы в начале/конце
}

/**
 * Извлекает заголовки из Markdown контента (для проверки якорей)
 */
function extractHeaders(content) {
    const headers = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
        // Заголовки вида ### Title или Title\n===
        const h1Match = line.match(/^(#{1,6})\s+(.+)$/);
        if (h1Match) {
            const level = h1Match[1].length;
            const text = h1Match[2].trim();
            const id = headerToId(text);
            headers.push({ level, text, id });
        }
    }
    
    return headers;
}

/**
 * Проверяет, существует ли якорь на целевой странице
 */
function anchorExists(targetFilePath, anchor) {
    if (!anchor || !anchor.startsWith('#')) return true; // Нет якоря - считается валидным
    
    const anchorId = anchor.substring(1); // Убираем #
    if (!existsSync(targetFilePath)) return false;
    
    try {
        const raw = readFileSync(targetFilePath, 'utf8');
        const parsed = matter(raw);
        const headers = extractHeaders(parsed.content);
        
        // Проверяем, есть ли заголовок с таким id
        return headers.some(h => h.id === anchorId);
    } catch (error) {
        return false;
    }
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
 * v2: Проверяет ссылки на проблемы (битые якоря, регистры) и может их исправить
 */
function checkAndFixLinks(pages) {
    const autoFixed = [];
    const manualFix = [];
    const fixedFiles = new Map(); // filePath → { content, frontMatter, fixes }

    pages.forEach(page => {
        if (page.service) return;

        const filePath = join(DOCS_ROOT, page.url.replace(/^docs\//, ''));
        if (!existsSync(filePath)) return;

        try {
            const raw = readFileSync(filePath, 'utf8');
            const parsed = matter(raw);
            let content = parsed.content;
            const fileFixes = [];

            const links = extractLinks(content);
            
            // Сортируем ссылки по позиции (от конца к началу) для безопасной замены
            const sortedLinks = [...links].sort((a, b) => b.startIndex - a.startIndex);
            
            for (const link of sortedLinks) {
                const href = link.href;
                
                // Разделяем на путь и якорь
                const pathPart = href.split('#')[0];
                const anchor = href.includes('#') ? href.split('#').slice(1).join('#') : null;
                const normalizedPath = normalizeLink(pathPart || href);
                
                // Ищем целевую страницу
                const targetPage = pages.find(p => {
                    if (p.service) return false;
                    const normalizedSlug = p.slug.toLowerCase();
                    const normalizedPagePath = p.url.replace(/^docs\//, '').replace(/\.md$/, '').toLowerCase();
                    return normalizedSlug === normalizedPath || normalizedPagePath === normalizedPath;
                });

                if (!targetPage) {
                    // Страница не найдена - не можем авто-исправить
                    manualFix.push({
                        type: 'missing_target',
                        sourceFile: filePath,
                        sourceSlug: page.slug,
                        href: href,
                        message: `Target page not found: ${href}`
                    });
                    continue;
                }

                let needsFix = false;
                let fixedHref = null;
                let fixType = null;
                let fixDetails = null;

                // Проверка 1: Битый якорь
                if (anchor) {
                    const targetFilePath = join(DOCS_ROOT, targetPage.url.replace(/^docs\//, ''));
                    if (!anchorExists(targetFilePath, `#${anchor}`)) {
                        // Якорь не существует - можно авто-исправить, удалив якорь
                        fixedHref = pathPart || targetPage.slug + '.md';
                        fixType = 'broken_anchor';
                        fixDetails = { anchor: anchor, targetSlug: targetPage.slug };
                        needsFix = true;
                    }
                }

                // Проверка 2: Несоответствие регистра (case mismatch)
                // Если путь найден case-insensitive, но отличается регистром
                if (!needsFix) {
                    const actualPath = pathPart || href.split('#')[0] || href;
                    const expectedPath = targetPage.slug + '.md';
                    
                    if (actualPath.toLowerCase() === expectedPath.toLowerCase() && actualPath !== expectedPath) {
                        // Регистр отличается - можно авто-исправить
                        fixedHref = anchor ? `${expectedPath}#${anchor}` : expectedPath;
                        fixType = 'case_mismatch';
                        fixDetails = { oldHref: actualPath, newHref: expectedPath };
                        needsFix = true;
                    }
                }

                // Применяем исправление
                if (needsFix && fixedHref) {
                    const oldLink = link.fullMatch;
                    const newLink = `[${link.text}](${fixedHref})`;
                    
                    fileFixes.push({
                        type: fixType,
                        oldLink,
                        newLink,
                        ...fixDetails
                    });
                    
                    // Применяем исправление (с конца файла, чтобы не сбить индексы)
                    content = content.substring(0, link.startIndex) + newLink + content.substring(link.endIndex);
                    
                    autoFixed.push({
                        type: fixType,
                        file: filePath,
                        slug: page.slug,
                        fix: { oldLink, newLink, ...fixDetails },
                        message: fixType === 'broken_anchor' 
                            ? `Removed broken anchor #${fixDetails.anchor}`
                            : `Fixed case mismatch: ${fixDetails.oldHref} → ${fixDetails.newHref}`
                    });
                }
            }

            if (fileFixes.length > 0) {
                fixedFiles.set(filePath, {
                    content,
                    frontMatter: parsed.data,
                    fixes: fileFixes
                });
            }
        } catch (error) {
            if (VERBOSE) {
                console.warn(`⚠️  Failed to process ${filePath}:`, error.message);
            }
        }
    });

    // Применяем исправления, если включен режим --fix
    if (FIX_MODE && fixedFiles.size > 0) {
        if (DRY_RUN) {
            console.log(`\n[DRY RUN] Would fix ${fixedFiles.size} file(s):`);
            fixedFiles.forEach((data, filePath) => {
                console.log(`  - ${filePath} (${data.fixes.length} fix(es))`);
            });
        } else {
            fixedFiles.forEach((data, filePath) => {
                try {
                    const updated = matter.stringify(data.content, data.frontMatter);
                    writeFileSync(filePath, updated, 'utf8');
                    if (VERBOSE) {
                        console.log(`✅ Fixed ${data.fixes.length} link(s) in ${filePath}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to write ${filePath}:`, error.message);
                }
            });
        }
    }

    return { autoFixed, manualFix };
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
 * v2: Генерирует отчёт о проблемах с разделением на авто-исправленные и требующие ручной правки
 */
function generateReport(allIssues, allWarnings, autoFixed, manualFix) {
    const report = [];

    const hasAnyProblems = allIssues.length > 0 || allWarnings.length > 0 || autoFixed.length > 0 || manualFix.length > 0;

    if (!hasAnyProblems) {
        report.push('✅ **No backlinks issues detected**');
        report.push('');
        report.push('All backlinks are consistent and valid.');
        return report.join('\n');
    }

    report.push('## 🔍 Backlinks Watchdog v2 Report');
    report.push('');

    // v2: Авто-исправленные проблемы
    if (autoFixed.length > 0) {
        report.push(`### ✅ Auto-fixed (${autoFixed.length})`);
        report.push('');
        
        const byType = {};
        autoFixed.forEach(fix => {
            if (!byType[fix.type]) {
                byType[fix.type] = [];
            }
            byType[fix.type].push(fix);
        });

        for (const [type, fixes] of Object.entries(byType)) {
            const typeName = type === 'broken_anchor' ? 'Broken Anchors' : 'Case Mismatches';
            report.push(`#### ${typeName} (${fixes.length})`);
            report.push('');

            fixes.slice(0, 10).forEach(fix => {
                report.push(`- **${fix.slug}**: ${fix.message}`);
                if (fix.fix.oldLink) {
                    report.push(`  - \`${fix.fix.oldLink}\` → \`${fix.fix.newLink}\``);
                }
                report.push(`  - File: \`${fix.file.replace(/^.*[\\/]/, '')}\``);
            });

            if (fixes.length > 10) {
                report.push(`  - _... and ${fixes.length - 10} more_`);
            }
            report.push('');
        }

        if (!FIX_MODE) {
            report.push('> 💡 Run with `--fix` flag to apply these fixes automatically');
            report.push('');
        } else if (DRY_RUN) {
            report.push('> ⚠️  DRY RUN mode - no files were modified');
            report.push('');
        } else {
            report.push('> ✅ Fixes applied automatically');
            report.push('');
        }
    }

    // v2: Проблемы, требующие ручной правки
    if (manualFix.length > 0) {
        report.push(`### 🔧 Requires Manual Fix (${manualFix.length})`);
        report.push('');

        manualFix.slice(0, 20).forEach(fix => {
            report.push(`- **${fix.sourceSlug}**: ${fix.message}`);
            report.push(`  - File: \`${fix.sourceFile.replace(/^.*[\\/]/, '')}\``);
            report.push(`  - Link: \`${fix.href}\``);
        });

        if (manualFix.length > 20) {
            report.push(`- _... and ${manualFix.length - 20} more_`);
        }
        report.push('');
    }

    // Остальные проблемы
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
    let autoFixed = [];
    let manualFix = [];

    // v2: Проверка и авто-фикс ссылок (битые якоря, регистры)
    console.log('🔧 Checking links and auto-fixing simple issues...');
    const linkCheck = checkAndFixLinks(pages);
    autoFixed = linkCheck.autoFixed;
    manualFix = linkCheck.manualFix;
    if (VERBOSE || autoFixed.length > 0 || manualFix.length > 0) {
        console.log(`   Auto-fixed: ${autoFixed.length}, Manual fix required: ${manualFix.length}`);
    }
    if (FIX_MODE && autoFixed.length > 0) {
        console.log(`   ${DRY_RUN ? '[DRY RUN] Would apply' : 'Applied'} ${autoFixed.length} auto-fix(es)`);
    }

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

    // v2: Генерируем отчёт с разделением на авто-исправленные и требующие ручной правки
    const report = generateReport(allIssues, allWarnings, autoFixed, manualFix);
    console.log(report);

    // v2: Сохраняем отчёт в файл для CI-артефакта
    try {
        if (!existsSync(REPORT_OUTPUT_DIR)) {
            mkdirSync(REPORT_OUTPUT_DIR, { recursive: true });
        }
        writeFileSync(REPORT_OUTPUT_PATH, report, 'utf8');
        if (VERBOSE || process.env.CI) {
            console.log(`\n📄 Report saved to ${REPORT_OUTPUT_PATH}`);
        }
    } catch (error) {
        console.warn(`⚠️  Failed to save report: ${error.message}`);
    }

    // v2: Сохраняем документацию применённых фиксов
    if (autoFixed.length > 0 && FIX_MODE && !DRY_RUN) {
        try {
            const fixesDoc = {
                version: '2.0',
                generated_at: new Date().toISOString(),
                total_fixes: autoFixed.length,
                fixes_by_type: {},
                fixes: autoFixed.map(fix => ({
                    type: fix.type,
                    file: fix.file.replace(/^.*[\\/]/, ''),
                    slug: fix.slug,
                    old_link: fix.fix.oldLink,
                    new_link: fix.fix.newLink,
                    message: fix.message,
                    details: fix.fix
                }))
            };

            // Группируем по типу
            autoFixed.forEach(fix => {
                if (!fixesDoc.fixes_by_type[fix.type]) {
                    fixesDoc.fixes_by_type[fix.type] = 0;
                }
                fixesDoc.fixes_by_type[fix.type]++;
            });

            writeFileSync(FIXES_OUTPUT_PATH, JSON.stringify(fixesDoc, null, 2), 'utf8');
            if (VERBOSE || process.env.CI) {
                console.log(`📝 Fixes documentation saved to ${FIXES_OUTPUT_PATH}`);
            }
        } catch (error) {
            console.warn(`⚠️  Failed to save fixes documentation: ${error.message}`);
        }
    }

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

    // v2: Учитываем авто-исправленные проблемы в итоговом статусе
    const totalManualIssues = allIssues.length + manualFix.length;
    
    if (totalManualIssues === 0 && allWarnings.length === 0) {
        if (autoFixed.length > 0 && FIX_MODE && !DRY_RUN) {
            console.log(`\n✅ All checks passed! Auto-fixed ${autoFixed.length} issue(s).`);
        } else {
            console.log('\n✅ All checks passed!');
        }
    } else {
        console.log(`\n⚠️  Found ${totalManualIssues} issue(s) requiring attention and ${allWarnings.length} warning(s)`);
        if (autoFixed.length > 0) {
            console.log(`   ${autoFixed.length} issue(s) auto-fixed`);
        }
    }
}

main();

