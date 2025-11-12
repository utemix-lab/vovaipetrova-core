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
const TAGS_ONLY = process.argv.includes('--tags-only');

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
  const base = String(s || '').replace(/\./g, '-');
  return slugify(base, { lower: true, strict: true, locale: 'ru' })
    .replace(/_/g, '-')
    .replace(/^-+|-+$/g, '') || 'index';
}

const TAGS_CANON = loadTagsCanon();
const ALIAS_LOOKUP = new Map();
if (TAGS_CANON?.aliases) {
  for (const rawKey of Object.keys(TAGS_CANON.aliases)) {
    const key = String(rawKey || '').trim();
    if (!key) continue;
    if (!ALIAS_LOOKUP.has(key)) ALIAS_LOOKUP.set(key, key);
    const lower = key.toLowerCase();
    if (!ALIAS_LOOKUP.has(lower)) ALIAS_LOOKUP.set(lower, key);
  }
}
const TAGS_WARNINGS = new Map(); // tag -> Set<file>
const STATS = {
  filesProcessed: 0,
  filesUpdated: 0,
  tagsAdded: 0,
  machineTagsAdded: 0,
};

function machineFromAliases(humanTags, filePath) {
  const out = new Set();
  for (const ht of humanTags) {
    const lookupKey = ALIAS_LOOKUP.get(ht) || ht;
    const list = TAGS_CANON?.aliases?.[lookupKey];
    if (Array.isArray(list) && list.length > 0) {
      list.forEach(t => out.add(t));
    } else if (filePath) {
      if (!TAGS_WARNINGS.has(ht)) TAGS_WARNINGS.set(ht, new Set());
      TAGS_WARNINGS.get(ht).add(filePath);
    }
  }
  return [...out];
}

