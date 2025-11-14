import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, parse, resolve } from "path";
import { globSync } from "glob";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const DOCS_ROOT = "docs";
const OUTPUT_PATH = "prototype/data/pages.json";

function normalizeSummary(value) {
  if (Array.isArray(value)) {
    return value.join(" ").trim();
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  return "";
}

function toArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function countLinks(content) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let count = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const preceding = content[match.index - 1];
    if (preceding === "!") continue;
    count += 1;
  }
  return count;
}

function detectRelatedBlock(content) {
  return /(^|\n)\s{0,3}#{1,3}\s*Связано с/i.test(content);
}

function ensureDir(pathname) {
  mkdirSync(pathname, { recursive: true });
}

export function collectPages({ docsRoot = DOCS_ROOT } = {}) {
  const files = globSync(`${docsRoot}/**/*.md`, { nodir: true });
  const pages = [];

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const parsed = matter(raw);
    const fm = parsed.data || {};

    const slug = fm.slug || parse(file).name;
    const service =
      fm.service === true ||
      (typeof fm.service === "string" &&
        fm.service.trim().toLowerCase() === "true");

    pages.push({
      title: fm.title || parse(file).name,
      slug,
      status: String(fm.status || "draft").toLowerCase(),
      tags: toArray(fm.tags),
      machine_tags: toArray(fm.machine_tags),
      summary: normalizeSummary(fm.summary),
      last_edited_time: fm.last_edited_time || null,
      links_count: countLinks(parsed.content || ""),
      has_related_block: detectRelatedBlock(parsed.content || ""),
      service,
      url: file.replace(/\\+/g, "/")
    });
  }

  return pages;
}

export function writePagesReport({
  docsRoot = DOCS_ROOT,
  outputPath = OUTPUT_PATH
} = {}) {
  const pages = collectPages({ docsRoot });
  ensureDir(dirname(resolve(outputPath)));
  writeFileSync(outputPath, JSON.stringify(pages, null, 2), "utf8");
  console.log(
    `Pages report saved to ${outputPath} (total: ${pages.length} files)`
  );
  return pages;
}

const __filename = fileURLToPath(import.meta.url);
const directRun = process.argv[1] && resolve(process.argv[1]) === __filename;

if (directRun) {
  try {
    writePagesReport();
  } catch (error) {
    console.error("Failed to build pages report:", error);
    process.exit(1);
  }
}

