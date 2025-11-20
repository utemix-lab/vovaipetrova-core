import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { globSync } from "glob";
import path from "path";
import matter from "gray-matter";

const DOCS_ROOT = "docs";
const OUTPUT_PATH = "prototype/data/broken-links.json";
const LINK_MAP_PATH = "prototype/link-map.json";

function readFrontMatter(raw) {
  try {
    const parsed = matter(raw);
    return { data: parsed.data || {}, content: parsed.content };
  } catch (error) {
    console.warn("⚠️  Failed to parse front matter, using empty data:", error.message);
    return { data: {}, content: raw };
  }
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
  const serviceMap = new Map(); // Добавляем мапу для service файлов

  docs.forEach((doc) => {
    const slug = doc.slug;
    const normalizedPath = doc.path.replace(/\\/g, "/").replace(/^\.\//, "");
    const pathWithoutDocs = normalizedPath.replace(/^docs\//, "");
    const fileName = path.parse(normalizedPath).name;
    
    if (doc.service) {
      serviceSet.add(slug);
      serviceSet.add(normalizedPath);
      serviceSet.add(pathWithoutDocs);
      // Добавляем в serviceMap для резолвинга
      serviceMap.set(slug.toLowerCase(), slug);
      serviceMap.set(`${slug}.md`.toLowerCase(), slug);
      serviceMap.set(pathWithoutDocs.toLowerCase(), slug);
      serviceMap.set(fileName.toLowerCase(), slug);
      // Также добавляем варианты без хеша
      const withoutHash = fileName.replace(/-[0-9a-f]{6,}$/i, "");
      if (withoutHash !== fileName) {
        serviceMap.set(withoutHash.toLowerCase(), slug);
        serviceMap.set(`${withoutHash}.md`.toLowerCase(), slug);
      }
      return;
    }
    canonicalSet.add(slug);
    canonicalMap.set(slug.toLowerCase(), slug);
    canonicalMap.set(`${slug}.md`.toLowerCase(), slug);
    canonicalMap.set(pathWithoutDocs.toLowerCase(), slug);
    canonicalMap.set(normalizedPath.toLowerCase(), slug);
    canonicalMap.set(fileName.toLowerCase(), slug);
    // Также добавляем варианты без хеша
    const withoutHash = fileName.replace(/-[0-9a-f]{6,}$/i, "");
    if (withoutHash !== fileName) {
      canonicalMap.set(withoutHash.toLowerCase(), slug);
      canonicalMap.set(`${withoutHash}.md`.toLowerCase(), slug);
    }
  });
  return { canonicalMap, canonicalSet, serviceSet, serviceMap };
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

  // Удаляем якоря и query-параметры для проверки
  const withoutAnchor = reference.split('#')[0].split('?')[0];
  const base = withoutAnchor
    .replace(/^(\.\/)+/, "")
    .replace(/^(\.\.\/)+/, "")
    .replace(/^docs\//, "");

  add(base);
  
  // Обработка расширений файлов
  if (base.endsWith(".md")) {
    add(base.replace(/\.md$/i, ""));
  }
  if (base.endsWith(".csv")) {
    add(base.replace(/\.csv$/i, ""));
  }
  
  // Обработка хешей в именах файлов
  const withoutHashMd = base.replace(/-[0-9a-f]{6,}\.md$/i, ".md");
  add(withoutHashMd);
  if (withoutHashMd.endsWith(".md")) {
    add(withoutHashMd.replace(/\.md$/i, ""));
  }
  
  const withoutHashCsv = base.replace(/-[0-9a-f]{6,}\.csv$/i, ".csv");
  add(withoutHashCsv);
  if (withoutHashCsv.endsWith(".csv")) {
    add(withoutHashCsv.replace(/\.csv$/i, ""));
  }
  
  // Вариант без хеша и расширения
  add(base.replace(/-[0-9a-f]{6,}(\.(md|csv))?$/i, "$1").replace(/\.(md|csv)$/i, ""));

  return results;
}

function resolveReference(reference, maps, linkMap) {
  const candidates = normalizeReferenceCandidates(reference);
  
  // Сначала проверяем canonical файлы
  for (const candidate of candidates) {
    const slug = maps.canonicalMap.get(candidate);
    if (slug) {
      return { status: "ok", slug };
    }
  }
  
  // Затем проверяем service файлы
  for (const candidate of candidates) {
    const slug = maps.serviceMap?.get(candidate);
    if (slug) {
      return { status: "service", slug };
    }
  }

  // Проверяем link-map exact mappings
  if (linkMap.exact) {
    for (const candidate of candidates) {
      const mapped =
        linkMap.exact[candidate] ||
        linkMap.exact[`docs/${candidate}`] ||
        linkMap.exact[`${candidate}.md`] ||
        linkMap.exact[`${candidate}.csv`];
      if (mapped) {
        if (maps.canonicalSet.has(mapped)) return { status: "ok", slug: mapped };
        if (maps.serviceSet.has(mapped)) return { status: "service", slug: mapped };
        // Проверяем, существует ли mapped в serviceMap
        if (maps.serviceMap?.has(mapped.toLowerCase())) {
          return { status: "service", slug: maps.serviceMap.get(mapped.toLowerCase()) };
        }
        return { status: "mapped", slug: mapped };
      }
    }
  }

  // Проверяем link-map patterns
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
        // Проверяем serviceMap
        if (maps.serviceMap?.has(replacement.toLowerCase())) {
          return { status: "service", slug: maps.serviceMap.get(replacement.toLowerCase()) };
        }
        return { status: "mapped", slug: replacement };
      }
    }
  }

  // Последняя проверка serviceSet напрямую
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
      // Проверяем ссылки на файлы вне docs/ (например, ../CONTRIBUTING.md, ../.github/...)
      if (href.startsWith("../")) {
        const resolvedPath = path.resolve(path.dirname(doc.path), href);
        const repoRoot = path.resolve(DOCS_ROOT, "..");
        // Проверяем, что путь находится внутри репозитория
        if (resolvedPath.startsWith(repoRoot)) {
          const relativePath = path.relative(repoRoot, resolvedPath).replace(/\\/g, "/");
          if (existsSync(resolvedPath)) {
            // Файл существует вне docs/, не считаем его битым
            return;
          }
        }
      }
      }
      if (href.startsWith("#")) return;
      const result = resolveReference(href, maps, linkMap);
      if (result.status === "ok") return;
      if (result.status === "service") return;
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

