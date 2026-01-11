#!/usr/bin/env node
/**
 * Machine Episode Generator
 *
 * Генерирует дневной авто-эпизод из последних PR и Diagnostics, без авторской части.
 *
 * Использование:
 *   node scripts/generate-machine-episode.mjs
 *
 * Переменные окружения:
 *   GITHUB_TOKEN - токен для доступа к GitHub API
 *   GITHUB_REPOSITORY - репозиторий (owner/repo)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import slugify from 'slugify';

const STORIES_DIR = 'docs/stories';
const META_DIR = 'tmp';
const META_PATH = path.join(META_DIR, 'machine-episode-meta.json');
const MOSCOW_TZ = 'Europe/Moscow';

function log(message) {
  console.log(`[machine-episode] ${message}`);
}

function getTodayIso() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

function getYesterdayIso() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(yesterday); // YYYY-MM-DD
}

function slugifyText(value) {
  return (
    slugify(value || 'episode', {
      lower: true,
      strict: true,
      locale: 'ru',
      trim: true,
    }) || 'episode'
  );
}

function alreadyGeneratedFor(date) {
  const pattern = path.join(STORIES_DIR, `${date}-machine-*.md`).replace(/\\/g, '/');
  const matches = globSync(pattern);
  return matches.length > 0;
}

function loadJSON(filePath, defaultValue = null) {
  if (!existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    log(`⚠️  Failed to load ${filePath}: ${e.message}`);
    return defaultValue;
  }
}

function getMergedPRsSince(sinceDate) {
  try {
    // Получаем список merged PR за последние 24 часа
    const since = new Date(sinceDate);
    since.setHours(0, 0, 0, 0);
    const sinceISO = since.toISOString();
    
    const cmd = `gh pr list --state merged --limit 20 --json number,title,mergedAt,url,labels --search "merged:>=${sinceISO.split('T')[0]}"`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    const prs = JSON.parse(output);
    
    // Фильтруем только те, что были merged сегодня или вчера
    const today = getTodayIso();
    const yesterday = getYesterdayIso();
    
    return prs.filter(pr => {
      if (!pr.mergedAt) return false;
      const mergedDate = pr.mergedAt.split('T')[0];
      return mergedDate === today || mergedDate === yesterday;
    });
  } catch (e) {
    log(`⚠️  Failed to get merged PRs: ${e.message}`);
    return [];
  }
}

function buildMachineEpisode({ date, prs, stats, brokenLinks }) {
  const title = `Machine Episode: ${date}`;
  const slug = slugifyText(`machine-${date}`);

  // What: что произошло за день
  const whatParts = [];
  whatParts.push('Автоматически сгенерированный эпизод из последних PR и Diagnostics:');

  if (prs && prs.length > 0) {
    whatParts.push(`\n**Merged PRs (${prs.length}):**`);
    prs.slice(0, 5).forEach(pr => {
      const labels = pr.labels?.map(l => l.name).filter(n => n.startsWith('lane:') || n.startsWith('auto:')).join(', ') || '';
      whatParts.push(`- [PR #${pr.number}](${pr.url}): ${pr.title}${labels ? ` (${labels})` : ''}`);
    });
    if (prs.length > 5) {
      whatParts.push(`- ... и ещё ${prs.length - 5} PR`);
    }
  } else {
    whatParts.push('\n**Merged PRs:** нет новых PR за день');
  }

  if (stats?.totals) {
    const readyCount = stats.totals.statuses?.ready ?? stats.totals.ready ?? 0;
    const draftCount = stats.totals.statuses?.draft ?? stats.totals.draft ?? 0;
    const totalPages = stats.totals.pages ?? 0;
    whatParts.push(`\n**ProtoLabs Stats:**`);
    whatParts.push(`- Всего страниц: ${totalPages}`);
    whatParts.push(`- Ready: ${readyCount}, Draft: ${draftCount}`);
  }

  if (brokenLinks?.issues?.length > 0) {
    const internalMissing = brokenLinks.issues.filter(i => i.reason === 'missing' && !i.link?.startsWith('http')).length;
    whatParts.push(`\n**Broken Links:**`);
    whatParts.push(`- Всего проблем: ${brokenLinks.issues.length}`);
    if (internalMissing > 0) {
      whatParts.push(`- Внутренние отсутствующие: ${internalMissing} ⚠️`);
    }
  }

  const what = whatParts.join('\n');

  // Why: зачем это важно
  const why = `Автоматическая фиксация событий проекта для истории развития. Machine episodes помогают отслеживать изменения без ручного вмешательства.`;

  // Result: что получилось
  const resultParts = [];
  resultParts.push('Создан machine episode с данными за день:');
  if (prs && prs.length > 0) {
    resultParts.push(`- ✅ Зафиксировано ${prs.length} merged PR`);
  }
  if (stats) {
    resultParts.push(`- ✅ Обновлена статистика ProtoLabs`);
  }
  if (brokenLinks) {
    resultParts.push(`- ✅ Проверены ссылки`);
  }
  const result = resultParts.join('\n');

  // Next: что дальше
  const next = 'Machine episodes будут генерироваться ежедневно при наличии событий.';

  // MACHINE_REPORT
  const machineReportParts = [];
  machineReportParts.push('## MACHINE_REPORT');
  machineReportParts.push('');
  machineReportParts.push('### Источники данных');
  machineReportParts.push(`- Дата: ${date}`);
  machineReportParts.push(`- Источники: GitHub PR API, Diagnostics snapshot`);
  machineReportParts.push('');

  if (prs && prs.length > 0) {
    machineReportParts.push('### Merged PRs');
    prs.forEach(pr => {
      machineReportParts.push(`- **PR #${pr.number}**: [${pr.title}](${pr.url})`);
      machineReportParts.push(`  - Merged: ${pr.mergedAt ? new Date(pr.mergedAt).toLocaleString('ru-RU', { timeZone: MOSCOW_TZ }) : 'N/A'}`);
      if (pr.labels && pr.labels.length > 0) {
        const labelNames = pr.labels.map(l => l.name).join(', ');
        machineReportParts.push(`  - Labels: ${labelNames}`);
      }
    });
    machineReportParts.push('');
  }

  if (stats) {
    machineReportParts.push('### Diagnostics Snapshot');
    machineReportParts.push(`- Generated at: ${stats.generatedAt || 'N/A'}`);
    if (stats.totals) {
      machineReportParts.push(`- Total pages: ${stats.totals.pages || 0}`);
      machineReportParts.push(`- Ready: ${stats.totals.statuses?.ready || stats.totals.ready || 0}`);
      machineReportParts.push(`- Draft: ${stats.totals.statuses?.draft || stats.totals.draft || 0}`);
    }
    machineReportParts.push('');
  }

  if (brokenLinks) {
    machineReportParts.push('### Broken Links');
    machineReportParts.push(`- Total issues: ${brokenLinks.issues?.length || 0}`);
    if (brokenLinks.issues && brokenLinks.issues.length > 0) {
      const internalMissing = brokenLinks.issues.filter(i => i.reason === 'missing' && !i.link?.startsWith('http')).length;
      if (internalMissing > 0) {
        machineReportParts.push(`- Internal missing: ${internalMissing}`);
      }
    }
    machineReportParts.push('');
  }

  const machineReport = machineReportParts.join('\n');

  const content = [
    `# ${title}`,
    '',
    '## What',
    '',
    what,
    '',
    '## Why',
    '',
    why,
    '',
    '## Result',
    '',
    result,
    '',
    '## Next',
    '',
    next,
    '',
    machineReport,
  ].join('\n');

  const frontMatter = {
    title: title,
    slug: slug,
    summary: `Автоматически сгенерированный machine episode за ${date} из последних PR и Diagnostics`,
    tags: ['Story', 'Machine'],
    machine_tags: ['content/story', 'content/machine'],
    status: 'draft',
    generated_at: new Date().toISOString(),
    pr_count: prs ? prs.length : 0,
  };

  return {
    title,
    slug,
    content,
    frontMatter,
  };
}

function main() {
  log('Генерация machine episode...');

  if (!existsSync(STORIES_DIR)) {
    mkdirSync(STORIES_DIR, { recursive: true });
  }

  if (!existsSync(META_DIR)) {
    mkdirSync(META_DIR, { recursive: true });
  }

  const today = getTodayIso();
  const yesterday = getYesterdayIso();

  // Проверяем, не создан ли уже эпизод за сегодня
  if (alreadyGeneratedFor(today)) {
    log(`Machine episode for ${today} already exists. Skipping.`);
    saveMeta({ created: false, reason: 'already-exists', date: today });
    return;
  }

  // Загружаем данные
  log('Загрузка данных...');
  const prs = getMergedPRsSince(yesterday);
  const stats = loadJSON('prototype/data/stats.json');
  const brokenLinks = loadJSON('prototype/data/broken-links.json');

  // Проверяем, есть ли события для создания эпизода
  // Создаём эпизод, если есть хотя бы один merged PR или есть Diagnostics данные
  const hasEvents = (prs && prs.length > 0) || (stats && stats.generatedAt) || (brokenLinks && brokenLinks.issues);
  if (!hasEvents) {
    log(`No events found for ${today}. Skipping episode generation.`);
    saveMeta({ created: false, reason: 'no-events', date: today });
    return;
  }

  log(`Найдено событий: ${prs?.length || 0} PR, stats: ${stats ? 'да' : 'нет'}, broken links: ${brokenLinks ? 'да' : 'нет'}`);

  // Генерируем эпизод
  const episode = buildMachineEpisode({
    date: today,
    prs,
    stats,
    brokenLinks,
  });

  // Сохраняем файл
  const filename = `${today}-${episode.slug}.md`;
  const filePath = path.join(STORIES_DIR, filename);
  const fullContent = matter.stringify(episode.content, episode.frontMatter);
  writeFileSync(filePath, fullContent, 'utf8');

  log(`✅ Создан machine episode: ${filename}`);

  saveMeta({
    created: true,
    date: today,
    file: filename,
    title: episode.title,
    slug: episode.slug,
    pr_count: prs ? prs.length : 0,
  });
}

function saveMeta(data) {
  writeFileSync(META_PATH, JSON.stringify(data, null, 2), 'utf8');
}

main();
