#!/usr/bin/env node
// Mapper: локальные экспорты → Universe Graph (graph.jsonl)
// Вход: data/exports/*.jsonl, canon_map.v1.json, data/slices/*/slices.jsonl
// Выход: data/graph/graph.jsonl

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const PROJECT_ID = 'vovaipetrova';
const VERSION = '0.1';

const EXPORTS_DIR = join(ROOT, 'data', 'exports');
const SLICES_DIR = join(ROOT, 'data', 'slices');
const GRAPH_DIR = join(ROOT, 'data', 'graph');
const GRAPH_PATH = join(GRAPH_DIR, 'graph.jsonl');

const KB_PATH = join(EXPORTS_DIR, 'kb_terms.v1.jsonl');
const STORIES_PATH = join(EXPORTS_DIR, 'stories.v1.jsonl');
const CANON_PATH = join(EXPORTS_DIR, 'canon_map.v1.json');
const KB_SLICES_PATH = join(SLICES_DIR, 'kb', 'slices.jsonl');
const STORIES_SLICES_PATH = join(SLICES_DIR, 'stories', 'slices.jsonl');

const nodes = new Map();
const edges = new Map();

function nowIso() {
  return new Date().toISOString();
}

function stableId(type, id) {
  return `${PROJECT_ID}:${type}:${id}`;
}

function addNode(node) {
  if (!nodes.has(node.stable_id)) {
    nodes.set(node.stable_id, node);
  }
}

function addEdge(edge) {
  if (!edges.has(edge.stable_id)) {
    edges.set(edge.stable_id, edge);
  }
}