function extractHumanTags(content, { stripTrailingLine = true } = {}) {
  // Collect inline hashtags like #Title_Case (Unicode letters and digits)
  const inline = new Set();
  try {
    const re = /(^|\s)#([\p{L}][\p{L}\p{N}]+(?:_[\p{L}\p{N}]+)*)/gu;
    let m;
    while ((m = re.exec(content)) !== null) {
      inline.add(m[2]);
    }
  } catch {}

  if (!stripTrailingLine) {
    return { content, human: [...inline] };
  }
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

function normalizeVisibleTag(tag) {
  const trimmed = String(tag || '').trim().replace(/^#/, '');
  if (!trimmed) return '';
  const lookupKey = ALIAS_LOOKUP.get(trimmed) || ALIAS_LOOKUP.get(trimmed.toLowerCase());
  return lookupKey || trimmed;
}

function sortCaseAware(list) {
  const collator = new Intl.Collator('ru', { sensitivity: 'base' });
  return [...list].sort((a, b) => collator.compare(a, b) || a.localeCompare(b));
}

function uniqueCaseInsensitive(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = item.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
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

const SERVICE_KEYWORDS = [
  'readme',
  'context-map',
  'contributing',
  'manifest',
  'structure-report',
  'index',
  'notion-brain'
];

function shouldMarkService(filePath, fmTitle) {
  const lcPath = filePath.toLowerCase();
  if (SERVICE_KEYWORDS.some(kw => lcPath.includes(kw))) return true;
  if (fmTitle && SERVICE_KEYWORDS.some(kw => String(fmTitle).toLowerCase().includes(kw))) {
    return true;
  }
  return false;
}

function ensureFrontMatter(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  let { content } = parsed;
  const fm = parsed.data || {};
  const hadFrontMatter = !!parsed.data && Object.keys(parsed.data).length > 0;

  const before = {
    title: fm.title,
    slug: fm.slug,
    tags: fm.tags || [],
    machine_tags: fm.machine_tags || [],
    notion_page_id: fm.notion_page_id,
    last_edited_time: fm.last_edited_time
  };

  if (!fm.title) {
    const h1 = (content.match(/^#\s+(.+)$/m) || [])[1];
    fm.title = h1 || parse(filePath).name;
  }

  const { content: stripped, human } = extractHumanTags(
    content,
    { stripTrailingLine: !TAGS_ONLY }
  );
  if (!TAGS_ONLY) {
    content = stripped;
  }
  const isService = fm.service === true || shouldMarkService(filePath, fm.title);

  if (TAGS_ONLY && isService) {
    return {
      slug: fm.slug,
      title: fm.title,
      action: 'skip',
      notion_page_id: fm.notion_page_id,
      last_edited_time: fm.last_edited_time,
      tags_count: Array.isArray(fm.tags) ? fm.tags.length : 0,
      machine_tags_count: Array.isArray(fm.machine_tags) ? fm.machine_tags.length : 0,
      tags_before: fm.tags || [],
      tags_after: fm.tags || [],
      machine_before: fm.machine_tags || [],
      machine_after: fm.machine_tags || []
    };
  }

  const baseTagsRaw = Array.isArray(fm.tags) ? fm.tags : [];
  const baseTags = baseTagsRaw.map(normalizeVisibleTag).filter(Boolean);
  const humanFromContent = human.map(normalizeVisibleTag).filter(Boolean);

  let computedTags = baseTags;
  if (!isService) {
    computedTags = uniqueCaseInsensitive([...baseTags, ...humanFromContent]);
    if (computedTags.length > 5) {
      computedTags = sortCaseAware(computedTags).slice(0, 5);
    } else {
      computedTags = sortCaseAware(computedTags);
    }
  }

  const baseMachineRaw = Array.isArray(fm.machine_tags) ? fm.machine_tags : [];
  let machine_tags = baseMachineRaw.map(t => String(t || '').trim()).filter(Boolean);
  if (!isService) {
    const mapped = machineFromAliases(computedTags, filePath.replace(/\\+/g, '/'));
    machine_tags = uniqueCaseInsensitive([...machine_tags, ...mapped.map(String)]);
    machine_tags = sortCaseAware(machine_tags);
  } else {
    machine_tags = [];
  }

  fm.slug = toSlugKebab(fm.slug || fm.title || parse(filePath).name)
    .replace(/mapyaml/g, 'map-yaml');

  if (isService) {
    const suffixMatch = parse(filePath).name.match(/[a-f0-9]{6,}/i);
    if (suffixMatch) {
      const suffix = suffixMatch[0].slice(0, 6).toLowerCase();
      if (!fm.slug.endsWith(`-${suffix}`)) {
        fm.slug = `${fm.slug}-${suffix}`;
      }
    }
  }

  if (isService) {
    fm.service = true;
  } else if (fm.service === false) {
    delete fm.service;
  }

  if (!fm.summary && !TAGS_ONLY) {
    const firstPara = content.split(/\n{2,}/).map(s => s.trim()).find(Boolean);
    if (firstPara) fm.summary = firstPara.slice(0, 240);
  }

  // Сохраняем notion_page_id и last_edited_time, если они есть (для дельта-синка)
  const preserved = {};
  if (fm.notion_page_id) preserved.notion_page_id = fm.notion_page_id;
  if (fm.last_edited_time) preserved.last_edited_time = fm.last_edited_time;

  const nextData = { ...fm, ...preserved };
  if (!isService) {
    nextData.tags = computedTags;
    nextData.machine_tags = machine_tags;
  } else {
    nextData.tags = [];
    nextData.machine_tags = [];
  }
  const nextContent = TAGS_ONLY ? parsed.content : content;
  const next = matter.stringify(nextContent, nextData);
  if (DRY_RUN) {
    console.log(`DRY: would update front matter for ${filePath} with slug="${fm.slug}"`);
  } else {
    writeFileSync(filePath, next, 'utf8');
  }

  const after = {
    title: fm.title,
    slug: fm.slug,
    tags: nextData.tags,
    machine_tags: nextData.machine_tags,
    notion_page_id: fm.notion_page_id,
    last_edited_time: fm.last_edited_time
  };

  const action = hadFrontMatter ? 'update' : 'add';
  const changed = JSON.stringify(before) !== JSON.stringify(after);

  return { 
    slug: fm.slug, 
    title: fm.title,
    action: changed ? action : 'skip',
    notion_page_id: fm.notion_page_id,
    last_edited_time: fm.last_edited_time,
    tags_count: nextData.tags.length,
    machine_tags_count: nextData.machine_tags.length,
    tags_before: baseTagsRaw,
    tags_after: nextData.tags,
    machine_before: baseMachineRaw,
    machine_after: nextData.machine_tags
  };
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

function formatTable(rows) {
  if (rows.length === 0) return '';
  
  const cols = Object.keys(rows[0]);
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] || '').length)));
  
  const header = '| ' + cols.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
  const separator = '| ' + cols.map((_, i) => '-'.repeat(widths[i])).join(' | ') + ' |';
  const body = rows.map(r => '| ' + cols.map((c, i) => String(r[c] || '').padEnd(widths[i])).join(' | ') + ' |').join('\n');
  
  return `${header}\n${separator}\n${body}`;
}

function normalizeAll() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let normalized = 0, renamed = 0;
  const slugCounters = new Map();
  const actions = [];

  for (const f of files) {
    const info = ensureFrontMatter(f);
    normalized++;
    const finalSlug = TAGS_ONLY ? info.slug : resolveDuplicateSlug(info.slug, f, slugCounters);
    let action = info.action;
    let reason = '';
    
    if (!TAGS_ONLY && finalSlug !== info.slug) {
      action = 'move';
      reason = `slug collision: "${info.slug}" → "${finalSlug}"`;
      if (!DRY_RUN) {
        const raw = readFileSync(f, 'utf8');
        const parsed = matter(raw);
        const data = { ...parsed.data, slug: finalSlug };
        const next = matter.stringify(parsed.content, data);
        writeFileSync(f, next, 'utf8');
      }
    } else if (info.action === 'add') {
      reason = 'new file';
    } else if (info.action === 'update') {
      reason = 'front matter updated';
    }
    
    let finalPath = f;
    if (!TAGS_ONLY) {
      finalPath = renameToSlug(f, finalSlug);
      if (finalPath !== f) {
        renamed++;
        action = 'move';
        reason = `renamed to match slug: ${parse(f).name} → ${parse(finalPath).name}`;
      }
    }

    const humanChanged = JSON.stringify(info.tags_before) !== JSON.stringify(info.tags_after);
    const machineChanged = JSON.stringify(info.machine_before) !== JSON.stringify(info.machine_after);
    if (TAGS_ONLY) {
      STATS.filesProcessed += 1;
      if (humanChanged || machineChanged) {
        STATS.filesUpdated += 1;
        STATS.tagsAdded += Math.max(0, info.tags_after.length - info.tags_before.length);
        STATS.machineTagsAdded += Math.max(0, info.machine_after.length - info.machine_before.length);
      }
    }

    actions.push({
      file: finalPath.replace(/^docs\//, ''),
      action: action,
      reason: reason || '-',
      notion_page_id: info.notion_page_id || '-',
      tags: `${info.tags_count}/${info.machine_tags_count}`
    });
  }

  if (actions.length > 0 && !DRY_RUN) {
    console.log('\n📊 Normalization actions:');
    console.log(formatTable(actions));
  }

  if (TAGS_ONLY) {
    console.log('\n📈 Tags-only summary:');
    console.log(`  • Files processed: ${STATS.filesProcessed}`);
    console.log(`  • Files updated: ${STATS.filesUpdated}`);
    console.log(`  • Visible tags added: ${STATS.tagsAdded}`);
    console.log(`  • Machine tags added: ${STATS.machineTagsAdded}`);
    if (TAGS_WARNINGS.size > 0) {
      console.log('\n⚠️ Tags without aliases:');
      for (const [tag, files] of TAGS_WARNINGS) {
        console.log(`  - ${tag}: ${files.size} files`);
      }
    }
  }

  const suffix = DRY_RUN ? ' (dry-run)' : '';
  console.log(`\n✅ Normalized ${normalized} files, renamed ${renamed} files by slug${suffix}.`);

  if (TAGS_ONLY) {
    const rows = [];
    for (const [tag, files] of TAGS_WARNINGS) {
      const list = Array.from(files).map(f => f.replace(/^docs\//, '').replace(/\\+/g, '/'));
      rows.push({ tag, files_count: files.size, files: list });
    }
    if (rows.length > 0) {
      console.log('\n📋 Missing alias report:');
      console.log(formatTable(rows.map(({ tag, files_count }) => ({ tag, files_count }))));
      for (const row of rows) {
        console.log(`    • ${row.tag}: ${row.files.join(', ')}`);
      }
    }

    const jsonSummary = {
      stats: STATS,
      missingAliases: rows,
    };
    console.log('\n' + JSON.stringify(jsonSummary, null, 2));
  }
}

normalizeAll();
