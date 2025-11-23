#!/usr/bin/env node
/**
 * add-image-to-episode.mjs
 *
 * CLI helper to update front-matter image slots in a story markdown file.
 *
 * Usage:
 *  node scripts/add-image-to-episode.mjs --file=docs/stories/2025-...-example.md --slot=author --url=https://... --uploaded-by="Name"
 *  node scripts/add-image-to-episode.mjs --slug=stories-v10-content-ready-2025-11-12 --slot=machine --url=... 
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import matter from 'gray-matter';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--file=')) out.file = a.split('=', 2)[1];
    else if (a.startsWith('--slug=')) out.slug = a.split('=', 2)[1];
    else if (a.startsWith('--slot=')) out.slot = a.split('=', 2)[1];
    else if (a.startsWith('--url=')) out.url = a.split('=', 2)[1];
    else if (a.startsWith('--uploaded-by=')) out.uploaded_by = a.split('=', 2)[1];
  }
  return out;
}

function log(msg) { console.log(`[add-image] ${msg}`); }

function findBySlug(slug) {
  const files = [];
  try {
    const dir = path.join('docs', 'stories');
    const items = readdirSync(dir);
    for (const it of items) {
      if (it.endsWith('.md') && it.includes(slug)) files.push(path.join(dir, it));
    }
  } catch (err) {
    // ignore
  }
  return files[0] || null;
}

async function main() {
  const { file, slug, slot, url, uploaded_by } = parseArgs();
  if (!slot || !['author','machine'].includes(slot)) {
    console.error('Specify --slot=author|machine');
    process.exit(2);
  }
  let target = file;
  if (!target && slug) target = findBySlug(slug);
  if (!target) {
    console.error('No file found. Provide --file or --slug.');
    process.exit(2);
  }
  if (!existsSync(target)) {
    console.error(`File not found: ${target}`);
    process.exit(2);
  }

  const raw = readFileSync(target, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const now = new Date().toISOString();
  const key = `${slot}_image`;

  fm[key] = fm[key] || {};
  if (url) fm[key].url = url;
  fm[key].status = url ? 'uploaded' : fm[key].status || 'placeholder';
  fm[key].uploaded_by = uploaded_by || fm[key].uploaded_by || null;
  fm[key].uploaded_at = url ? now : fm[key].uploaded_at || null;

  const out = matter.stringify(parsed.content || '', fm);
  writeFileSync(target, out, 'utf8');
  log(`Updated ${key} in ${target}`);
}

main();
