#!/usr/bin/env node
/**
 * Анализ покрытия тегов aliases
 * Использование: node scripts/analyze-tags-coverage.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = 'docs';
const TAGS_MAP_PATH = 'docs/nav/tags.yaml';

function loadTagsCanon() {
  try {
    return YAML.parse(readFileSync(TAGS_MAP_PATH, 'utf8'));
  } catch (e) {
    console.error('⚠️ Failed to parse tags.yaml:', e?.message);
    return { aliases: {}, canonical: {} };
  }
}

function extractHumanTags(content) {
  const inline = new Set();
  try {
    const re = /(^|\s)#([\p{L}][\p{L}\p{N}]+(?:_[\p{L}\p{N}]+)*)/gu;
    let m;
    while ((m = re.exec(content)) !== null) {
      inline.add(m[2]);
    }
  } catch {}
  return [...inline];
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

function main() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let totalTags = 0;
  let coveredTags = 0;

  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data || {};
    
    // Пропускаем service файлы
    if (fm.service === true) continue;
    
    const humanTags = extractHumanTags(parsed.content);
    const fmTags = fm.tags || [];
    const allTags = [...new Set([...humanTags, ...fmTags])];
    
    for (const tag of allTags) {
      totalTags++;
      const lookupKey = ALIAS_LOOKUP.get(tag) || tag;
      const list = TAGS_CANON?.aliases?.[lookupKey];
      if (Array.isArray(list) && list.length > 0) {
        coveredTags++;
      } else {
        if (!TAGS_WARNINGS.has(tag)) TAGS_WARNINGS.set(tag, new Set());
        TAGS_WARNINGS.get(tag).add(f.replace(/^docs\//, ''));
      }
    }
  }

  const coverage = totalTags > 0 ? Math.round((coveredTags / totalTags) * 100) : 0;
  
  console.log(`\n📊 Tags Coverage Analysis\n`);
  console.log(`Total tags: ${totalTags}`);
  console.log(`Covered tags: ${coveredTags}`);
  console.log(`Coverage: ${coverage}%\n`);
  
  if (TAGS_WARNINGS.size > 0) {
    console.log(`⚠️ Tags without aliases (${TAGS_WARNINGS.size}):\n`);
    const sorted = Array.from(TAGS_WARNINGS.entries())
      .sort((a, b) => b[1].size - a[1].size);
    
    for (const [tag, files] of sorted) {
      console.log(`  ${tag}: ${files.size} files`);
      if (files.size <= 5) {
        console.log(`    Files: ${Array.from(files).join(', ')}`);
      }
    }
    
    const report = {
      coverage: {
        total: totalTags,
        covered: coveredTags,
        percentage: coverage
      },
      missingAliases: sorted.map(([tag, files]) => ({
        tag,
        files_count: files.size,
        files: Array.from(files).slice(0, 10)
      }))
    };
    
    writeFileSync('tmp-tags-coverage.json', JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 Full report saved to tmp-tags-coverage.json\n`);
  } else {
    console.log('✅ All tags have aliases!\n');
  }
}

main();

