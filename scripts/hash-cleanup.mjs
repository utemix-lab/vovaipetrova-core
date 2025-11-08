// scripts/hash-cleanup.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import { execSync } from 'child_process';
import matter from 'gray-matter';
import { parse, basename, dirname, join } from 'path';

const ROOT = 'docs';
const DRY_RUN = process.argv.includes('--dry');

// Extract base name without hash suffix
function getBaseName(filename) {
  const name = basename(filename, '.md');
  // Match pattern: name-abcdef (6 hex chars)
  const match = name.match(/^(.+)-([a-f0-9]{6})$/i);
  if (match) {
    return { base: match[1], hash: match[2], hasHash: true };
  }
  return { base: name, hash: null, hasHash: false };
}

// Find all markdown files and group by base name and notion_page_id
function findDuplicates() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  const byNotionId = new Map();
  const byBaseName = new Map();

  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const notionId = fm.notion_page_id;
      const lastEdited = fm.last_edited_time;

      const { base, hash, hasHash } = getBaseName(file);
      const baseKey = `${dirname(file)}/${base}.md`;
      
      // Group by base name (for hash cleanup)
      if (!byBaseName.has(baseKey)) {
        byBaseName.set(baseKey, []);
      }
      byBaseName.get(baseKey).push({
        file,
        base,
        hash,
        hasHash,
        lastEdited,
        notionId,
        fm,
        content: parsed.content
      });

      // Group by notion_page_id (if present)
      if (notionId) {
        if (!byNotionId.has(notionId)) {
          byNotionId.set(notionId, []);
        }
        byNotionId.get(notionId).push({
          file,
          base,
          hash,
          hasHash,
          lastEdited,
          fm,
          content: parsed.content
        });
      }
    } catch (e) {
      console.warn(`⚠️ Failed to read ${file}:`, e.message);
    }
  }

  return { byNotionId, byBaseName };
}

// Find canonical file (prefer without hash, or newest)
function findCanonical(group) {
  const withoutHash = group.filter(f => !f.hasHash);
  if (withoutHash.length > 0) {
    // If multiple without hash, pick newest
    return withoutHash.sort((a, b) => {
      const timeA = a.lastEdited ? new Date(a.lastEdited) : 0;
      const timeB = b.lastEdited ? new Date(b.lastEdited) : 0;
      return timeB - timeA;
    })[0];
  }
  // All have hash, pick newest
  return group.sort((a, b) => {
    const timeA = a.lastEdited ? new Date(a.lastEdited) : 0;
    const timeB = b.lastEdited ? new Date(b.lastEdited) : 0;
    return timeB - timeA;
  })[0];
}

