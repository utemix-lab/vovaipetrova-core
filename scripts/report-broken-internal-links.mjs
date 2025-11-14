import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { globSync } from "glob";
import path from "path";
import YAML from "yaml";
import { fileURLToPath } from "url";
import { collectPages } from "./report-pages.mjs";

const DOCS_ROOT = "docs";
const OUTPUT_PATH = "prototype/data/broken-links.json";
const LINK_MAP_PATH = "prototype/link-map.json";

function readFrontMatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, content: raw };
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { data: {}, content: raw };
  const data = YAML.parse(match[1]) || {};
  const content = raw.slice(match[0].length);
  return { data, content };
}

function loadLinkMap(linkMapPath = LINK_MAP_PATH) {
  if (!existsSync(linkMapPath)) {
    return { exact: {}, patterns: [] };
  }
  try {
    const raw = readFileSync(linkMapPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      exact: parsed?.exact || {},
      patterns: Array.isArray(parsed?.patterns) ? parsed.patterns : []
    };
  } catch (error) {
    console.warn("⚠️  Failed to parse link-map.json:", error.message);
    return { exact: {}, patterns: [] };
  }
}

function buildSlugMaps(pages) {
  const canonicalMap = new Map();
  const canonicalSet = new Set();
  const serviceSet = new Set();

  pages.forEach((page) => {
    const slug = page.slug;
    const normalizedPath = page.url
      .replace(/\\+/g, "/")
      .replace(/^\.\//, "")
      .replace(/^docs\//, "");

    if (page.service) {
      serviceSet.add(slug);
      serviceSet.add(`${slug}.md`);
      serviceSet.add(normalizedPath);
      return;
    }

    canonicalSet.add(slug);
    canonicalMap.set(slug.toLowerCase(), slug);
    canonicalMap.set(`${slug}.md`.toLowerCase(), slug);
    canonicalMap.set(normalizedPath.toLowerCase(), slug);
  });

  return { canonicalMap, canonicalSet, serviceSet };
}

function normalizeReferenceCandidates(reference) {
  const results = [];
  const seen = new Set();
  const add = (value) => {
    if (!value) return;
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    results.push(normalized);
  };

  const base = reference
    .replace(/^(\.\/)+/, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^docs\//, "");

  add(base);
  if (base.endsWith(".md")) add(base.replace(/\.md$/i, ""));
  const withoutHashMd = base.replace(/-[0-9a-f]{6,}\.md$/i, ".md");
  add(withoutHashMd);
  if (withoutHashMd.endsWith(".md")) add(withoutHashMd.replace(/\.md$/i, ""));
  add(base.replace(/-[0-9a-f]{6,}$/i, ""));

  return results;
}

function resolveReference(reference, maps, linkMap) {
  const candidates = normalizeReferenceCandidates(reference);
  for (const candidate of candidates) {
    const slug = maps.canonicalMap.get(candidate);
    if (slug) {
      return { kind: "ok", slug };
    }
  }

  if (linkMap.exact) {
    for (const candidate of candidates) {
      const mapped =
        linkMap.exact[candidate] ||
        linkMap.exact[`docs/${candidate}`] ||
        linkMap.exact[`${candidate}.md`];
      if (mapped) {
        if (maps.canonicalSet.has(mapped)) return { kind: "ok", slug: mapped };
        if (maps.serviceSet.has(mapped)) {
          return { kind: "service", slug: mapped };
        }
        return { kind: "unknown", slug: mapped, reason: "mapped_target_unknown" };
      }
    }
  }

  if (Array.isArray(linkMap.patterns)) {
    for (const pattern of linkMap.patterns) {
      if (!pattern?.match) continue;
      let regex;
      try {
        regex = new RegExp(pattern.match, "i");
      } catch (error) {
        console.warn("⚠️  Invalid regex in link-map:", pattern.match, error.message);
        continue;
      }
      for (const candidate of candidates) {
        if (!regex.test(candidate)) continue;
        const replacement =
          pattern.replacement != null
            ? candidate.replace(regex, pattern.replacement)
            : candidate.replace(regex, "");
        if (maps.canonicalSet.has(replacement)) {
          return { kind: "ok", slug: replacement };
        }
        if (maps.serviceSet.has(replacement)) {
          return { kind: "service", slug: replacement };
        }
        return { kind: "unknown", slug: replacement, reason: "pattern_mapped_unknown" };
      }
    }
  }

  for (const candidate of candidates) {
    if (maps.serviceSet.has(candidate)) {
      return { kind: "service", slug: candidate };
    }
  }

  return { kind: "internal-missing", reason: "missing_target" };
}

function extractLinks(content) {
  const matches = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const preceding = content[match.index - 1];
    if (preceding === "!") continue; // skip images
    matches.push({ text: match[1], href: match[2] });
  }
  return matches;
}

function isExternalHref(href) {
  const lower = href.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("file://") ||
    lower.startsWith("/") ||
    lower.endsWith(".csv")
  );
}

function classifyLink(href, maps, linkMap) {
  if (!href || href.startsWith("#")) return null;
  if (isExternalHref(href)) {
    return { kind: "external", reason: "external_link" };
  }

  const result = resolveReference(href, maps, linkMap);
  if (result.kind === "ok") return null;
  if (result.kind === "service") {
    return { kind: "service", reason: "points_to_service", target: result.slug };
  }

  return {
    kind: result.kind || "unknown",
    reason: result.reason || "unresolved",
    target: result.slug || null
  };
}

export function generateBrokenLinks({
  docsRoot = DOCS_ROOT,
  linkMapPath = LINK_MAP_PATH,
  pages
} = {}) {
  const pageList = pages || collectPages({ docsRoot });
  const maps = buildSlugMaps(pageList);
  const linkMap = loadLinkMap(linkMapPath);
  const files = globSync(`${docsRoot}/**/*.md`, { nodir: true });
  const issues = [];
  const totals = {
    external: 0,
    service: 0,
    "internal-missing": 0,
    unknown: 0
  };

  const metaByPath = new Map(
    pageList.map((page) => [page.url.replace(/\\+/g, "/"), page])
  );

  for (const file of files) {
    const normalizedPath = file.replace(/\\+/g, "/");
    const relPath = normalizedPath.replace(/^docs\//, "");
    const sourceMeta = metaByPath.get(normalizedPath) || {
      slug: path.parse(file).name
    };

    const raw = readFileSync(file, "utf8");
    const { content } = readFrontMatter(raw);
    const links = extractLinks(content || "");

    for (const link of links) {
      const href = (link.href || "").trim();
      const classification = classifyLink(href, maps, linkMap);
      if (!classification) continue;
      totals[classification.kind] += 1;
      issues.push({
        file: relPath,
        slug: sourceMeta.slug,
        href,
        kind: classification.kind,
        reason: classification.reason,
        target: classification.target || null
      });
    }
  }

  issues.sort((a, b) => {
    const slugCompare =
      a.slug.localeCompare(b.slug, "ru", { sensitivity: "base" });
    if (slugCompare !== 0) return slugCompare;
    return a.href.localeCompare(b.href);
  });

  return { issues, totals, pagesCount: pageList.length };
}

export function writeBrokenLinksReport({
  docsRoot = DOCS_ROOT,
  linkMapPath = LINK_MAP_PATH,
  outputPath = OUTPUT_PATH,
  pages
} = {}) {
  const report = generateBrokenLinks({ docsRoot, linkMapPath, pages });
  const payload = {
    generatedAt: new Date().toISOString(),
    totalFiles: report.pagesCount,
    brokenCount: report.issues.length,
    totals: report.totals,
    issues: report.issues
  };
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(
    `Broken links report saved to ${outputPath} (issues: ${report.issues.length})`
  );
  return payload;
}

const __filename = fileURLToPath(import.meta.url);
const directRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (directRun) {
  try {
    writeBrokenLinksReport();
  } catch (error) {
    console.error("Failed to build broken links report:", error);
    process.exit(1);
  }
}

