// scripts/fix-links.mjs
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

const ROOT = 'docs';

function normalizeTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\W_]+/g, ' ') // keep letters/digits spaces
    .trim();
}

function buildTitleToSlugMap() {
  const map = new Map();
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const fm = matter(raw).data || {};
    if (!fm.title || !fm.slug) continue;
    map.set(normalizeTitle(fm.title), `${fm.slug}.md`);
  }
  return map;
}

function decodePercent(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

function stripNotionId(name) {
  // remove trailing GUID-like id blocks
  return name.replace(/\s+[0-9a-f]{8,}.*$/i, '').trim();
}

function fixLinksInContent(content, titleToSlug) {
  return content.replace(/\(([^)]+%[0-9A-Fa-f]{2}[^)]*\.md)\)/g, (m, url) => {
    const decoded = decodePercent(url);
    const base = stripNotionId(decoded).replace(/\.md$/i, '');
    const norm = normalizeTitle(base);
    const replacement = titleToSlug.get(norm);
    if (replacement) {
      return `(${replacement})`;
    }
    return m; // no change if not matched
  });
}

function main() {
  const titleToSlug = buildTitleToSlugMap();
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let changed = 0;
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const parsed = matter(raw);
    const before = parsed.content;
    const after = fixLinksInContent(before, titleToSlug);
    if (after !== before) {
      const next = matter.stringify(after, parsed.data || {});
      writeFileSync(f, next, 'utf8');
      console.log(`🔧 fixed links in ${f}`);
      changed++;
    }
  }
  console.log(`✅ fixed links in ${changed} files`);
}

main();


