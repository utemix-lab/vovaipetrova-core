#!/usr/bin/env node
/**
 * Round-trip provenance проверка
 *
 * Выбирает 10 Term и 5 Doc, проверяет корректность переноса
 * stable_id, project_id, provenance в graph.jsonl
 *
 * Использование:
 *   node scripts/graph/round_trip_provenance.mjs
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

const KB_EXPORT = join(ROOT, 'data', 'exports', 'kb_terms.v1.jsonl');
const STORIES_EXPORT = join(ROOT, 'data', 'exports', 'stories.v1.jsonl');
const GRAPH_PATH = join(ROOT, 'data', 'graph', 'graph.jsonl');
const LOGS_DIR = join(ROOT, 'logs');
const REPORT_PATH = join(LOGS_DIR, 'round-trip-provenance-report.md');

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

function findInGraph(graphEntries, stableId) {
  return graphEntries.find(entry => entry.stable_id === stableId);
}

function compareProvenance(exportProv, graphProv, type) {
  const issues = [];

  if (!exportProv && !graphProv) {
    return { match: true, issues: [] };
  }

  if (!exportProv) {
    issues.push(`${type}: export provenance отсутствует`);
    return { match: false, issues };
  }

  if (!graphProv) {
    issues.push(`${type}: graph provenance отсутствует`);
    return { match: false, issues };
  }

  // Проверка основных полей
  if (exportProv.system !== graphProv.system) {
    issues.push(`${type}: system mismatch (export: ${exportProv.system}, graph: ${graphProv?.system || 'N/A'})`);
  }

  if (exportProv.origin !== graphProv.origin) {
    issues.push(`${type}: origin mismatch (export: ${exportProv.origin}, graph: ${graphProv?.origin || 'N/A'})`);
  }

  // Проверка file/path (могут отличаться, но должны быть связаны)
  const exportFile = exportProv.file || '';
  const graphPath = graphProv.path || '';
  if (exportFile && graphPath && !graphPath.includes(exportFile.split('/').pop())) {
    issues.push(`${type}: file/path mismatch (export: ${exportFile}, graph: ${graphPath})`);
  }

  return {
    match: issues.length === 0,
    issues: issues.length > 0 ? issues : [],
  };
}

function main() {
  console.log('[round-trip-provenance] Загрузка данных...');

  const kbTerms = readJsonl(KB_EXPORT);
  const stories = readJsonl(STORIES_EXPORT);
  const graphEntries = readJsonl(GRAPH_PATH);

  console.log(`[round-trip-provenance] Загружено: ${kbTerms.length} Term, ${stories.length} Doc, ${graphEntries.length} graph entries`);

  // Выбираем 10 Term (первые 10 с полными данными)
  const selectedTerms = kbTerms
    .filter(term => term.stable_id && term.project_id && term.provenance)
    .slice(0, 10);

  // Выбираем 5 Doc (первые 5 с полными данными)
  const selectedDocs = stories
    .filter(doc => doc.stable_id && doc.project_id && doc.provenance)
    .slice(0, 5);

  console.log(`[round-trip-provenance] Выбрано: ${selectedTerms.length} Term, ${selectedDocs.length} Doc`);

  const results = {
    terms: [],
    docs: [],
    summary: {
      total: 0,
      critical: 0,
      minor: 0,
      perfect: 0,
    },
  };

  // Проверка Term
  for (const term of selectedTerms) {
    const graphNode = findInGraph(graphEntries, term.stable_id);

    if (!graphNode) {
      results.terms.push({
        slug: term.slug,
        stable_id: term.stable_id,
        status: 'critical',
        issues: ['Term не найден в graph.jsonl'],
        export: term,
        graph: null,
      });
      results.summary.critical += 1;
      continue;
    }

    const issues = [];
    let status = 'perfect';

    // Проверка stable_id
    if (term.stable_id !== graphNode.stable_id) {
      issues.push(`stable_id mismatch: export="${term.stable_id}", graph="${graphNode.stable_id}"`);
      status = 'critical';
    }

    // Проверка project_id
    if (term.project_id !== graphNode.project_id) {
      issues.push(`project_id mismatch: export="${term.project_id}", graph="${graphNode.project_id}"`);
      status = 'critical';
    }

    // Проверка source (ожидаемое различие: экспорт использует "vova-petrova", граф - более конкретные "kb"/"stories")
    if (term.source !== graphNode.source) {
      issues.push(`source mismatch (expected): export="${term.source}", graph="${graphNode.source}"`);
      // Не меняем status на minor, так как это ожидаемое поведение маппера
    }

    // Проверка graph_version
    if (term.graph_version !== graphNode.version) {
      issues.push(`graph_version mismatch: export="${term.graph_version}", graph="${graphNode.version}"`);
      status = 'minor';
    }

    // Проверка provenance
    const provCheck = compareProvenance(term.provenance, graphNode.provenance, 'provenance');
    if (!provCheck.match) {
      issues.push(...provCheck.issues);
      status = provCheck.issues.some(i => i.includes('mismatch')) ? 'critical' : 'minor';
    }

    results.terms.push({
      slug: term.slug,
      stable_id: term.stable_id,
      status,
      issues,
      export: {
        stable_id: term.stable_id,
        project_id: term.project_id,
        source: term.source,
        graph_version: term.graph_version,
        provenance: term.provenance,
      },
      graph: {
        stable_id: graphNode.stable_id,
        project_id: graphNode.project_id,
        source: graphNode.source,
        version: graphNode.version,
        provenance: graphNode.provenance,
      },
    });

    if (status === 'critical') {
      results.summary.critical += 1;
    } else if (status === 'minor') {
      results.summary.minor += 1;
    } else {
      results.summary.perfect += 1;
    }
    results.summary.total += 1;
  }

  // Проверка Doc
  for (const doc of selectedDocs) {
    const graphNode = findInGraph(graphEntries, doc.stable_id);

    if (!graphNode) {
      results.docs.push({
        slug: doc.slug,
        stable_id: doc.stable_id,
        status: 'critical',
        issues: ['Doc не найден в graph.jsonl'],
        export: doc,
        graph: null,
      });
      results.summary.critical += 1;
      continue;
    }

    const issues = [];
    let status = 'perfect';

    // Проверка stable_id
    if (doc.stable_id !== graphNode.stable_id) {
      issues.push(`stable_id mismatch: export="${doc.stable_id}", graph="${graphNode.stable_id}"`);
      status = 'critical';
    }

    // Проверка project_id
    if (doc.project_id !== graphNode.project_id) {
      issues.push(`project_id mismatch: export="${doc.project_id}", graph="${graphNode.project_id}"`);
      status = 'critical';
    }

    // Проверка source (ожидаемое различие: экспорт использует "vova-petrova", граф - более конкретные "kb"/"stories")
    if (doc.source !== graphNode.source) {
      issues.push(`source mismatch (expected): export="${doc.source}", graph="${graphNode.source}"`);
      // Не меняем status на minor, так как это ожидаемое поведение маппера
    }

    // Проверка graph_version
    if (doc.graph_version !== graphNode.version) {
      issues.push(`graph_version mismatch: export="${doc.graph_version}", graph="${graphNode.version}"`);
      status = 'minor';
    }

    // Проверка provenance
    const provCheck = compareProvenance(doc.provenance, graphNode.provenance, 'provenance');
    if (!provCheck.match) {
      issues.push(...provCheck.issues);
      status = provCheck.issues.some(i => i.includes('mismatch')) ? 'critical' : 'minor';
    }

    results.docs.push({
      slug: doc.slug,
      stable_id: doc.stable_id,
      status,
      issues,
      export: {
        stable_id: doc.stable_id,
        project_id: doc.project_id,
        source: doc.source,
        graph_version: doc.graph_version,
        provenance: doc.provenance,
      },
      graph: {
        stable_id: graphNode.stable_id,
        project_id: graphNode.project_id,
        source: graphNode.source,
        version: graphNode.version,
        provenance: graphNode.provenance,
      },
    });

    if (status === 'critical') {
      results.summary.critical += 1;
    } else if (status === 'minor') {
      results.summary.minor += 1;
    } else {
      results.summary.perfect += 1;
    }
    results.summary.total += 1;
  }

  // Генерация отчёта
  mkdirSync(LOGS_DIR, { recursive: true });

  const reportLines = [
    '# Round-trip Provenance Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Total checked: ${results.summary.total}`,
    `- Perfect matches: ${results.summary.perfect}`,
    `- Minor issues: ${results.summary.minor}`,
    `- Critical issues: ${results.summary.critical}`,
    '',
    '> **Note:** Minor issues включают ожидаемые различия:',
    '> - `source`: экспорт использует `"vova-petrova"`, граф — более конкретные значения (`"kb"`, `"stories"`)',
    '> - `provenance`: граф упрощает provenance (использует `path` вместо `file`, может не включать `hash`)',
    '',
    '## Terms (10 selected)',
    '',
    '| Slug | Stable ID | Status | Issues |',
    '|------|-----------|--------|--------|',
  ];

  for (const term of results.terms) {
    const statusEmoji = term.status === 'perfect' ? '✅' : term.status === 'critical' ? '❌' : '⚠️';
    const issuesText = term.issues.length > 0 ? term.issues.join('; ') : 'None';
    reportLines.push(`| ${term.slug} | \`${term.stable_id}\` | ${statusEmoji} ${term.status} | ${issuesText} |`);
  }

  reportLines.push('', '## Docs (5 selected)', '', '| Slug | Stable ID | Status | Issues |', '|------|-----------|--------|--------|');

  for (const doc of results.docs) {
    const statusEmoji = doc.status === 'perfect' ? '✅' : doc.status === 'critical' ? '❌' : '⚠️';
    const issuesText = doc.issues.length > 0 ? doc.issues.join('; ') : 'None';
    reportLines.push(`| ${doc.slug} | \`${doc.stable_id}\` | ${statusEmoji} ${doc.status} | ${issuesText} |`);
  }

  reportLines.push('', '## Detailed Comparison', '');

  // Детальное сравнение для Term
  reportLines.push('### Terms Details', '');
  for (const term of results.terms) {
    reportLines.push(`#### ${term.slug} (\`${term.stable_id}\`)`, '');
    reportLines.push('**Export:**', '```json', JSON.stringify(term.export, null, 2), '```', '');
    if (term.graph) {
      reportLines.push('**Graph:**', '```json', JSON.stringify(term.graph, null, 2), '```', '');
    } else {
      reportLines.push('**Graph:** Not found', '');
    }
    if (term.issues.length > 0) {
      reportLines.push('**Issues:**', ...term.issues.map(i => `- ${i}`), '');
    }
    reportLines.push('');
  }

  // Детальное сравнение для Doc
  reportLines.push('### Docs Details', '');
  for (const doc of results.docs) {
    reportLines.push(`#### ${doc.slug} (\`${doc.stable_id}\`)`, '');
    reportLines.push('**Export:**', '```json', JSON.stringify(doc.export, null, 2), '```', '');
    if (doc.graph) {
      reportLines.push('**Graph:**', '```json', JSON.stringify(doc.graph, null, 2), '```', '');
    } else {
      reportLines.push('**Graph:** Not found', '');
    }
    if (doc.issues.length > 0) {
      reportLines.push('**Issues:**', ...doc.issues.map(i => `- ${i}`), '');
    }
    reportLines.push('');
  }

  writeFileSync(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

  console.log(`[round-trip-provenance] Report: ${REPORT_PATH}`);
  console.log(`[round-trip-provenance] Summary: ${results.summary.perfect} perfect, ${results.summary.minor} minor, ${results.summary.critical} critical`);

  if (results.summary.critical > 0) {
    console.error(`[round-trip-provenance] ❌ Критические расхождения обнаружены`);
    process.exit(1);
  } else {
    console.log(`[round-trip-provenance] ✅ Критических расхождений нет`);
  }
}

try {
  main();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}
