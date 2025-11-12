import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import path from 'path';

const DOCS_ROOT = 'docs';
const TAGS_FILE = path.join(DOCS_ROOT, 'nav', 'tags.yaml');
const OUTPUT_JSON = 'tmp-content-stats.json';
const OUTPUT_MD = 'tmp-content-stats.md';

function safeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
}

function increment(map, key) {
  const current = map.get(key) || 0;
  map.set(key, current + 1);
}

function topEntries(map, limit = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function coverage(usedSet, totalSet) {
  if (totalSet.size === 0) return { used: 0, total: 0, percent: 0 };
  const used = [...totalSet].filter(item => usedSet.has(item)).length;
  return {
    used,
    total: totalSet.size,
    percent: Math.round((used / totalSet.size) * 1000) / 10
  };
}

function buildStats() {
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true }).sort();
  const aliasYaml = readFileSync(TAGS_FILE, 'utf8');
  const tagsConfig = YAML.parse(aliasYaml) || {};
  const aliasMap = tagsConfig.aliases || {};
  const aliasKeys = new Set(Object.keys(aliasMap).map(key => key.toLowerCase()));

  const totals = {
    files: 0,
    service: 0,
    ready: 0,
    draft: 0,
    otherStatus: 0
  };
  const missing = {
    summary: [],
    status: []
  };
  const tagsCount = new Map();
  const machineTagsCount = new Map();
  const tagsUsedLower = new Set();

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data || {};

    totals.files += 1;

    const isService = fm.service === true;
    if (isService) totals.service += 1;

    const status = String(fm.status || '').trim().toLowerCase();
    if (status === 'ready') totals.ready += 1;
    else if (status === 'draft') totals.draft += 1;
    else totals.otherStatus += 1;
    if (!status) missing.status.push(file);

    if (!String(fm.summary || '').trim()) {
      missing.summary.push(file);
    }

    const tags = safeArray(fm.tags);
    const machineTags = safeArray(fm.machine_tags);

    for (const tag of tags) {
      const normalized = tag.trim();
      if (!normalized) continue;
      increment(tagsCount, normalized);
      tagsUsedLower.add(normalized.toLowerCase());
    }

    for (const tag of machineTags) {
      const normalized = tag.toLowerCase();
      if (!normalized) continue;
      increment(machineTagsCount, normalized);
    }
  }

  const aliasCoverage = coverage(tagsUsedLower, aliasKeys);
  const result = {
    generatedAt: new Date().toISOString(),
    totals,
    quality: {
      missingSummary: missing.summary.length,
      missingStatus: missing.status.length
    },
    tags: {
      uniqueVisible: tagsCount.size,
      uniqueMachine: machineTagsCount.size,
      topVisible: topEntries(tagsCount),
      topMachine: topEntries(machineTagsCount),
      aliasCoverage
    },
    lint: {
      warnings: 0
    }
  };

  const mdLines = [
    '### Статистика контента',
    '',
    `- Всего файлов: **${totals.files}**`,
    `- Страниц ready: **${totals.ready}**`,
    `- Страниц draft: **${totals.draft}**`,
    `- Служебные материалы: **${totals.service}**`,
    `- Уникальных tags[]: **${tagsCount.size}**`,
    `- Уникальных machine_tags[]: **${machineTagsCount.size}**`,
    `- Покрытие алиасов из \`tags.yaml\`: **${aliasCoverage.used}/${aliasCoverage.total} (${aliasCoverage.percent}%)**`,
    '',
    'Топ видимых тегов:',
    '',
  ];

  if (result.tags.topVisible.length > 0) {
    mdLines.push(
      result.tags.topVisible
        .map(({ name, count }) => `- \`${name}\` — ${count}`)
        .join('\n')
    );
  } else {
    mdLines.push('- нет данных');
  }

  mdLines.push('', 'Топ machine_tags:', '');

  if (result.tags.topMachine.length > 0) {
    mdLines.push(
      result.tags.topMachine
        .map(({ name, count }) => `- \`${name}\` — ${count}`)
        .join('\n')
    );
  } else {
    mdLines.push('- нет данных');
  }

  writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
  writeFileSync(OUTPUT_MD, mdLines.join('\n'));
  return result;
}

buildStats();

