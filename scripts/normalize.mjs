// scripts/normalize.mjs
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { dirname, join, parse } from 'path';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import slugify from 'slugify';

const ROOT = 'docs';
const TAGS_MAP_PATH = 'docs/nav/tags.yaml'; // ← ИСПРАВЛЕНО!

function toSlugKebab(s) {
  return slugify(String(s || ''), { lower: true, strict: true, locale: 'ru' })
    .replace(/_/g, '-')
    .replace(/^-+|-+$/g, '') || 'index';
}

const TAGS_CANON = existsSync(TAGS_MAP_PATH)
  ? YAML.parse(readFileSync(TAGS_MAP_PATH, 'utf8'))
  : (console.warn('⚠️ tags.yaml not found'), { aliases: {}, canonical: {} });

function machineFromAliases(humanTags) {
  const out = new Set();
  for (const ht of humanTags) {
    const list = TAGS_CANON?.aliases?.[ht];
    if (Array.isArray(list)) list.forEach(t => out.add(t));
  }
  return [...out];
}

function extractHumanTags(content) {
  const lines = content.trimEnd().split('
');
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
  if (idx === -1) return { content, human: [] };
  const human = lines[idx].trim().split(/\s+/).map(t => t.replace(/^#/, ''));
  const next = lines.slice(0, idx).join('
').trimEnd() + '
';
  return { content: next, human };
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
    const firstPara = content.split(/
{2,}/).map(s => s.trim()).find(Boolean);
    if (firstPara) fm.summary = firstPara.slice(0, 240);
  }

  const next = matter.stringify(content, { ...fm, tags, machine_tags });
  writeFileSync(filePath, next, 'utf8');

  return { slug: fm.slug, title: fm.title };
}

function renameToSlug(filePath, slug) {
  const dir = dirname(filePath);
  const newName = toSlugKebab(slug) + '.md';
  const newPath = join(dir, newName);
  if (newPath !== filePath) {
    mkdirSync(dir, { recursive: true });
    renameSync(filePath, newPath);
    return newPath;
  }
  return filePath;
}

function normalizeAll() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let normalized = 0, renamed = 0;

  for (const f of files) {
    const { slug } = ensureFrontMatter(f);
    normalized++;
    const finalPath = renameToSlug(f, slug);
    if (finalPath !== f) renamed++;
  }

  console.log(`✅ Normalized ${normalized} files, renamed ${renamed} files by slug.`);
}

normalizeAll();
