#!/usr/bin/env node
/**
 * Gateway PoC (auto, no seed)
 *
 * - Ensures `tmp/ideas.json` is empty (no seed) and runs `scripts/author-gateway.mjs --mode=auto`.
 * - Useful to validate the auto-flow when there are no approved ideas.
 *
 * Usage: node scripts/poc/gateway-poc-auto.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const tmpDir = path.join('tmp');
mkdirSync(tmpDir, { recursive: true });

const queuePath = path.join(tmpDir, 'ideas.json');
// Ensure empty queue
writeFileSync(queuePath, JSON.stringify([], null, 2), 'utf8');
console.log(`[gateway-poc-auto] Ensured empty ideas queue at ${queuePath}`);

try {
  console.log('[gateway-poc-auto] Launching author-gateway in auto mode...');
  execSync('node scripts/author-gateway.mjs --mode=auto', { stdio: 'inherit' });
  console.log('[gateway-poc-auto] author-gateway exited. Check tmp/story-meta.json and docs/stories/');
} catch (err) {
  console.error('[gateway-poc-auto] Failed to run author-gateway:', err.message);
  process.exit(1);
}
