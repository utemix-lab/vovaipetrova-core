import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from "fs";
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
const BUILD_CACHE_PATH = path.join(DATA_DIR, ".build-cache.json");

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

function loadBuildCache() {
  if (!existsSync(BUILD_CACHE_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(BUILD_CACHE_PATH, "utf8");
    return JSON.parse(raw) || {};
  } catch (error) {
    console.warn("⚠️  Failed to load build cache:", error.message);
    return {};
  }
}

function saveBuildCache(cache) {
  try {
    writeFileSync(BUILD_CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    console.warn("⚠️  Failed to save build cache:", error.message);
  }
}

function getFileMtime(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.mtimeMs;
  } catch (error) {
    return 0;
  }
}

function shouldRebuildFile(filePath, cache) {
  const posixPath = toPosix(filePath);
  const currentMtime = getFileMtime(filePath);
  const cachedMtime = cache[posixPath];
  
  if (cachedMtime === undefined || cachedMtime !== currentMtime) {
    return true;
  }
  return false;
}

function buildIndex() {
  const startTime = Date.now();
  const FORCE_REBUILD = process.argv.includes("--force");
  
  ensureDirs();
  const linkMap = loadLinkMap();
  const cache = FORCE_REBUILD ? {} : loadBuildCache();
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true }).sort();
  
  // Load existing pages.json if it exists for incremental updates
  let existingPages = [];
  if (!FORCE_REBUILD && existsSync(OUTPUT_JSON)) {
    try {
      const existing = JSON.parse(readFileSync(OUTPUT_JSON, "utf8"));
      existingPages = Array.isArray(existing) ? existing : [];
    } catch (error) {
      console.warn("⚠️  Failed to load existing pages.json:", error.message);
    }
  }
  
  const pagesMap = new Map();
  // Pre-populate with existing pages
  for (const page of existingPages) {
    if (page.url) {
      pagesMap.set(page.url, page);
    }
  }
  
  const newCache = {};
  let processedCount = 0;
  let skippedCount = 0;
  let changedFiles = [];

  for (const file of files) {
    const relativePath = toPosix(file);
    const needsRebuild = FORCE_REBUILD || shouldRebuildFile(file, cache);
    
    if (needsRebuild) {
      const raw = readFileSync(file, "utf8");
      const fm = readFrontMatter(raw);
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

      // Extract series_id and related_stories for stories
      const seriesId = isStory && fm.series_id ? String(fm.series_id).trim() : null;
      const relatedStories = isStory && Array.isArray(fm.related_stories)
        ? fm.related_stories
            .map((ref) => String(ref || "").trim())
            .filter(Boolean)
        : [];

      const page = {
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
          isStory && Number.isInteger(storyOrder) ? storyOrder : null,
        series_id: seriesId || null,
        related_stories: relatedStories.length > 0 ? relatedStories : null
      };
      
      pagesMap.set(relativePath, page);
      processedCount++;
      changedFiles.push(relativePath);
    } else {
      skippedCount++;
    }
    
    // Update cache with current mtime
    newCache[relativePath] = getFileMtime(file);
  }
  
  // Remove pages for files that no longer exist
  const existingFiles = new Set(files.map(f => toPosix(f)));
  for (const [url, page] of pagesMap.entries()) {
    if (!existingFiles.has(url)) {
      pagesMap.delete(url);
      delete newCache[url];
    }
  }
  
  const pages = Array.from(pagesMap.values());
  
  // Always write pages.json (even if no changes, to ensure consistency)
  writeFileSync(OUTPUT_JSON, JSON.stringify(pages, null, 2), "utf8");
  writeFileSync(LINK_MAP_OUTPUT, JSON.stringify(linkMap, null, 2), "utf8");
  
  // Update HTML pages only for changed files
  const templateRaw = readFileSync(PAGE_TEMPLATE_PATH, "utf8");
  if (FORCE_REBUILD || changedFiles.length > 0) {
    for (const url of changedFiles) {
      const page = pagesMap.get(url);
      if (page) {
        const html = templateRaw
          .replace(/__SLUG__/g, page.slug)
          .replace(/__PAGE_TITLE__/g, escapeHtml(page.title || page.slug));
        const outputPath = path.join(PAGES_DIR, `${page.slug}.html`);
        writeFileSync(outputPath, html, "utf8");
      }
    }
  }
  
  // Save cache
  saveBuildCache(newCache);
  
  const duration = Date.now() - startTime;
  console.log(
    `Generated ${pages.length} entries → ${OUTPUT_JSON} and individual pages in ${PAGES_DIR}`
  );
  console.log(
    `📊 Build stats: ${processedCount} processed, ${skippedCount} skipped (cache hit), ${duration}ms`
  );
  
  // Generate routes.json, stats.json, backlinks, KB index, Stories index, sitemap, and trends v2
  try {
    execSync("node scripts/generate-routes-json.mjs", { stdio: "inherit" });
    execSync("node scripts/generate-stats.mjs", { stdio: "inherit" });
    execSync("node scripts/generate-backlinks.mjs", { stdio: "inherit" });
    execSync("node scripts/generate-kb-index.mjs", { stdio: "inherit" });
    execSync("node scripts/generate-stories-index.mjs", { stdio: "inherit" });
    execSync("node scripts/generate-sitemap.mjs", { stdio: "inherit" });
    // Generate trends v2 (continue on error, так как требует GITHUB_TOKEN для получения PR info)
    try {
      execSync("node scripts/generate-trends-v2-data.mjs", { stdio: "inherit" });
    } catch (trendsError) {
      console.warn("⚠️  Failed to generate trends v2 data (may require GITHUB_TOKEN):", trendsError.message);
    }
  } catch (error) {
    console.warn("⚠️  Failed to generate auxiliary files:", error.message);
  }
}

buildIndex();