// Update relative links in markdown files
function updateLinks(oldPath, newPath) {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  const oldName = basename(oldPath);
  const newName = basename(newPath);
  let updatedCount = 0;

  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf8');
      if (!raw.includes(oldName)) continue;

      const parsed = matter(raw);
      let content = parsed.content;
      
      // Update markdown links: [text](path/to/old-name.md)
      const linkRe = new RegExp(`\\(([^)]*?)${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
      const updated = content.replace(linkRe, (match, prefix) => {
        return `(${prefix}${newName})`;
      });

      if (updated !== content) {
        if (DRY_RUN) {
          console.log(`DRY: would update links in ${file}`);
        } else {
          writeFileSync(file, matter.stringify(updated, parsed.data), 'utf8');
        }
        updatedCount++;
      }
    } catch (e) {
      console.warn(`⚠️ Failed to update links in ${file}:`, e.message);
    }
  }

  return updatedCount;
}

function main() {
  const { byNotionId, byBaseName } = findDuplicates();
  const moves = [];
  const suspicious = [];

  // Process duplicates by base name (hash cleanup)
  for (const [baseKey, group] of byBaseName.entries()) {
    if (group.length < 2) continue;

    // Check if we have both hashed and non-hashed versions
    const hashed = group.filter(f => f.hasHash);
    const nonHashed = group.filter(f => !f.hasHash);

    if (hashed.length === 0 || nonHashed.length === 0) continue;

    // Prefer non-hashed version as canonical
    const canonical = nonHashed[0];
    const duplicates = hashed;

    // Check notion_page_id matches
    for (const dup of duplicates) {
      if (canonical.notionId && dup.notionId && canonical.notionId !== dup.notionId) {
        // Different notion_page_id - suspicious
        suspicious.push({
          baseName: baseKey,
          files: [canonical.file, dup.file],
          notionIds: [canonical.notionId, dup.notionId]
        });
        continue;
      }

      // Same or missing notion_page_id - safe to merge
      const canonicalPath = canonical.file;
      const dupTime = dup.lastEdited ? new Date(dup.lastEdited) : 0;
      const canonTime = canonical.lastEdited ? new Date(canonical.lastEdited) : 0;

      if (dupTime > canonTime) {
        // Duplicate is newer, update canonical
        if (DRY_RUN) {
          console.log(`DRY: would update ${canonicalPath} with content from ${dup.file}`);
        } else {
          writeFileSync(canonicalPath, matter.stringify(dup.content, dup.fm), 'utf8');
        }
      }

      // Remove duplicate
      moves.push({
        from: dup.file,
        to: null, // Will be deleted
        reason: canonical.notionId ? `same notion_page_id=${canonical.notionId}` : `same base name, merged into ${canonicalPath}`,
        canonical: canonicalPath,
        notionId: canonical.notionId || dup.notionId
      });
    }
  }

  // Also process duplicates by notion_page_id (if notion_page_id present)
  for (const [notionId, group] of byNotionId.entries()) {
    if (group.length < 2) continue;

    const canonical = findCanonical(group);
    const duplicates = group.filter(f => f.file !== canonical.file);

    for (const dup of duplicates) {
      // Skip if already processed by base name
      if (moves.some(m => m.from === dup.file)) continue;

      const canonicalPath = join(dirname(dup.file), `${canonical.base}.md`);
      
      if (!existsSync(canonicalPath) || canonical.file === dup.file) {
        moves.push({
          from: dup.file,
          to: canonicalPath,
          reason: `same notion_page_id=${notionId}`,
          canonical: canonical.file,
          notionId
        });
      }
    }
  }

  // Find suspicious duplicates (same base name, different notion_page_id)
  for (const [baseName, group] of byBaseName.entries()) {
    if (group.length >= 2) {
      const uniqueIds = new Set(group.map(f => f.notionId).filter(Boolean));
      if (uniqueIds.size > 1) {
        suspicious.push({
          baseName,
          files: group.map(f => f.file),
          notionIds: Array.from(uniqueIds)
        });
      }
    }
  }

  // Execute moves
  const results = [];
  for (const move of moves) {
    if (move.to === null) {
      // Delete duplicate
      if (DRY_RUN) {
        console.log(`DRY: would delete ${move.from}`);
      } else {
        execSync(`git rm "${move.from}"`, { encoding: 'utf8' });
      }
      results.push({
        from: move.from,
        to: '(deleted)',
        reason: move.reason,
        filesUpdated: 0
      });
    } else {
      // Rename with git mv
      if (DRY_RUN) {
        console.log(`DRY: would git mv "${move.from}" "${move.to}"`);
      } else {
        execSync(`git mv "${move.from}" "${move.to}"`, { encoding: 'utf8' });
      }

      // Update links
      const updatedCount = updateLinks(move.from, move.to);
      results.push({
        from: move.from,
        to: move.to,
        reason: move.reason,
        filesUpdated: updatedCount
      });
    }
  }

  // Output summary
  console.log('\n## Hash Cleanup Summary\n');
  console.log('### Moves and Deletions\n');
  console.log('| From | To | Reason | Files Updated |');
  console.log('|------|----|--------|---------------|');
  for (const r of results) {
    console.log(`| ${r.from} | ${r.to} | ${r.reason} | ${r.filesUpdated} |`);
  }

  if (suspicious.length > 0) {
    console.log('\n### Suspicious Duplicates (different notion_page_id)\n');
    for (const s of suspicious) {
      console.log(`- **${s.baseName}**:`);
      for (const file of s.files) {
        console.log(`  - ${file}`);
      }
      console.log(`  - notion_page_ids: ${s.notionIds.join(', ')}`);
    }
  }

  console.log(`\n✅ Processed ${moves.length} moves/deletions`);
  if (suspicious.length > 0) {
    console.log(`⚠️  Found ${suspicious.length} suspicious duplicates (different notion_page_id)`);
  }
}

main();

