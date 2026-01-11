#!/usr/bin/env node
/**
 * Stories Monthly Digest Generator (параметризованный)
 *
 * Собирает эпизоды за период: TL;DR, дата, PR-ссылки
 * Выход: docs/stories/digest-YYYY-MM.md
 *
 * Использование:
 *   node scripts/gen-stories-digest.mjs [YYYY-MM]
 *   node scripts/gen-stories-digest.mjs 2026-01
 *   node scripts/gen-stories-digest.mjs --month 2026-01
 *   node scripts/gen-stories-digest.mjs --help
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

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { month: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Использование:
  node scripts/gen-stories-digest.mjs [YYYY-MM]
  node scripts/gen-stories-digest.mjs --month YYYY-MM
  node scripts/gen-stories-digest.mjs --help

Параметры:
  YYYY-MM          Месяц для генерации дайджеста (например: 2026-01)
  --month YYYY-MM  То же самое, что и позиционный аргумент
  --help, -h       Показать эту справку

Если месяц не указан, используется текущий месяц (Europe/Moscow).

Примеры:
  node scripts/gen-stories-digest.mjs
  node scripts/gen-stories-digest.mjs 2026-01
  node scripts/gen-stories-digest.mjs --month 2026-01
`);
      process.exit(0);
    } else if (arg === '--month' && i + 1 < args.length) {
      result.month = args[i + 1];
      i++;
    } else if (!arg.startsWith('--')) {
      // Позиционный аргумент
      result.month = arg;
    }
  }

  return result;
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

  // Проверяем, что год разумный (не слишком старый и не будущий)
  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  if (yearNum < 2020 || yearNum > currentYear + 1) {
    throw new Error(`Неверный год: ${yearNum}. Используйте год от 2020 до ${currentYear + 1}`);
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

function isValidPRUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Проверяем формат GitHub PR URL
  const githubPRPattern = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/i;
  return githubPRPattern.test(url);
}

function normalizePRUrl(url, number) {
  if (!url) return null;
  // Если есть номер, но URL неполный, формируем полный URL
  if (number && !url.includes('/pull/')) {
    // Предполагаем стандартный формат репозитория
    const repo = process.env.GITHUB_REPOSITORY || 'utemix-lab/vovaipetrova-core';
    return `https://github.com/${repo}/pull/${number}`;
  }
  return url;
}

function extractPRLinks(frontMatter, content) {
  const links = [];

  // Из front matter
  if (frontMatter.pr_url || frontMatter.pr_number) {
    const url = normalizePRUrl(frontMatter.pr_url, frontMatter.pr_number);
    if (url && isValidPRUrl(url)) {
      links.push({
        url,
        number: frontMatter.pr_number || parseInt(url.match(/\/pull\/(\d+)/)?.[1] || '0', 10) || null,
        source: "frontmatter",
      });
    }
  }

  // Из контента (ищем ссылки вида [PR #123](url) или прямые ссылки)
  const prLinkRegex = /\[PR\s*#(\d+)\]\((https?:\/\/[^\)]+)\)/gi;
  let match;
  while ((match = prLinkRegex.exec(content)) !== null) {
    const [, number, url] = match;
    const normalizedUrl = normalizePRUrl(url, parseInt(number, 10));
    // Проверяем, что это не дубликат из front matter
    if (normalizedUrl && isValidPRUrl(normalizedUrl) && !links.some(link => link.url === normalizedUrl || link.number === parseInt(number, 10))) {
      links.push({
        url: normalizedUrl,
        number: parseInt(number, 10),
        source: "content",
      });
    }
  }

  // Прямые ссылки на GitHub PR
  const directPRRegex = /(https?:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/(\d+))/gi;
  while ((match = directPRRegex.exec(content)) !== null) {
    const [, url, number] = match;
    const normalizedUrl = normalizePRUrl(url, parseInt(number, 10));
    if (normalizedUrl && isValidPRUrl(normalizedUrl) && !links.some(link => link.url === normalizedUrl || link.number === parseInt(number, 10))) {
      links.push({
        url: normalizedUrl,
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

function validateLinks(episodes) {
  const invalidLinks = [];
  for (const episode of episodes) {
    for (const link of episode.prLinks) {
      if (!isValidPRUrl(link.url)) {
        invalidLinks.push({
          episode: episode.title,
          link: link.url,
          source: link.source,
        });
      }
    }
  }
  return invalidLinks;
}

function main() {
  const args = parseArgs();

  let month;
  try {
    month = parseMonth(args.month);
  } catch (error) {
    console.error(`❌ Ошибка: ${error.message}`);
    console.error(`Используйте --help для справки`);
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

  // Валидация ссылок
  const invalidLinks = validateLinks(episodes);
  if (invalidLinks.length > 0) {
    log(`⚠️  Найдено ${invalidLinks.length} невалидных PR-ссылок:`);
    invalidLinks.forEach(({ episode, link, source }) => {
      log(`   - ${episode} (${source}): ${link}`);
    });
  }

  const digest = buildDigest(month, episodes);
  const result = writeDigestFile(month, digest);

  const totalPRLinks = episodes.reduce((sum, ep) => sum + ep.prLinks.length, 0);
  const validPRLinks = totalPRLinks - invalidLinks.length;

  log(`✅ Создан digest: ${result.filename}`);
  log(`   Эпизодов: ${episodes.length}`);
  log(`   PR-ссылок: ${totalPRLinks} (валидных: ${validPRLinks}${invalidLinks.length > 0 ? `, невалидных: ${invalidLinks.length}` : ''})`);

  if (invalidLinks.length > 0) {
    log(`⚠️  Внимание: некоторые PR-ссылки невалидны. Проверьте файлы эпизодов.`);
  }
}

main();