function readJsonl(path) {
  if (!existsSync(path)) {
    return [];
  }
  const content = readFileSync(path, 'utf8');
  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function readJson(path) {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function makeProvenance(origin, path) {
  return {
    system: 'repo',
    origin,
    path,
  };
}

function makeCommon({ source, updated_at, provenance }) {
  return {
    stable_id: '',
    project_id: PROJECT_ID,
    source,
    version: VERSION,
    updated_at: updated_at || nowIso(),
    provenance,
  };
}

function ensureTerm(slug, label, source, provenance, properties = {}) {
  const id = properties.stable_id || stableId('term', slug);
  addNode({
    type: 'node',
    node_type: 'Term',
    label: label || slug,
    ...makeCommon({ source, updated_at: properties.updated_at, provenance }),
    stable_id: id,
    tags: properties.tags || [],
    properties,
  });
  return id;
}

function ensureDoc(slug, label, source, provenance, properties = {}) {
  const id = properties.stable_id || stableId('doc', slug);
  addNode({
    type: 'node',
    node_type: 'Doc',
    label: label || slug,
    ...makeCommon({ source, updated_at: properties.updated_at, provenance }),
    stable_id: id,
    tags: properties.tags || [],
    properties,
  });
  return id;
}

function ensureChunk(id, source, provenance, properties = {}) {
  const stable = stableId('chunk', id);
  addNode({
    type: 'node',
    node_type: 'Chunk',
    label: id,
    ...makeCommon({ source, updated_at: properties.updated_at, provenance }),
    stable_id: stable,
    properties,
  });
  return stable;
}

function main() {
  // Project + Repository
  const projectNodeId = stableId('project', PROJECT_ID);
  addNode({
    type: 'node',
    node_type: 'Project',
    label: 'Vova & Petrova',
    ...makeCommon({
      source: 'docs',
      updated_at: nowIso(),
      provenance: makeProvenance('manual', 'docs/graph/UNIVERSE_SPEC.md'),
    }),
    stable_id: projectNodeId,
    properties: { slug: 'vova-i-petrova' },
  });

  const repoId = stableId('repo', 'vovaipetrova-core');
  addNode({
    type: 'node',
    node_type: 'Repository',
    label: 'vovaipetrova-core',
    ...makeCommon({
      source: 'docs',
      updated_at: nowIso(),
      provenance: makeProvenance('manual', 'docs/single-source-playbook.md'),
    }),
    stable_id: repoId,
    properties: { name: 'vovaipetrova-core' },
  });

  addEdge({
    type: 'edge',
    edge_type: 'governs',
    modality: 'symbolic',
    from: projectNodeId,
    to: repoId,
    ...makeCommon({
      source: 'docs',
      updated_at: nowIso(),
      provenance: makeProvenance('manual', 'docs/graph/UNIVERSE_SPEC.md'),
    }),
    stable_id: stableId('edge', `project-governs-repo`),
    properties: { relation: 'project_repository' },
  });

  // KB terms
  const kbTerms = readJsonl(KB_PATH);
  for (const term of kbTerms) {
    const termId = ensureTerm(
      term.slug,
      term.title,
      'kb',
      makeProvenance('exports', 'data/exports/kb_terms.v1.jsonl'),
      {
        slug: term.slug,
        lite_summary: term.lite_summary,
        updated_at: term.updated_at,
        tags: term.tags || [],
        links: term.links || [],
        stable_id: term.stable_id,
      }
    );

    for (const link of term.links || []) {
      const targetId = ensureTerm(
        link,
        link,
        'kb',
        makeProvenance('exports', 'data/exports/kb_terms.v1.jsonl'),
        { slug: link }
      );
      addEdge({
        type: 'edge',
        edge_type: 'see_also',
        modality: 'symbolic',
        from: termId,
        to: targetId,
        ...makeCommon({
          source: 'kb',
          updated_at: term.updated_at,
          provenance: makeProvenance('exports', 'data/exports/kb_terms.v1.jsonl'),
        }),
        stable_id: stableId('edge', `term:${term.slug}:see_also:${link}`),
        properties: { relation: 'kb_link' },
      });
    }
  }

  // Stories
  const stories = readJsonl(STORIES_PATH);
  for (const story of stories) {
    ensureDoc(
      story.slug,
      story.tldr || story.slug,
      'stories',
      makeProvenance('exports', 'data/exports/stories.v1.jsonl'),
      {
        slug: story.slug,
        tldr: story.tldr,
        series_id: story.series_id,
        refs: story.refs,
        updated_at: story.updated_at,
        stable_id: story.stable_id,
      }
    );
  }

  // Canon map (aliases)
  const canon = readJson(CANON_PATH) || {};
  for (const [canonicalSlug, payload] of Object.entries(canon)) {
    const canonicalId = ensureTerm(
      canonicalSlug,
      payload.preferred_title || canonicalSlug,
      'kb',
      makeProvenance('canon_map', 'data/exports/canon_map.v1.json'),
      { slug: canonicalSlug }
    );

    for (const alias of payload.aliases || []) {
      const aliasId = ensureTerm(
        alias,
        alias,
        'canon_map',
        makeProvenance('canon_map', 'data/exports/canon_map.v1.json'),
        { slug: alias, alias_of: canonicalSlug }
      );
      addEdge({
        type: 'edge',
        edge_type: 'see_also',
        modality: 'symbolic',
        from: aliasId,
        to: canonicalId,
        ...makeCommon({
          source: 'canon_map',
          updated_at: nowIso(),
          provenance: makeProvenance('canon_map', 'data/exports/canon_map.v1.json'),
        }),
        stable_id: stableId('edge', `alias:${alias}:see_also:${canonicalSlug}`),
        properties: { relation: 'alias_of' },
      });
    }
  }

  // Slices -> Chunks
  const kbSlices = readJsonl(KB_SLICES_PATH);
  const storiesSlices = readJsonl(STORIES_SLICES_PATH);
  const allSlices = [...kbSlices, ...storiesSlices];

  for (const slice of allSlices) {
    const chunkId = ensureChunk(
      slice.id,
      'slices',
      makeProvenance('slices', `data/slices/${slice.source_type}/slices.jsonl`),
      {
        source_id: slice.source_id,
        source_type: slice.source_type,
        tokens: slice.tokens,
        metadata: slice.metadata || {},
        updated_at: slice.updated_at,
      }
    );

    const sourceId =
      slice.source_type === 'kb'
        ? ensureTerm(
            slice.source_id,
            slice.metadata?.title || slice.source_id,
            'kb',
            makeProvenance('exports', 'data/exports/kb_terms.v1.jsonl'),
            { slug: slice.source_id, stable_id: slice.stable_id }
          )
        : ensureDoc(
            slice.source_id,
            slice.metadata?.title || slice.source_id,
            'stories',
            makeProvenance('exports', 'data/exports/stories.v1.jsonl'),
            { slug: slice.source_id, stable_id: slice.stable_id }
          );

    addEdge({
      type: 'edge',
      edge_type: 'mentions',
      modality: 'symbolic',
      from: sourceId,
      to: chunkId,
      ...makeCommon({
        source: 'slices',
        updated_at: slice.updated_at,
        provenance: makeProvenance('slices', `data/slices/${slice.source_type}/slices.jsonl`),
      }),
      stable_id: stableId('edge', `source:${slice.source_id}:mentions:${slice.id}`),
      properties: { relation: 'chunk' },
    });
  }

  mkdirSync(GRAPH_DIR, { recursive: true });

  const output = [
    ...Array.from(nodes.values()),
    ...Array.from(edges.values()),
  ]
    .map(entry => JSON.stringify(entry))
    .join('\n');

  writeFileSync(GRAPH_PATH, output + '\n', 'utf8');
  console.log(`[map_local_to_universe] Written ${nodes.size} nodes and ${edges.size} edges to ${GRAPH_PATH}`);
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
