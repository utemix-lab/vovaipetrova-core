import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { globSync } from "glob";
import path from "path";
import YAML from "yaml";

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

function loadLinkMap() {
  if (!existsSync(LINK_MAP_PATH)) {
    return { exact: {}, patterns: [] };
  }
  try {
    const raw = readFileSync(LINK_MAP_PATH, "utf8");
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

function buildSlugMaps(docs) {
  const canonicalMap = new Map();
  const canonicalSet = new Set();
  const serviceSet = new Set();

  docs.forEach((doc) => {
    const slug = doc.slug;
    const normalizedPath = doc.path.replace(/\\/g, "/").replace(/^\.\//, "");
    if (doc.service) {
      serviceSet.add(slug);
      serviceSet.add(normalizedPath);
      serviceSet.add(normalizedPath.replace(/^docs\//, ""));
      return;
    }
    canonicalSet.add(slug);
    canonicalMap.set(slug.toLowerCase(), slug);
    canonicalMap.set(`${slug}.md`.toLowerCase(), slug);
    canonicalMap.set(
      normalizedPath.replace(/^docs\//, "").toLowerCase(),
      slug
    );
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
      return { status: "ok", slug };
    }
  }

  if (linkMap.exact) {
    for (const candidate of candidates) {
      const mapped =
        linkMap.exact[candidate] ||
        linkMap.exact[`docs/${candidate}`] ||
        linkMap.exact[`${candidate}.md`];
      if (mapped) {
        if (maps.canonicalSet.has(mapped)) return { status: "ok", slug: mapped };
        if (maps.serviceSet.has(mapped)) return { status: "service", slug: mapped };
        return { status: "mapped", slug: mapped };
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
          return { status: "ok", slug: replacement };
        }
        if (maps.serviceSet.has(replacement)) {
          return { status: "service", slug: replacement };
        }
        return { status: "mapped", slug: replacement };
      }
    }
  }

  for (const candidate of candidates) {
    if (maps.serviceSet.has(candidate)) {
      return { status: "service", slug: candidate };
    }
  }

  return { status: "missing" };
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

function main() {
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true });
  const docs = files.map((file) => {
    const raw = readFileSync(file, "utf8");
    const { data, content } = readFrontMatter(raw);
    const slug = data?.slug || path.parse(file).name;
    const service =
      data?.service === true ||
      (typeof data?.service === "string" &&
        data.service.toLowerCase().trim() === "true");
    return {
      path: file.replace(/\\/g, "/"),
      slug,
      service,
      content
    };
  });

  const linkMap = loadLinkMap();
  const maps = buildSlugMaps(docs);
  const broken = [];

  docs.forEach((doc) => {
    const links = extractLinks(doc.content);
    links.forEach((link) => {
      const href = link.href.trim();
      if (!href || href.startsWith("http") || href.startsWith("mailto:")) {
        return;
      }
      if (href.startsWith("#")) return;
      const result = resolveReference(href, maps, linkMap);
      if (result.status === "ok") return;
      if (result.status === "mapped" && maps.canonicalSet.has(result.slug)) {
        return;
      }
      let reason = result.status;
      if (reason === "mapped") reason = "unknown_target";
      broken.push({
        file: doc.path.replace(/^docs\//, ""),
        link: href,
        reason,
        resolved_to: result.slug || null
      });
    });
  });

  const report = {
    generatedAt: new Date().toISOString(),
    totalFiles: docs.length,
    brokenCount: broken.length,
    issues: broken
  };
  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(
    `Broken links report saved to ${OUTPUT_PATH} (issues: ${broken.length})`
  );
}

main();

