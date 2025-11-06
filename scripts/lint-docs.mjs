// scripts/lint-docs.mjs
import { readFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

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

function lintFile(file) {
  const issues = [];
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const body = parsed.content || '';

  if (!fm.title) issues.push('missing title');
  if (!fm.slug) issues.push('missing slug');
  if (!fm.summary || String(fm.summary).trim().length === 0) issues.push('missing summary');
  if (!Array.isArray(fm.tags) || fm.tags.length === 0) issues.push(STRICT ? 'missing tags[]' : 'warn: missing tags[]');
  if (!Array.isArray(fm.machine_tags) || fm.machine_tags.length === 0) issues.push(STRICT ? 'missing machine_tags[]' : 'warn: missing machine_tags[]');

  // Flag legacy encoded Notion links (percent-encoded .md)
  const legacyLinkRe = /\(([^)]+%[0-9A-Fa-f]{2}[^)]*\.md)\)/g;
  if (legacyLinkRe.test(body)) issues.push('contains legacy percent-encoded .md links');

  return issues;
}

function main() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  let totalIssues = 0;
  for (const f of files) {
    const issues = lintFile(f);
    if (issues.length > 0) {
      totalIssues += issues.filter(i => !i.startsWith('warn:')).length;
      console.log(`⚠️  ${f}`);
      for (const i of issues) console.log(`  - ${i}`);
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
    console.log('✅ docs lint passed with no issues');
    process.exit(0);
  } else {
    console.log(`❌ docs lint found ${totalIssues} issues`);
    process.exit(1);
  }
}

main();


