import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import path from "path";
import { globSync } from "glob";
import YAML from "yaml";
import { execSync } from "child_process";

const DOCS_ROOT = "docs";
const OUTPUT_DIR = "prototype";
const DATA_DIR = path.join(OUTPUT_DIR, "data");
const PAGES_DIR = path.join(OUTPUT_DIR, "page");
const OUTPUT_JSON = path.join(DATA_DIR, "pages.json");
const LINK_MAP_SOURCE = path.join(OUTPUT_DIR, "link-map.json");
const LINK_MAP_OUTPUT = path.join(DATA_DIR, "link-map.json");
const PAGE_TEMPLATE_PATH = path.join(OUTPUT_DIR, "page.html");

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function readFrontMatter(raw) {
  if (!raw.startsWith("---")) return {};
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  try {
    return YAML.parse(match[1]) || {};
  } catch (error) {
    console.warn("⚠️  Failed to parse front matter:", error.message);
    return {};
  }
}

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
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true }).sort();
  const pages = [];

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const fm = readFrontMatter(raw);
    const relativePath = toPosix(file);
    const isStory = /\/stories\//.test(relativePath);
    const storyOrderMatch = path
      .parse(file)
      .name.match(/^(\d{1,2})-/);
    const storyOrder = storyOrderMatch ? Number(storyOrderMatch[1]) : null;
    const serviceValue =
      typeof fm.service === "string"
        ? fm.service.trim().toLowerCase()
        : fm.service === true
        ? "true"
        : "";
    const isService = serviceValue === "true";

    const title = fm.title || path.parse(file).name;
    const slug = fm.slug || path.parse(file).name;
    const status = String(fm.status || "draft").trim().toLowerCase();
    const summary =
      typeof fm.summary === "string"
        ? fm.summary.replace(/\r/g, "").trim()
        : Array.isArray(fm.summary)
        ? fm.summary.join(" ").replace(/\r/g, "").trim()
        : "";
    const tags = Array.isArray(fm.tags)
      ? fm.tags
          .map((tag) => String(tag || "").trim())
          .filter(Boolean)
      : [];
    const machineTags = Array.isArray(fm.machine_tags)
      ? fm.machine_tags
          .map((tag) => String(tag || "").trim())
          .filter(Boolean)
      : [];

    pages.push({
      title,
      slug,
      status,
      summary,
      tags,
      machine_tags: machineTags,
      url: relativePath,
      service: isService,
      collection: isStory ? "stories" : null,
      story_order:
        isStory && Number.isInteger(storyOrder) ? storyOrder : null
    });
  }

  writeFileSync(OUTPUT_JSON, JSON.stringify(pages, null, 2), "utf8");
  writeFileSync(LINK_MAP_OUTPUT, JSON.stringify(linkMap, null, 2), "utf8");

  const templateRaw = readFileSync(PAGE_TEMPLATE_PATH, "utf8");
  for (const page of pages) {
    const html = templateRaw
      .replace(/__SLUG__/g, page.slug)
      .replace(/__PAGE_TITLE__/g, escapeHtml(page.title || page.slug));
    const outputPath = path.join(PAGES_DIR, `${page.slug}.html`);
    writeFileSync(outputPath, html, "utf8");
  }

  console.log(
    `Generated ${pages.length} entries → ${OUTPUT_JSON} and individual pages in ${PAGES_DIR}`
  );
  
  // Generate routes.json and stats.json
  try {
    execSync("node scripts/generate-routes-json.mjs", { stdio: "inherit" });
    execSync("node scripts/generate-stats.mjs", { stdio: "inherit" });
  } catch (error) {
    console.warn("⚠️  Failed to generate routes.json or stats.json:", error.message);
  }
}

buildIndex();

