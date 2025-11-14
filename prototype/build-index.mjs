import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import path from "path";
import { writePagesReport } from "../scripts/report-pages.mjs";
import { writeBrokenLinksReport } from "../scripts/report-broken-internal-links.mjs";
import { buildStats } from "../scripts/report-stats.mjs";

const DOCS_ROOT = "docs";
const OUTPUT_DIR = "prototype";
const DATA_DIR = path.join(OUTPUT_DIR, "data");
const PAGES_DIR = path.join(OUTPUT_DIR, "page");
const OUTPUT_JSON = path.join(DATA_DIR, "pages.json");
const BROKEN_OUTPUT = path.join(DATA_DIR, "broken-links.json");
const STATS_OUTPUT = path.join(DATA_DIR, "stats.json");
const LINK_MAP_SOURCE = path.join(OUTPUT_DIR, "link-map.json");
const LINK_MAP_OUTPUT = path.join(DATA_DIR, "link-map.json");
const PAGE_TEMPLATE_PATH = path.join(OUTPUT_DIR, "page.html");

function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  rmSync(PAGES_DIR, { recursive: true, force: true });
  mkdirSync(PAGES_DIR, { recursive: true });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadLinkMap() {
  if (!existsSync(LINK_MAP_SOURCE)) {
    return { exact: {}, patterns: [] };
  }
  try {
    const raw = readFileSync(LINK_MAP_SOURCE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      exact: parsed?.exact || {},
      patterns: Array.isArray(parsed?.patterns) ? parsed.patterns : []
    };
  } catch (error) {
    console.warn("⚠️  Failed to load link-map.json:", error.message);
    return { exact: {}, patterns: [] };
  }
}

function buildIndex() {
  ensureDirs();
  const linkMap = loadLinkMap();
  const pages = writePagesReport({ docsRoot: DOCS_ROOT, outputPath: OUTPUT_JSON });
  writeBrokenLinksReport({
    docsRoot: DOCS_ROOT,
    outputPath: BROKEN_OUTPUT,
    pages
  });
  buildStats({
    pagesPath: OUTPUT_JSON,
    brokenPath: BROKEN_OUTPUT,
    outputPath: STATS_OUTPUT
  });
  writeFileSync(LINK_MAP_OUTPUT, JSON.stringify(linkMap, null, 2), "utf8");

  const templateRaw = readFileSync(PAGE_TEMPLATE_PATH, "utf8");
  const visiblePages = pages.filter((page) => page.service !== true);
  for (const page of visiblePages) {
    const html = templateRaw
      .replace(/__SLUG__/g, page.slug)
      .replace(/__PAGE_TITLE__/g, escapeHtml(page.title || page.slug));
    const outputPath = path.join(PAGES_DIR, `${page.slug}.html`);
    writeFileSync(outputPath, html, "utf8");
  }

  console.log(
    `Generated ${visiblePages.length} entries → ${OUTPUT_JSON} and individual pages in ${PAGES_DIR}`
  );
}

buildIndex();

