import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { writePagesReport } from "./report-pages.mjs";
import { writeBrokenLinksReport } from "./report-broken-internal-links.mjs";

const PAGES_PATH = "prototype/data/pages.json";
const BROKEN_PATH = "prototype/data/broken-links.json";
const OUTPUT_PATH = "prototype/data/stats.json";

function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${filePath}:`, error.message);
    return null;
  }
}

function ensurePagesData(pagesPath = PAGES_PATH) {
  const existing = loadJson(pagesPath);
  if (existing) return existing;
  return writePagesReport({ outputPath: pagesPath });
}

function ensureBrokenData(brokenPath = BROKEN_PATH, pages) {
  const existing = loadJson(brokenPath);
  if (existing) return existing;
  return writeBrokenLinksReport({ outputPath: brokenPath, pages });
}

function initCounts() {
  return {
    external: 0,
    service: 0,
    "internal-missing": 0,
    unknown: 0
  };
}

function statusScore(status) {
  if (status === "ready") return 2;
  if (status === "review") return 1;
  return 0;
}

function computeScore(page, counts) {
  const issueScore =
    counts["internal-missing"] * 3 +
    counts.service * 2 +
    counts.external * 1 +
    counts.unknown * 1;
  const relatedPenalty = page.has_related_block ? 0 : 1;
  const tagsPenalty = page.tags.length === 0 ? 1 : 0;
  const summaryPenalty = page.summary ? 0 : 1;
  return (
    issueScore +
    statusScore(page.status) +
    relatedPenalty +
    tagsPenalty +
    summaryPenalty
  );
}

export function buildStats({
  pagesPath = PAGES_PATH,
  brokenPath = BROKEN_PATH,
  outputPath = OUTPUT_PATH
} = {}) {
  const pages = ensurePagesData(pagesPath);
  const broken = ensureBrokenData(brokenPath, pages);

  const byStatus = {};
  const byTag = new Map();
  const totals = initCounts();
  const issuesBySlug = new Map();

  pages.forEach((page) => {
    const status = page.status || "draft";
    byStatus[status] = (byStatus[status] || 0) + 1;
    page.tags.forEach((tag) => {
      const count = byTag.get(tag) || 0;
      byTag.set(tag, count + 1);
    });
    issuesBySlug.set(page.slug, initCounts());
  });

  (broken.issues || []).forEach((issue) => {
    const kind = issue.kind || "unknown";
    totals[kind] = (totals[kind] || 0) + 1;
    if (!issuesBySlug.has(issue.slug)) {
      issuesBySlug.set(issue.slug, initCounts());
    }
    const bucket = issuesBySlug.get(issue.slug);
    bucket[kind] = (bucket[kind] || 0) + 1;
  });

  const issuesPerPage = pages.map((page) => {
    const counts = issuesBySlug.get(page.slug) || initCounts();
    const issuesTotal =
      counts.external + counts.service + counts["internal-missing"] + counts.unknown;
    return {
      slug: page.slug,
      title: page.title,
      status: page.status,
      tags: page.tags,
      issues: counts,
      issues_total: issuesTotal,
      summary_missing: !page.summary,
      tags_missing: page.tags.length === 0,
      has_related_block: page.has_related_block,
      score: computeScore(page, counts)
    };
  });

  issuesPerPage.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.issues_total !== a.issues_total) return b.issues_total - a.issues_total;
    return a.slug.localeCompare(b.slug, "ru", { sensitivity: "base" });
  });

  const stats = {
    generatedAt: new Date().toISOString(),
    totals: {
      pages: pages.length,
      statuses: byStatus,
      issues: totals
    },
    tags: Array.from(byTag.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count })),
    issuesPerPage,
    topProblems: issuesPerPage.slice(0, 10)
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(stats, null, 2), "utf8");
  console.log(`Stats report saved to ${outputPath}`);
  return stats;
}

const __filename = fileURLToPath(import.meta.url);
const directRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (directRun) {
  try {
    buildStats();
  } catch (error) {
    console.error("Failed to build stats report:", error);
    process.exit(1);
  }
}

