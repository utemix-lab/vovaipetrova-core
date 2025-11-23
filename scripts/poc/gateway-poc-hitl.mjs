#!/usr/bin/env node
/**
 * Gateway PoC (HITL seed_text)
 *
 * - Seeds an approved idea into `tmp/ideas.json` with a short `seed_text`.
 * - Runs `scripts/author-gateway.mjs --mode=hitl` to generate a draft and stop for review.
 *
 * Usage: node scripts/poc/gateway-poc-hitl.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const tmpDir = path.join('tmp');
mkdirSync(tmpDir, { recursive: true });

const idea = {
  id: `idea-seed-${Date.now()}`,
  status: 'approved',
  title: 'PoC: seed_text → HITL',
  seed_text: 'Короткая seed-заметка: исследование Gateway PoC, initial idea for dual-story.',
  created_at: new Date().toISOString(),
  author: 'автор',
};

const queuePath = path.join(tmpDir, 'ideas.json');
writeFileSync(queuePath, JSON.stringify([idea], null, 2), 'utf8');
console.log(`[gateway-poc-hitl] Wrote approved idea to ${queuePath}`);

try {
  console.log('[gateway-poc-hitl] Launching author-gateway in HITL mode...');
  execSync('node scripts/author-gateway.mjs --mode=hitl', { stdio: 'inherit' });
  console.log('[gateway-poc-hitl] author-gateway exited. Check docs/stories/ for generated drafts.');
} catch (err) {
  console.error('[gateway-poc-hitl] Failed to run author-gateway:', err.message);
  process.exit(1);
}
