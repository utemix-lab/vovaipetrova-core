#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import path from "path";
import { globSync } from "glob";
import matter from "gray-matter";
import slugify from "slugify";

const STORIES_DIR = "docs/stories";
const META_DIR = "tmp";
const META_PATH = path.join(META_DIR, "story-meta.json");
const MOSCOW_TZ = "Europe/Moscow";

function log(message) {
  console.log(`[stories] ${message}`);
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
    slugify(value || "story", {
      lower: true,
      strict: true,
      locale: "ru",
      trim: true,
    }) || "story"
  );
}

function alreadyGeneratedFor(date) {
  const pattern = path.join(STORIES_DIR, `${date}-*.md`).replace(/\\/g, "/");
  const matches = globSync(pattern);
  return matches.length > 0;
}

function parseChangelog() {
  if (!existsSync("CHANGELOG.md")) return null;
  const raw = readFileSync("CHANGELOG.md", "utf8");
  const lines = raw.split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) break;
      current = {
        heading: line.replace(/^##\s+/, "").trim(),
        bullets: [],
      };
      continue;
    }
    if (!current) continue;
    if (line.startsWith("- ")) {
      current.bullets.push(line.replace(/^-+\s*/, "").trim());
      continue;
    }
    if (line.startsWith("## ")) break;
  }
  return current;
}

function parseStats() {
  try {
    const raw = readFileSync("prototype/data/stats.json", "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickAdrSummary() {
  const files = globSync(`${STORIES_DIR}/../adr*.md`, { nodir: true });
  if (!files.length) return null;
  const sorted = files
    .map((file) => ({
      file,
      mtime: statSync(file).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  const target = sorted[0].file;
  const raw = readFileSync(target, "utf8");
  const fm = matter(raw).data || {};
  return {
    title: fm.title || path.parse(target).name,
    summary: fm.summary || "",
    file: target,
  };
}

function buildStory({ date, changelog, adr, stats }) {
  const sources = [];
  const tldr = [];

  if (changelog) {
    sources.push("CHANGELOG.md");
    if (changelog.bullets[0]) {
      tldr.push(`Продолжаем ${changelog.heading}: ${changelog.bullets[0]}`);
    } else {
      tldr.push(`Цикл ${changelog.heading} зафиксирован в хронологии.`);
    }
  }
  if (stats) {
    sources.push("prototype/data/stats.json");
    if (stats.topProblems?.length) {
      const top = stats.topProblems[0];
      tldr.push(`Диагностика ProtoLabs: ${top.title} (score ${top.score})`);
    } else if (stats.totals?.pages) {
      tldr.push(
        `ProtoLabs: ${stats.totals.pages} страниц под мониторингом (Ready ${
          stats.totals.statuses?.ready ?? "n/a"
        })`
      );
    }
  }
  if (adr) {
    sources.push(adr.file);
    tldr.push(`Связано с ADR: ${adr.title}`);
  }
  tldr.push(`Черновик расписан на ${date}`);

  const readyCount = stats?.totals?.statuses?.ready ?? stats?.totals?.ready;
  const draftCount = stats?.totals?.statuses?.draft ?? stats?.totals?.draft;

  if (sources.length === 0) {
    sources.push("stories-generator");
  }

  const titleBase =
    changelog?.heading ||
    (adr ? `Эпизод по мотивам ${adr.title}` : "Автоген — Stories");
  const title = `Stories · ${titleBase}`;

  const parts = [];
  const changelogSentence = changelog
    ? `Выполнение блока **${changelog.heading}** отмечено в change-log: ${changelog.bullets
        .slice(0, 2)
        .join("; ")}.`
    : "Экспорт зафиксировал текущий прогресс проекта.";
  const adrSentence = adr
    ? `Опорным контекстом остаётся ADR «${adr.title}», который подчёркивает: ${adr.summary ||
        "источник истины и зеркалирование между Notion и GitHub."}`
    : "Опорные ADR остаются неизменными, служа фоном для ежедневных итераций.";
  parts.push(`**Что произошло.** ${changelogSentence} ${adrSentence}`);

  parts.push(
    `**Зачем это делали.** Stories нужны как публичная лента: она переводит сухие Deliverables в читабельные эпизоды и помогает держать синхрон между Think Tank и Explorer без персоналий.`
  );

  const statsSentence = readyCount
    ? `В витрине сейчас ${readyCount} страниц в статусе ready и ${draftCount ?? "N/A"} оформленных draft — показатели подтягиваются напрямую из ProtoLabs.`
    : "Диагностика ProtoLabs продолжает фиксировать проблемные карточки и их score.";
  const topProblemSentence = stats?.topProblems?.length
    ? `Главная проблема дня — «${stats.topProblems[0].title}»: ${stats.topProblems[0].issues_total} зафиксированных issue.`
    : "Список top problems не изменился по сравнению с предыдущим днём.";
  parts.push(
    `**Что получилось.** ${statsSentence} ${topProblemSentence}`
  );

  parts.push(
    `**Тех-вставка.** Шаблон stories остаётся нейтральным по авторству; lint предупреждает при персоналиях. Черновик собирается автоматически из CHANGELOG, ADR и ProtoLabs stats, чтобы отвечать требованию 700–1200 знаков без ручного копипаста.`
  );

  parts.push(
    `**Что дальше.** Автоген продолжит выпускать по одному черновику в сутки и ждать review через Pull Request, пока не появятся новые Deliverables или milestone.`
  );

  const body = [
    `# ${title}`,
    "",
    "TL;DR",
    "",
    ...tldr.map((item) => `- ${item}`),
    "",
    ...parts,
    "",
  ].join("\n");

  return { title, body, sources };
}

function writeStoryFile(date, storyContent, slugHint) {
  const slug = slugifyText(slugHint);
  const filename = `${date}-${slug}.md`;
  const filePath = path.join(STORIES_DIR, filename);
  writeFileSync(filePath, storyContent, "utf8");
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

  if (alreadyGeneratedFor(today)) {
    log(`Story for ${today} already exists. Skipping.`);
    saveMeta({ created: false, reason: "already-exists", date: today });
    return;
  }

  const changelog = parseChangelog();
  const stats = parseStats();
  const adr = pickAdrSummary();

  if (!changelog && !stats && !adr) {
    log("No sources available for story generation.");
    saveMeta({ created: false, reason: "no-sources", date: today });
    return;
  }

  const { title, body, sources } = buildStory({
    date: today,
    changelog,
    adr,
    stats,
  });
  const fm = [
    "---",
    `title: "${title}"`,
    `slug: "${slugifyText(title)}"`,
    'summary: "Черновик автогенератора Stories: синхронизация CHANGELOG, ADR и ProtoLabs."',
    "tags: [Story]",
    "machine_tags: [content/story]",
    "status: draft",
    "last_edited_time: ''",
    "---",
    "",
  ].join("\n");

  const storyText = `${fm}${body}`;
  const { filename } = writeStoryFile(today, storyText, title);

  saveMeta({
    created: true,
    date: today,
    file: path.join(STORIES_DIR, filename),
    title,
    sources,
  });
  log(`Created ${filename}`);
}

main();

