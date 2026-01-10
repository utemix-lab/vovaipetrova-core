#!/usr/bin/env node
/**
 * Nightly Digest Episode Generator
 *
 * Генерирует дайджест-эпизод из CI-метрик и Diagnostics, если за сутки нет эпизода.
 *
 * Использование:
 *   node scripts/generate-nightly-digest-episode.mjs
 *
 * Переменные окружения:
 *   GITHUB_RUN_ID - ID workflow run (для ссылок)
 *   GITHUB_REPOSITORY - репозиторий (для ссылок)
 *   GITHUB_SERVER_URL - сервер GitHub (для ссылок)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { globSync } from "glob";
import matter from "gray-matter";
import slugify from "slugify";

const STORIES_DIR = "docs/stories";
const META_DIR = "tmp";
const META_PATH = path.join(META_DIR, "digest-episode-meta.json");
const MOSCOW_TZ = "Europe/Moscow";

function log(message) {
  console.log(`[digest-episode] ${message}`);
}

function getTodayIso() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

function slugifyText(value) {
  return (
    slugify(value || "episode", {
      lower: true,
      strict: true,
      locale: "ru",
      trim: true,
    }) || "episode"
  );
}

function alreadyGeneratedFor(date) {
  const pattern = path.join(STORIES_DIR, `${date}-*.md`).replace(/\\/g, "/");
  const matches = globSync(pattern);
  return matches.length > 0;
}

function loadJSON(filePath, defaultValue = null) {
  if (!existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    log(`⚠️  Failed to load ${filePath}: ${e.message}`);
    return defaultValue;
  }
}

function buildDigestEpisode({ date, ciMetrics, stats, brokenLinks }) {
  const title = `Дайджест-эпизод: ${date}`;
  const slug = slugifyText(`digest-${date}`);

  // What: что произошло за сутки
  const whatParts = [];
  whatParts.push("Автоматически сгенерированный дайджест-эпизод из CI-метрик и Diagnostics:");

  if (ciMetrics?.summary) {
    whatParts.push(`- CI: ${ciMetrics.summary.totalRuns || 0} прогонов, success rate ${(ciMetrics.summary.successRate || 0).toFixed(1)}%`);
    if (ciMetrics.summary.failedRuns > 0) {
      whatParts.push(`- Неудачных прогонов: ${ciMetrics.summary.failedRuns}`);
    }
  }

  if (stats?.totals) {
    const readyCount = stats.totals.statuses?.ready ?? stats.totals.ready ?? 0;
    const draftCount = stats.totals.statuses?.draft ?? stats.totals.draft ?? 0;
    const totalPages = stats.totals.pages ?? 0;
    whatParts.push(`- ProtoLabs: ${totalPages} страниц (Ready: ${readyCount}, Draft: ${draftCount})`);
  }

  if (brokenLinks?.issues?.length > 0) {
    const internalMissing = brokenLinks.issues.filter(i => i.reason === 'missing' && !i.link?.startsWith('http')).length;
    whatParts.push(`- Битые ссылки: ${brokenLinks.issues.length} (внутренние отсутствующие: ${internalMissing})`);
  }

  if (stats?.topProblems?.length > 0) {
    const top = stats.topProblems[0];
    whatParts.push(`- Топ проблема: ${top.title} (score: ${top.score})`);
  }

  // Why: зачем создан дайджест-эпизод
  const whyParts = [];
  whyParts.push("За сутки не было создано эпизода вручную или через автогенератор Stories.");
  whyParts.push("Дайджест-эпизод собирает автоматически данные из CI-метрик и Diagnostics для поддержания регулярности публикаций.");

  // Result: что получилось
  const resultParts = [];
  resultParts.push("Создан дайджест-эпизод с актуальными метриками:");

  if (ciMetrics?.summary) {
    resultParts.push(`- ✅ CI-метрики: ${ciMetrics.summary.totalRuns || 0} прогонов, success rate ${(ciMetrics.summary.successRate || 0).toFixed(1)}%`);
  }

  if (stats?.totals) {
    const readyCount = stats.totals.statuses?.ready ?? stats.totals.ready ?? 0;
    const totalPages = stats.totals.pages ?? 0;
    const readyRate = totalPages > 0 ? ((readyCount / totalPages) * 100).toFixed(1) : 0;
    resultParts.push(`- ✅ Diagnostics: ${totalPages} страниц, ${readyRate}% ready`);
  }

  if (brokenLinks?.issues?.length > 0) {
    resultParts.push(`- ✅ Битые ссылки: ${brokenLinks.issues.length} проблем`);
  }

  // Next: что дальше
  const nextParts = [];
  nextParts.push("- Дайджест-эпизод будет опубликован через Pull Request");
  nextParts.push("- При появлении ручного эпизода или автогенерации Stories, дайджест-эпизод не создаётся");
  nextParts.push("- Регулярные дайджест-эпизоды помогают отслеживать состояние проекта");

  const body = [
    `# ${title}`,
    "",
    "## What",
    "",
    ...whatParts.map(item => `- ${item}`),
    "",
    "## Why",
    "",
    ...whyParts.map(item => `- ${item}`),
    "",
    "## Result",
    "",
    ...resultParts.map(item => `- ${item}`),
    "",
    "## Next",
    "",
    ...nextParts.map(item => `- ${item}`),
    "",
  ].join("\n");

  return { title, slug, body };
}

function writeEpisodeFile(date, episodeContent, slugHint) {
  const slug = slugifyText(slugHint);
  const filename = `${date}-episode-digest-${slug}.md`;
  const filePath = path.join(STORIES_DIR, filename);
  writeFileSync(filePath, episodeContent, "utf8");
  return { filename, filePath };
}

function saveMeta(meta) {
  mkdirSync(META_DIR, { recursive: true });
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
}

function main() {
  const today = getTodayIso();

  if (!existsSync(STORIES_DIR)) {
    mkdirSync(STORIES_DIR, { recursive: true });
  }

  // Проверяем, есть ли эпизод за сегодня
  if (alreadyGeneratedFor(today)) {
    log(`Episode for ${today} already exists. Skipping digest generation.`);
    saveMeta({ created: false, reason: "episode-exists", date: today });
    return;
  }

  log(`No episode found for ${today}. Generating digest episode...`);

  // Загружаем данные из CI-метрик и Diagnostics
  const ciMetrics = loadJSON(".ci-metrics/ci-metrics.json", null);
  const stats = loadJSON("prototype/data/stats.json", null);
  const brokenLinks = loadJSON("prototype/data/broken-links.json", null);

  if (!ciMetrics && !stats && !brokenLinks) {
    log("⚠️  No data sources available (CI metrics, stats, broken links). Skipping digest generation.");
    saveMeta({ created: false, reason: "no-sources", date: today });
    return;
  }

  // Генерируем дайджест-эпизод
  const { title, slug, body } = buildDigestEpisode({
    date: today,
    ciMetrics,
    stats,
    brokenLinks,
  });

  // Создаём front matter
  const fm = [
    "---",
    `title: "${title}"`,
    `slug: "${slug}"`,
    `summary: "Автоматически сгенерированный дайджест-эпизод из CI-метрик и Diagnostics за ${today}"`,
    "tags: [Story]",
    "machine_tags: [content/story]",
    "status: draft",
    "episode_type: digest",
    `generated_at: "${new Date().toISOString()}"`,
    "last_edited_time: ''",
    "---",
    "",
  ].join("\n");

  const episodeText = `${fm}${body}`;
  const result = writeEpisodeFile(today, episodeText, slug);

  saveMeta({
    created: true,
    date: today,
    file: result.filePath,
    title,
    sources: [
      ciMetrics ? "CI metrics" : null,
      stats ? "Diagnostics (stats)" : null,
      brokenLinks ? "Diagnostics (broken links)" : null,
    ].filter(Boolean),
  });

  log(`✅ Created digest episode: ${result.filename}`);
}

main();
