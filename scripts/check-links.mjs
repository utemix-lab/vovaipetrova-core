#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import { join, dirname, resolve } from 'path';
import matter from 'gray-matter';

const ROOT = 'docs';
const DOCS_ROOT = resolve(ROOT);

// Extract markdown links from content
function extractLinks(content, filePath) {
  const links = [];
  // Match [text](path) and [text](path "title")
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRe.exec(content)) !== null) {
    const [, text, url] = match;
    // Skip external links (http/https)
    if (/^https?:\/\//i.test(url)) continue;
    // Skip anchors (#section)
    if (url.startsWith('#')) continue;
    // Skip mailto:
    if (url.startsWith('mailto:')) continue;
    
    links.push({
      text,
      url,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return links;
}

// Resolve relative path to absolute file path
function resolveLinkPath(linkUrl, fromFile) {
  const fromDir = dirname(fromFile);
  const resolved = resolve(fromDir, linkUrl);
  
  // Normalize: remove anchors, handle .md extension
  let targetPath = resolved;
  if (targetPath.includes('#')) {
    targetPath = targetPath.split('#')[0];
  }
  
  // If no extension, try .md
  if (!targetPath.match(/\.(md|markdown)$/i)) {
    const withMd = targetPath + '.md';
    if (existsSync(withMd)) {
      return withMd;
    }
  }
  
  return targetPath;
}

// Check if file exists
function checkLink(link, fromFile) {
  const targetPath = resolveLinkPath(link.url, fromFile);
  
  if (existsSync(targetPath)) {
    // Check if path is within docs/
    const relativePath = targetPath.replace(DOCS_ROOT, '').replace(/^[\\/]/, '');
    if (relativePath.startsWith('..')) {
      return { valid: false, reason: 'outside docs/' };
    }
    return { valid: true };
  }
  
  return { valid: false, reason: 'file not found', targetPath };
}

function main() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  const errors = [];
  
  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf8');
      const parsed = matter(raw);
      const content = parsed.content || '';
      const links = extractLinks(content, file);
      
      for (const link of links) {
        const result = checkLink(link, file);
        if (!result.valid) {
          errors.push({
            file,
            line: link.line,
            url: link.url,
            reason: result.reason,
            targetPath: result.targetPath
          });
        }
      }
    } catch (e) {
      console.error(`⚠️ Failed to check ${file}:`, e.message);
    }
  }
  
  if (errors.length > 0) {
    console.error('\n❌ Broken internal links found:\n');
    for (const err of errors) {
      console.error(`  ${err.file}:${err.line}`);
      console.error(`    → ${err.url}`);
      console.error(`    ${err.reason}: ${err.targetPath || 'N/A'}\n`);
    }
    process.exit(1);
  } else {
    console.log('✅ All internal links are valid');
    process.exit(0);
  }
}

main();

