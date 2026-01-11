#!/usr/bin/env node
/**
 * Stories Monthly Digest Generator
 *
 * Собирает эпизоды месяца: TL;DR, дата, PR-ссылки
 * Выход: docs/stories/digest-YYYY-MM.md
 *
 * Использование:
 *   node scripts/gen-stories-digest.mjs [YYYY-MM]
 *   node scripts/gen-stories-digest.mjs 2026-01
 *
 * Если месяц не указан, используется текущий месяц (Europe/Moscow)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { globSync } from "glob";
import matter from "gray-matter";

const STORIES_DIR = "docs/stories";
const MOSCOW_TZ = "Europe/Moscow";

function log(message) {
  console.log(`[digest] ${message}`);
}

function getCurrentMonth() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
  });
  return formatter.format(new Date()); // YYYY-MM
}

function parseMonth(monthStr) {
  if (!monthStr) return getCurrentMonth();

  // Проверяем формат YYYY-MM
  const match = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Неверный формат месяца. Используйте YYYY-MM, например: 2026-01`);
  }

  const [, year, month] = match;
  const monthNum = parseInt(month, 10);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Неверный номер месяца: ${monthNum}. Используйте 01-12`);
  }

  return `${year}-${month}`;
}

function extractTLDR(content) {
  // Ищем секцию TL;DR (может быть с разными форматированиями)
  // Варианты: "TL;DR", "## TL;DR", "### TL;DR"
  const tldrPatterns = [
    /^TL;DR\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/im,
    /^##\s+TL;DR\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/im,
    /^###\s+TL;DR\s*\n([\s\S]*?)(?=\n##|\n\*\*|$)/im,
  ];

  for (const pattern of tldrPatterns) {
    const match = content.match(pattern);
    if (match) {
      const tldrText = match[1].trim();
      // Извлекаем пункты списка
      const items = tldrText
        .split(/\n/)
        .map(line => line.replace(/^[-*]\s+/, "").trim())
        .filter(line => line.length > 0 && !line.match(/^---/));

      if (items.length > 0) {
        return items;
      }
    }
  }

  return null;
}

function extractDateFromFilename(filename) {
  // Формат: YYYY-MM-DD-slug.md
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
  return match ? match[1] : null;
}

function extractPRLinks(frontMatter, content) {
  const links = [];

  // Из front matter
  if (frontMatter.pr_url) {
    links.push({
      url: frontMatter.pr_url,
      number: frontMatter.pr_number || null,
      source: "frontmatter",
    });
  }

  // Из контента (ищем ссылки вида [PR #123](url) или прямые ссылки)
  const prLinkRegex = /\[PR\s*#(\d+)\]\((https?:\/\/[^\)]+)\)/gi;
  let match;
  while ((match = prLinkRegex.exec(content)) !== null) {
    const [, number, url] = match;
    // Проверяем, что это не дубликат из front matter
    if (!links.some(link => link.url === url)) {
      links.push({
        url,
        number: parseInt(number, 10),
        source: "content",
      });
    }
  }

  // Прямые ссылки на GitHub PR
  const directPRRegex = /(https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+))/gi;
  while ((match = directPRRegex.exec(content)) !== null) {
    const [, url, number] = match;
    if (!links.some(link => link.url === url)) {
      links.push({
        url,
        number: parseInt(number, 10),
        source: "content",
      });
    }
  }

  return links;
}

function loadEpisodesForMonth(month) {
  const [year, monthNum] = month.split("-");
  const pattern = path.join(STORIES_DIR, `${year}-${monthNum}-*.md`).replace(/\\/g, "/");
  const files = globSync(pattern);

  const episodes = [];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf8");
      const { data: frontMatter, content: body } = matter(content);

      const filename = path.basename(filePath);
      const date = extractDateFromFilename(filename);

      if (!date) {
        log(`⚠️  Пропущен файл без даты в имени: ${filename}`);
        continue;
      }

      const tldr = extractTLDR(body);
      const prLinks = extractPRLinks(frontMatter, body);

      episodes.push({
        filename,
        filePath,
        date,
        title: frontMatter.title || filename.replace(/\.md$/, ""),
        slug: frontMatter.slug || null,
        summary: frontMatter.summary || null,
        tldr,
        prLinks,
        mergedAt: frontMatter.merged_at || null,
      });
    } catch (error) {
      log(`⚠️  Ошибка при чтении ${filePath}: ${error.message}`);
    }
  }

  // Сортируем по дате (от старых к новым)
  episodes.sort((a, b) => a.date.localeCompare(b.date));

  return episodes;
}

function buildDigest(month, episodes) {
  const [year, monthNum] = month.split("-");
  const monthNames = [
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
  ];
  const monthName = monthNames[parseInt(monthNum, 10) - 1];

  const title = `Stories Monthly Digest: ${monthName} ${year}`;
  const slug = `digest-${month}`;

  const body = [
    `# ${title}`,
    "",
    `> Месячный дайджест эпизодов Stories за ${monthName} ${year}`,
    "",
    `Всего эпизодов: ${episodes.length}`,
    "",
    "---",
    "",
  ];

  // Добавляем каждый эпизод
  for (const episode of episodes) {
    body.push(`## ${episode.title}`);
    body.push("");

    // Дата
    body.push(`**Дата:** ${episode.date}`);
    body.push("");

    // TL;DR
    if (episode.tldr && episode.tldr.length > 0) {
      body.push("**TL;DR:**");
      body.push("");
      for (const item of episode.tldr) {
        body.push(`- ${item}`);
      }
      body.push("");
    } else if (episode.summary) {
      body.push(`**Краткое описание:** ${episode.summary}`);
      body.push("");
    }

    // PR-ссылки
    if (episode.prLinks.length > 0) {
      body.push("**PR-ссылки:**");
      body.push("");
      for (const link of episode.prLinks) {
        if (link.number) {
          body.push(`- [PR #${link.number}](${link.url})`);
        } else {
          body.push(`- [PR](${link.url})`);
        }
      }
      body.push("");
    }

    // Ссылка на эпизод
    const episodeSlug = episode.slug || episode.filename.replace(/\.md$/, "");
    body.push(`[Читать эпизод →](./${episode.filename})`);
    body.push("");
    body.push("---");
    body.push("");
  }

  // AUTHOR_BLOCK placeholder
  body.push("## AUTHOR_BLOCK");
  body.push("");
  body.push("> Примечание: истории пишем от нейтрального автора. Без персоналий, используем «автор» или безличные формулировки.");
  body.push("");
  body.push("![Author Image](https://via.placeholder.com/800x450?text=author)");
  body.push("*Изображение автора (placeholder)*");
  body.push("");

  return { title, slug, body: body.join("\n") };
}

function writeDigestFile(month, digestContent) {
  const filename = `digest-${month}.md`;
  const filePath = path.join(STORIES_DIR, filename);

  const fm = [
    "---",
    `title: "${digestContent.title}"`,
    `slug: "${digestContent.slug}"`,
    `summary: "Месячный дайджест эпизодов Stories за ${month}"`,
    "tags: [Story, Digest]",
    "machine_tags: [content/story, content/digest]",
    "status: draft",
    `generated_at: "${new Date().toISOString()}"`,
    "last_edited_time: ''",
    "---",
    "",
  ].join("\n");

  const fullContent = `${fm}${digestContent.body}`;
  writeFileSync(filePath, fullContent, "utf8");

  return { filename, filePath };
}

function main() {
  const monthArg = process.argv[2];

  let month;
  try {
    month = parseMonth(monthArg);
  } catch (error) {
    console.error(`❌ Ошибка: ${error.message}`);
    process.exit(1);
  }

  log(`Генерация digest за ${month}...`);

  if (!existsSync(STORIES_DIR)) {
    mkdirSync(STORIES_DIR, { recursive: true });
  }

  const episodes = loadEpisodesForMonth(month);

  if (episodes.length === 0) {
    log(`⚠️  Не найдено эпизодов за ${month}`);
    return;
  }

  log(`Найдено эпизодов: ${episodes.length}`);

  const digest = buildDigest(month, episodes);
  const result = writeDigestFile(month, digest);

  log(`✅ Создан digest: ${result.filename}`);
  log(`   Эпизодов: ${episodes.length}`);
  log(`   PR-ссылок: ${episodes.reduce((sum, ep) => sum + ep.prLinks.length, 0)}`);
}

main();
