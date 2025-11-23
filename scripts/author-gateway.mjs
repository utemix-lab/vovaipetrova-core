#!/usr/bin/env node
/**
 * Author Gateway PoC
 *
 * Modes:
 *   --mode=auto        Run generator automatically (calls scripts/generate-stories.mjs)
 *   --mode=hitl        Human-in-the-loop: generate but stop for manual review (no auto PR)
 *   --mode=human-first Create an empty draft stub for a human to fill
 *
 * Options:
 *   --notion-page / --page-id  Page id to forward a minimal report (optional)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

function parseArgs() {
  const out = { mode: 'auto' };
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--mode=')) out.mode = raw.split('=')[1];
    else if (raw.startsWith('--page-id=')) out.pageId = raw.split('=')[1];
    else if (raw.startsWith('--notion-page=')) out.pageId = raw.split('=')[1];
  }
  return out;
}

function log(msg) {
  console.log(`[author-gateway] ${msg}`);
}

async function runAuto(pageId) {
  log('Running generator (auto mode)...');
  try {
    execSync('node scripts/generate-stories.mjs', { stdio: 'inherit' });
  } catch (err) {
    log(`Generator failed: ${err.message}`);
    process.exit(1);
  }

  // Try to read tmp/story-meta.json and optionally forward to notion-report
  const metaPath = path.join('tmp', 'story-meta.json');
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      log(`Generated: ${meta.file || meta.filename}`);
      if (pageId || process.env.NOTION_COPILOT_REPORTS_PAGE_ID) {
        const target = pageId || process.env.NOTION_COPILOT_REPORTS_PAGE_ID;
        const report = {
          title: `Author Gateway: ${meta.filename || path.basename(meta.file || '')}`,
          message: `Автогенерация через Author Gateway, файл: ${meta.filename || meta.file}`,
          filename: meta.filename || meta.file,
          sources: meta.sources || [],
          timestamp: new Date().toISOString(),
          executor: 'author-gateway',
        };
        const tmpDir = 'tmp';
        mkdirSync(tmpDir, { recursive: true });
        const reportPath = path.join(tmpDir, 'author-gateway-report.json');
        writeFileSync(reportPath, JSON.stringify(report, null, 2));
        try {
          execSync(`node scripts/notion-report.mjs --file "${reportPath}" --page-id "${target}"`, { stdio: 'inherit' });
          log('Notion report forwarded (best-effort)');
        } catch (err) {
          log(`Notion report hook failed (non-blocking): ${err.message}`);
        }
      }
    } catch (err) {
      log(`Failed to read meta: ${err.message}`);
    }
  } else {
    log('No meta file found (tmp/story-meta.json) — generator may not have produced metadata.');
  }
}

async function runHitl(pageId) {
  log('Human-in-the-loop mode: generating but awaiting human review.');
  try {
    execSync('node scripts/generate-stories.mjs', { stdio: 'inherit' });
  } catch (err) {
    log(`Generator failed: ${err.message}`);
    process.exit(1);
  }
  log('Generation complete. Please review the draft in docs/stories/ and create PR manually.');
  if (pageId) log(`You can post a Notion report using page id ${pageId} with scripts/notion-report.mjs`);
}

async function runHumanFirst() {
  log('Creating human-first stub...');
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const slug = `manual-stub-${Date.now()}`;
  const filename = `${date}-${slug}.md`;
  const filePath = path.join('docs', 'stories', filename);
  const fm = [
    '---',
    `title: "Manual stub - ${date}"`,
    `slug: "${slug}"`,
    'summary: "Human-first stub — fill by hand."',
    'tags: [Story]',
    'machine_tags: [content/story]',
    'status: draft',
    "last_edited_time: ''",
    'author_image:',
    '  url: "https://via.placeholder.com/800x450?text=author"',
    '  status: "placeholder"',
    '  uploaded_by: null',
    '  uploaded_at: null',
    'machine_image:',
    '  url: "https://via.placeholder.com/800x450?text=machine"',
    '  status: "placeholder"',
    '  uploaded_by: null',
    '  uploaded_at: null',
    '---',
    '',
    '# Human-first stub',
    '',
    'Заполните вручную структуру эпизода.',
    '',
  ].join('\n');
  writeFileSync(filePath, fm, 'utf8');
  log(`Stub created: ${filePath}`);
}

async function main() {
  const { mode, pageId } = parseArgs();
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node scripts/author-gateway.mjs [--mode=auto|hitl|human-first] [--page-id=...]');
    process.exit(0);
  }
  if (!['auto', 'hitl', 'human-first'].includes(mode)) {
    console.error('Invalid mode. Use auto, hitl, or human-first.');
    process.exit(2);
  }

  if (mode === 'auto') await runAuto(pageId);
  else if (mode === 'hitl') await runHitl(pageId);
  else if (mode === 'human-first') await runHumanFirst();
}

main();
