#!/usr/bin/env node
/**
 * Validate session JSON files against SESSION.schema.json and invariants.
 *
 * Usage:
 *   node scripts/session/validate_session.mjs [--require-route-edges] [paths...]
 *
 * If no paths are provided, scans public/sessions for *.json files.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const DEFAULT_ROOT = join(ROOT, 'public', 'sessions');
const SCHEMA_PATH = join(ROOT, 'docs', 'ecosystem', 'session', 'SESSION.schema.json');

function log(message) {
  console.log(`[validate-session] ${message}`);
}

function walkJsonFiles(startPath, output) {
  if (!existsSync(startPath)) return;
  const stats = statSync(startPath);
  if (stats.isFile()) {
    if (extname(startPath).toLowerCase() === '.json') {
      output.push(startPath);
    }
    return;
  }
  if (!stats.isDirectory()) return;
  for (const entry of readdirSync(startPath, { withFileTypes: true })) {
    const nextPath = join(startPath, entry.name);
    if (entry.isDirectory()) {
      walkJsonFiles(nextPath, output);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.json') {
      output.push(nextPath);
    }
  }
}

function collectTargets(paths) {
  const targets = [];
  if (!paths.length) {
    walkJsonFiles(DEFAULT_ROOT, targets);
    return targets;
  }
  paths.forEach(path => walkJsonFiles(path, targets));
  return targets;
}

function getLimit(schema, selector) {
  const value = selector(schema);
  return typeof value === 'number' ? value : null;
}

function parseJsonFile(path) {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

function validateLimits(session, schema, errors) {
  const nodesLimit = getLimit(schema, s => s?.properties?.subgraph?.properties?.nodes?.maxItems);
  const edgesLimit = getLimit(schema, s => s?.properties?.subgraph?.properties?.edges?.maxItems);
  const routeLimit = getLimit(schema, s => s?.properties?.route?.maxItems);
  const artifactsLimit = getLimit(schema, s => s?.properties?.artifacts?.maxItems);

  if (nodesLimit !== null && session.subgraph.nodes.length > nodesLimit) {
    errors.push(`nodes length ${session.subgraph.nodes.length} exceeds max_nodes ${nodesLimit}`);
  }
  if (edgesLimit !== null && session.subgraph.edges.length > edgesLimit) {
    errors.push(`edges length ${session.subgraph.edges.length} exceeds max_edges ${edgesLimit}`);
  }
  if (routeLimit !== null && session.route.length > routeLimit) {
    errors.push(`route length ${session.route.length} exceeds max_route_len ${routeLimit}`);
  }
  if (artifactsLimit !== null && session.artifacts.length > artifactsLimit) {
    errors.push(`artifacts length ${session.artifacts.length} exceeds max_artifacts ${artifactsLimit}`);
  }
}

function validateRouteSubset(session, errors) {
  const nodeIds = new Set(session.subgraph.nodes.map(node => node.id));
  const missing = session.route.filter(nodeId => !nodeIds.has(nodeId));
  if (missing.length) {
    errors.push(`route contains nodes missing in subgraph.nodes: ${missing.join(', ')}`);
  }
}

function validateRouteEdges(session, errors) {
  const edges = new Set(
    session.subgraph.edges.map(edge => `${edge.from}::${edge.to}`)
  );
  for (let i = 0; i < session.route.length - 1; i += 1) {
    const from = session.route[i];
    const to = session.route[i + 1];
    const direct = edges.has(`${from}::${to}`);
    const reverse = edges.has(`${to}::${from}`);
    if (!direct && !reverse) {
      errors.push(`route neighbors missing edge: ${from} -> ${to}`);
    }
  }
}

function validateArtifacts(session, errors) {
  session.artifacts.forEach((artifact, index) => {
    const provenance = artifact.provenance || {};
    if (!provenance.source_ref || typeof provenance.source_ref !== 'string') {
      errors.push(`artifact[${index}] missing provenance.source_ref`);
    }
    if (!provenance.generated_at || typeof provenance.generated_at !== 'string') {
      errors.push(`artifact[${index}] missing provenance.generated_at`);
    } else if (Number.isNaN(Date.parse(provenance.generated_at))) {
      errors.push(`artifact[${index}] provenance.generated_at is not date-time`);
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  const requireRouteEdges = args.includes('--require-route-edges');
  const paths = args.filter(arg => arg !== '--require-route-edges');

  if (!existsSync(SCHEMA_PATH)) {
    log(`❌ Schema file not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const targets = collectTargets(paths);
  if (!targets.length) {
    log('❌ No session JSON files found.');
    process.exit(1);
  }

  let hasErrors = false;

  targets.forEach(path => {
    let session;
    try {
      session = parseJsonFile(path);
    } catch (error) {
      hasErrors = true;
      log(`❌ ${path}: invalid JSON (${error.message})`);
      return;
    }

    const errors = [];
    const valid = validate(session);
    if (!valid) {
      for (const err of validate.errors || []) {
        errors.push(`${err.instancePath || '(root)'} ${err.message}`);
      }
    }

    if (valid) {
      validateLimits(session, schema, errors);
      validateRouteSubset(session, errors);
      if (requireRouteEdges) {
        validateRouteEdges(session, errors);
      }
      validateArtifacts(session, errors);
    }

    if (errors.length) {
      hasErrors = true;
      log(`❌ ${path}:`);
      errors.forEach(message => log(`   - ${message}`));
    } else {
      log(`✅ ${path}`);
    }
  });

  if (hasErrors) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
