#!/usr/bin/env node
/**
 * Round-trip provenance check for Terms and Docs.
 *
 * Использование:
 *   node scripts/graph/round_trip_provenance.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const KB_PATH = join(ROOT, 'data', 'exports', 'kb_terms.v1.jsonl');
const STORIES_PATH = join(ROOT, 'data', 'exports', 'stories.v1.jsonl');
const GRAPH_PATH = join(ROOT, 'data', 'graph', 'graph.jsonl');
const LOGS_DIR = join(ROOT, 'logs');
const REPORT_PATH = join(LOGS_DIR, 'round-trip-provenance-report.md');

function readJsonl(path) {
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function readGraph() {
  if (!existsSync(GRAPH_PATH)) {
    throw new Error(`graph.jsonl not found: ${GRAPH_PATH}`);
  }
  return readJsonl(GRAPH_PATH);
}

function mapGraphNodes(entries, nodeType) {
  return entries
    .filter(entry => entry.type === 'node' && entry.node_type === nodeType)
    .reduce((acc, node) => {
      acc[node.stable_id] = node;
      return acc;
    }, {});
}

function buildRow({ kind, slug, exportStableId, graphStableId, projectOk, provenanceOk, status }) {
  return `| ${kind} | ${slug} | ${exportStableId} | ${graphStableId} | ${projectOk} | ${provenanceOk} | ${status} |`;
}

function main() {
  const kbTerms = readJsonl(KB_PATH).slice(0, 10);
  const stories = readJsonl(STORIES_PATH).slice(0, 5);
  const graph = readGraph();

  const termNodes = mapGraphNodes(graph, 'Term');
  const docNodes = mapGraphNodes(graph, 'Doc');

  const rows = [];
  let criticals = 0;

  for (const term of kbTerms) {
    const node = termNodes[term.stable_id];
    const graphStableId = node?.stable_id || 'missing';
    const projectOk = node?.project_id === term.project_id ? 'yes' : 'no';
    const provenanceOk = node?.provenance?.path === 'data/exports/kb_terms.v1.jsonl' ? 'yes' : 'no';
    const status = node && projectOk === 'yes' && provenanceOk === 'yes' ? 'ok' : 'critical';
    if (status === 'critical') {
      criticals += 1;
    }
    rows.push(
      buildRow({
        kind: 'Term',
        slug: term.slug,
        exportStableId: term.stable_id,
        graphStableId,
        projectOk,
        provenanceOk,
        status,
      })
    );
  }

  for (const story of stories) {
    const node = docNodes[story.stable_id];
    const graphStableId = node?.stable_id || 'missing';
    const projectOk = node?.project_id === story.project_id ? 'yes' : 'no';
    const provenanceOk = node?.provenance?.path === 'data/exports/stories.v1.jsonl' ? 'yes' : 'no';
    const status = node && projectOk === 'yes' && provenanceOk === 'yes' ? 'ok' : 'critical';
    if (status === 'critical') {
      criticals += 1;
    }
    rows.push(
      buildRow({
        kind: 'Doc',
        slug: story.slug,
        exportStableId: story.stable_id,
        graphStableId,
        projectOk,
        provenanceOk,
        status,
      })
    );
  }

  mkdirSync(LOGS_DIR, { recursive: true });
  const report = [
    '# Round-trip provenance report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Terms checked: ${kbTerms.length}`,
    `- Docs checked: ${stories.length}`,
    `- Critical mismatches: ${criticals}`,
    '',
    '## Details',
    '',
    '| Type | Slug | Export stable_id | Graph stable_id | project_id | provenance.path | Status |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ];

  writeFileSync(REPORT_PATH, report.join('\n'), 'utf8');

  if (criticals > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
