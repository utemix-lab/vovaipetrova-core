// scripts/normalize.mjs
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, parse } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import slugify from 'slugify';
import crypto from 'crypto';

const ROOT = 'docs';
const TAGS_MAP_PATH = 'docs/nav/tags.yaml'; // ← ИСПРАВЛЕНО!
const DRY_RUN = process.argv.includes('--dry');

function loadTagsCanon() {
  // Prefer explicit YAML map if present
  if (existsSync(TAGS_MAP_PATH)) {
    try {
      return YAML.parse(readFileSync(TAGS_MAP_PATH, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Failed to parse tags.yaml:', e?.message);
    }
  }

  // Fallback: parse YAML code block from context-map*.md
  const candidates = globSync(`${ROOT}/**/context-map*.md`, { nodir: true });
  for (const file of candidates) {
    try {
      const raw = readFileSync(file, 'utf8');
      const match = raw.match(/```yaml[\r\n]+([\s\S]*?)```/i);
      if (match && match[1]) {
        const parsed = YAML.parse(match[1]);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.warn(`⚠️ Failed to parse YAML from ${file}:`, e?.message);
    }
  }

  console.warn('⚠️ No canonical tags source found (tags.yaml or context-map*.md).');
  return { aliases: {}, canonical: {} };
}

function toSlugKebab(s) {
  return slugify(String(s || ''), { lower: true, strict: true, locale: 'ru' })
    .replace(/_/g, '-')
    .replace(/^-+|-+$/g, '') || 'index';
}

const TAGS_CANON = loadTagsCanon();

function machineFromAliases(humanTags) {
  const out = new Set();
  for (const ht of humanTags) {
    const list = TAGS_CANON?.aliases?.[ht];
    if (Array.isArray(list)) list.forEach(t => out.add(t));
  }
  return [...out];
}

function extractHumanTags(content) {
  // Collect inline hashtags like #Title_Case (Unicode letters and digits)
  const inline = new Set();
  try {
    const re = /(^|\s)#([\p{L}][\p{L}\p{N}]+(?:_[\p{L}\p{N}]+)*)/gu;
    let m;
    while ((m = re.exec(content)) !== null) {
      inline.add(m[2]);
    }
  } catch {}

  // Preserve behavior: remove a final hashtag-only line if present
  const lines = content.trimEnd().split('\n');
  let idx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (!l) continue;
    if (l.startsWith('#') && l.split(/\s+/).every(tok => tok.startsWith('#'))) {
      idx = i;
      break;
    }
    break;
  }
  if (idx === -1) {
    return { content, human: [...inline] };
  }
  const tail = lines[idx].trim().split(/\s+/).map(t => t.replace(/^#/, ''));
  const next = lines.slice(0, idx).join('\n').trimEnd() + '\n';
  const human = Array.from(new Set([...inline, ...tail]));
  return { content: next, human };
}

function uniqueSuffixFromName(name) {
  const m = name.match(/[a-f0-9]{8,}/i);
  if (m) return m[0].slice(0, 6).toLowerCase();
  return crypto.createHash('md5').update(name).digest('hex').slice(0, 6);
}

function resolveDuplicateSlug(baseSlug, filePath, slugCounters) {
  const count = (slugCounters.get(baseSlug) || 0) + 1;
  slugCounters.set(baseSlug, count);
  if (count === 1) return baseSlug;
  const stem = parse(filePath).name;
  const suf = uniqueSuffixFromName(stem);
  return `${baseSlug}-${suf}`;
}

function ensureFrontMatter(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  let { content } = parsed;
  const fm = parsed.data || {};

  if (!fm.title) {
    const h1 = (content.match(/^#\s+(.+)$/m) || [])[1];
    fm.title = h1 || parse(filePath).name;
  }

  const { content: stripped, human } = extractHumanTags(content);
  content = stripped;
  const tags = Array.from(new Set([...(fm.tags || []), ...human]));

  const machine_tags = Array.from(
    new Set([...(fm.machine_tags || []), ...machineFromAliases(tags)])
  );

  if (!fm.slug) fm.slug = toSlugKebab(fm.title);

  if (!fm.summary) {
    const firstPara = content.split(/\n{2,}/).map(s => s.trim()).find(Boolean);
    if (firstPara) fm.summary = firstPara.slice(0, 240);
  }

  // Сохраняем notion_page_id и last_edited_time, если они есть (для дельта-синка)
  const preserved = {};
  if (fm.notion_page_id) preserved.notion_page_id = fm.notion_page_id;
  if (fm.last_edited_time) preserved.last_edited_time = fm.last_edited_time;

  const next = matter.stringify(content, { ...fm, ...preserved, tags, machine_tags });
  if (DRY_RUN) {
    console.log(`DRY: would update front matter for ${filePath} with slug="${fm.slug}"`);
  } else {
    writeFileSync(filePath, next, 'utf8');
  }

  return { slug: fm.slug, title: fm.title };
}

function renameToSlug(filePath, slug) {
  const dir = dirname(filePath);
  const newName = toSlugKebab(slug) + '.md';
  const newPath = join(dir, newName);
  if (newPath !== filePath) {
    if (DRY_RUN) {
      console.log(`DRY: would rename ${filePath} -> ${newPath}`);
    } else {
      mkdirSync(dir, { recursive: true });
      renameSync(filePath, newPath);
    }
    return newPath;
  }
  return filePath;
}

function normalizeAll() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let normalized = 0, renamed = 0;
  const slugCounters = new Map();

  for (const f of files) {
    const { slug, title } = ensureFrontMatter(f);
    normalized++;
    const finalSlug = resolveDuplicateSlug(slug, f, slugCounters);
    if (finalSlug !== slug && !DRY_RUN) {
      // Update stored slug in front matter if we had to disambiguate
      const raw = readFileSync(f, 'utf8');
      const parsed = matter(raw);
      const data = { ...parsed.data, slug: finalSlug };
      const next = matter.stringify(parsed.content, data);
      writeFileSync(f, next, 'utf8');
      console.log(`ℹ️ slug collision: "${slug}" → "${finalSlug}" for ${f}`);
    } else if (finalSlug !== slug && DRY_RUN) {
      console.log(`DRY: slug collision would resolve "${slug}" → "${finalSlug}" for ${f}`);
    }
    const finalPath = renameToSlug(f, finalSlug);
    if (finalPath !== f) renamed++;
  }

  const suffix = DRY_RUN ? ' (dry-run)' : '';
  console.log(`✅ Normalized ${normalized} files, renamed ${renamed} files by slug${suffix}.`);
}

normalizeAll();
