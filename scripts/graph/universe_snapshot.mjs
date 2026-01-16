#!/usr/bin/env node
/**
 * Universe snapshot: map exports -> graph.jsonl and validate with counts.
 *
 * Использование:
 *   node scripts/graph/universe_snapshot.mjs
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const MAP_SCRIPT = join(ROOT, 'scripts', 'graph', 'map_local_to_universe.mjs');
const GRAPH_PATH = join(ROOT, 'data', 'graph', 'graph.jsonl');
const SCHEMA_PATH = join(ROOT, 'docs', 'graph', 'universe.schema.json');
const LOGS_DIR = join(ROOT, 'logs');
const REPORT_PATH = join(LOGS_DIR, 'universe_snapshot_validation.md');

function log(message) {
  console.log(`[universe-snapshot] ${message}`);
}

function parseGraph() {
  if (!existsSync(GRAPH_PATH)) {
    throw new Error(`graph.jsonl not found: ${GRAPH_PATH}`);
  }
  const lines = readFileSync(GRAPH_PATH, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const entries = lines.map(line => JSON.parse(line));
  return { entries, linesCount: lines.length };
}

function validateGraph(entries, schema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const errors = [];
  entries.forEach((entry, index) => {
    const valid = validate(entry);
    if (!valid) {
      errors.push({
        index: index + 1,
        issues: (validate.errors || []).map(err => `${err.instancePath} ${err.message}`),
      });
    }
  });
  return errors;
}

function buildCounts(entries) {
  const nodes = entries.filter(entry => entry.type === 'node');
  const edges = entries.filter(entry => entry.type === 'edge');
  const nodeTypes = nodes.reduce((acc, node) => {
    acc[node.node_type] = (acc[node.node_type] || 0) + 1;
    return acc;
  }, {});
  const edgeTypes = edges.reduce((acc, edge) => {
    acc[edge.edge_type] = (acc[edge.edge_type] || 0) + 1;
    return acc;
  }, {});
  return {
    total: entries.length,
    nodes: nodes.length,
    edges: edges.length,
    nodeTypes,
    edgeTypes,
  };
}

function writeReport(counts, errors) {
  mkdirSync(LOGS_DIR, { recursive: true });
  const lines = [
    '# Universe Snapshot Validation',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Counts',
    '',
    `- Total: ${counts.total}`,
    `- Nodes: ${counts.nodes}`,
    `- Edges: ${counts.edges}`,
    '',
    '### Node types',
    ...Object.entries(counts.nodeTypes).map(([type, count]) => `- ${type}: ${count}`),
    '',
    '### Edge types',
    ...Object.entries(counts.edgeTypes).map(([type, count]) => `- ${type}: ${count}`),
    '',
    '## Validation',
  ];

  if (errors.length === 0) {
    lines.push('', '✅ Schema validation passed.');
  } else {
    lines.push('', `❌ Errors: ${errors.length}`, '');
    for (const error of errors.slice(0, 10)) {
      lines.push(`- Line ${error.index}:`);
      for (const issue of error.issues) {
        lines.push(`  - ${issue}`);
      }
    }
    if (errors.length > 10) {
      lines.push('', `... and ${errors.length - 10} more.`);
    }
  }

  writeFileSync(REPORT_PATH, lines.join('\n') + '\n', 'utf8');
  return REPORT_PATH;
}

function main() {
  log('Running mapper...');
  execFileSync(process.execPath, [MAP_SCRIPT], { stdio: 'inherit' });

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const { entries } = parseGraph();
  const errors = validateGraph(entries, schema);
  const counts = buildCounts(entries);
  const reportPath = writeReport(counts, errors);

  log(`Report: ${reportPath}`);
  if (errors.length > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
