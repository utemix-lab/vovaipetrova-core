// scripts/lint-docs.mjs
import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { resolve, dirname } from 'path';

const ROOT = 'docs';
const STRICT = process.argv.includes('--strict');

function findDuplicateSlugs(files) {
  const slugToFiles = new Map();
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const fm = matter(raw).data || {};
    const slug = fm.slug || '';
    if (!slug) continue;
    const list = slugToFiles.get(slug) || [];
    list.push(f);
    slugToFiles.set(slug, list);
  }
  return [...slugToFiles.entries()].filter(([, list]) => list.length > 1);
}

const VALID_STATUS = new Set(['draft', 'review', 'ready']);

function getFirstContentLine(body) {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    return line.trim();
  }
  return '';
}

function lintFile(file) {
  const errors = [];
  const warnings = [];
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const body = parsed.content || '';
  const isService = fm.service === true;
  const status = fm.status;

  if (!fm.title) errors.push('missing title');
  if (!fm.slug) errors.push('missing slug');
  if (!isService) {
    if (!fm.summary || String(fm.summary).trim().length === 0) {
      warnings.push('warn: missing summary');
    }
  }
  if (!isService) {
    if (!Array.isArray(fm.tags) || fm.tags.length === 0) {
      if (STRICT) errors.push('missing tags[]');
      else warnings.push('warn: missing tags[]');
    }
    if (!Array.isArray(fm.machine_tags) || fm.machine_tags.length === 0) {
      if (STRICT) errors.push('missing machine_tags[]');
      else warnings.push('warn: missing machine_tags[]');
    }
  }

  if (status == null || status === '') {
    warnings.push('warn: missing status (draft|review|ready)');
  } else if (!VALID_STATUS.has(String(status).toLowerCase())) {
    warnings.push(`warn: invalid status "${status}" (expected draft|review|ready)`);
  }

  // Flag legacy encoded Notion links (percent-encoded .md)
  const legacyLinkRe = /\(([^)]+%[0-9A-Fa-f]{2}[^)]*\.md)\)/g;
  if (legacyLinkRe.test(body)) errors.push('contains legacy percent-encoded .md links');

  if (!isService) {
    const firstLine = getFirstContentLine(body);
    if (!firstLine.startsWith('# ')) {
      warnings.push('warn: missing leading H1 (# Heading)');
    }

    const linkRe = /(?<!\!)\[[^\]]+\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRe.exec(body)) !== null) {
      const target = match[1];
      const pathPart = target.split('#')[0].split('?')[0];
      if (!pathPart.toLowerCase().endsWith('.md')) continue;
      if (target.includes('://')) {
        warnings.push(`warn: .md link should be relative (${target})`);
      }
      if (target.includes('%')) {
        warnings.push(`warn: .md link contains percent-encoding (${target})`);
      }
      if (target.startsWith('/')) {
        warnings.push(`warn: .md link should not start with "/" (${target})`);
      }
    }

    const imgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
    while ((match = imgRe.exec(body)) !== null) {
      const target = match[1];
      if (/^(https?:|data:|#)/i.test(target)) continue;
      const normalized = target.split('#')[0].split('?')[0];
      const absPath = resolve(dirname(file), normalized);
      const docsRoot = resolve(process.cwd(), ROOT);
      if (!absPath.startsWith(docsRoot)) {
        warnings.push(`warn: image path escapes docs/ (${target})`);
        continue;
      }
      if (!existsSync(absPath)) {
        warnings.push(`warn: image not found (${target})`);
      }
    }
  }

  return { errors, warnings, status: status ? String(status).toLowerCase() : null };
}

function main() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let totalIssues = 0;
  let draftCount = 0;
  for (const f of files) {
    const { errors, warnings, status } = lintFile(f);
    if (status === 'draft') {
      draftCount += 1;
      console.log(`ℹ️  ${f}`);
      console.log('  - info: status=draft');
    }
    if (errors.length > 0 || warnings.length > 0) {
      const icon = errors.length > 0 ? '⚠️ ' : 'ℹ️ ';
      console.log(`${icon} ${f}`);
      for (const w of warnings) console.log(`  - ${w}`);
      for (const e of errors) console.log(`  - ${e}`);
      totalIssues += errors.length;
    }
  }

  const dups = findDuplicateSlugs(files);
  if (dups.length > 0) {
    console.log('⚠️  duplicate slugs detected:');
    for (const [slug, list] of dups) {
      console.log(`  - ${slug}:`);
      for (const f of list) console.log(`    · ${f}`);
    }
    totalIssues += dups.length;
  }

  if (totalIssues === 0) {
    console.log('✅ docs lint passed with no blocking issues');
    if (draftCount > 0) {
      console.log(`ℹ️  draft documents detected: ${draftCount}`);
    }
    process.exit(0);
  } else {
    console.log(`❌ docs lint found ${totalIssues} issues`);
    process.exit(1);
  }
}

main();


