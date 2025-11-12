import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import path from 'path';

function loadAliasData() {
  const raw = readFileSync('docs/nav/tags.yaml', 'utf8');
  const parsed = YAML.parse(raw) || {};
  const aliases = parsed.aliases || {};
  const machineToAlias = new Map();
  const aliasToMachines = new Map();
  for (const [alias, machines] of Object.entries(aliases)) {
    if (!Array.isArray(machines)) continue;
    aliasToMachines.set(alias, machines);
    for (const mt of machines) {
      if (!machineToAlias.has(mt)) machineToAlias.set(mt, alias);
    }
  }
  return { machineToAlias, aliasToMachines };
}

const { machineToAlias, aliasToMachines } = loadAliasData();

function titleCase(str) {
  return str
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('_');
}

function fallbackAlias(machineTag) {
  if (machineToAlias.has(machineTag)) return machineToAlias.get(machineTag);
  const segment = machineTag.includes('/') ? machineTag.split('/')[1] : machineTag;
  return titleCase(segment || machineTag);
}

function normalizeList(list, limit = 5) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const value = String(item || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function extractMachineTagsFromBody(content) {
  const regex = /\u041c\u0435\u0442\u043a\u0438:\s*([^\n]+)/ig; // "РњРµС‚РєРё:"
  const result = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const line = match[1];
    const parts = line.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (/^[a-z]+\/[\w-]+$/i.test(part)) result.push(part.toLowerCase());
    }
  }
  return result;
}

function deriveSummary(title, content, existing) {
  const trimmedExisting = existing ? String(existing).trim() : '';
  const hasLink = /\[[^\]]+\]\([^)]*\)/.test(trimmedExisting);
  const isExistingValid =
    trimmedExisting.length > 0 &&
    !trimmedExisting.startsWith('#') &&
    !/^Метки[:\s]/i.test(trimmedExisting) &&
    !hasLink &&
    trimmedExisting.length <= 240;
  if (isExistingValid) {
    return existing;
  }
  const lines = content.split(/\r?\n/);
  const collected = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (/^>/.test(trimmed)) continue;
    if (/^[-*]\s*$/.test(trimmed)) continue;
    if (/^[-*]\s+#/.test(trimmed)) continue;
    const normalized = trimmed.replace(/^[-*]\s+/, '');
    if (/^Метки[:\s]/i.test(normalized)) continue;
    if (/\[[^\]]+\]\([^)]*\)/.test(normalized)) continue;
    collected.push(normalized);
    if (collected.length >= 3) break;
  }
  const joined = collected.join(' ').trim();
  if (!joined) return existing && existing.trim() ? existing : `${title}.`;
  return joined.length > 200 ? `${joined.slice(0, 197)}вЂ¦` : joined;
}

function ensureH1(title, content) {
  const lines = content.split(/\r?\n/);
  let idx = 0;
  while (idx < lines.length && lines[idx].trim() === '') idx += 1;
  if (idx < lines.length && lines[idx].trim().startsWith('# ')) {
    return { changed: false, content };
  }
  const updated = `# ${title}\n\n` + content.trimStart();
  return { changed: true, content: updated };
}

function cleanupFile(file) {
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data || {};
  let content = parsed.content || '';
  const fixes = new Set();

  const title = fm.title || path.parse(file).name.replace(/[-_]/g, ' ');
  const slug = fm.slug || path.parse(file).name;
  const baseName = path.parse(file).name;
  const isHashSuffix = /-[0-9a-f]{5,}$/i.test(slug || '');
  const isTemplateLike = /^(template|shablon)/i.test(baseName) || baseName.startsWith('kartochka-instrumenta-shablon');

  const { changed: h1Changed, content: withH1 } = ensureH1(title, content);
  if (h1Changed) {
    content = withH1;
    fixes.add('H1');
  }

  const summary = deriveSummary(title, content, fm.summary);
  if (summary !== fm.summary) {
    fm.summary = summary;
    fixes.add('summary');
  }

  if (!fm.status) {
    fm.status = 'draft';
    fixes.add('status');
  }

  const bodyMachine = extractMachineTagsFromBody(content);
  const existingMachine = Array.isArray(fm.machine_tags) ? fm.machine_tags.map(String) : [];
  let machineTags = existingMachine.length > 0 ? existingMachine.map(tag => tag.toLowerCase()) : [];
  if (machineTags.length === 0 && bodyMachine.length > 0) {
    machineTags = bodyMachine;
  }
  if (machineTags.length === 0) {
    const titleLower = (title || '').toLowerCase();
    const summaryLower = (fm.summary || '').toLowerCase();
    for (const [alias, machines] of aliasToMachines.entries()) {
      const normalizedAlias = alias.toLowerCase().replace(/_/g, ' ');
      if (!normalizedAlias) continue;
      if (titleLower.includes(normalizedAlias) || summaryLower.includes(normalizedAlias)) {
        for (const mt of machines) {
          machineTags.push(mt.toLowerCase());
        }
      }
    }
  }
  machineTags = normalizeList(machineTags.map(tag => tag.toLowerCase()), 15);
  const hadMachine = existingMachine.filter(t => String(t || '').trim().length > 0).length > 0;
  if (machineTags.length > 0 && !hadMachine) {
    fm.machine_tags = machineTags;
    fixes.add('machine_tags');
  } else if (!Array.isArray(fm.machine_tags)) {
    fm.machine_tags = hadMachine ? existingMachine : [];
  }

  const hadTags = Array.isArray(fm.tags) && fm.tags.some(tag => String(tag || '').trim().length > 0);
  if (!hadTags && fm.machine_tags && fm.machine_tags.length > 0) {
    const visible = normalizeList(fm.machine_tags.map(tag => fallbackAlias(tag)));
    if (visible.length > 0) {
      fm.tags = visible;
      fixes.add('tags');
    }
  }

  if (isHashSuffix || isTemplateLike) {
    if (!fm.service) {
      fm.service = true;
      fixes.add('service');
    }
    if (fm.tags && fm.tags.length > 0) {
      fm.tags = [];
      fixes.add('tags');
    }
    if (fm.machine_tags && fm.machine_tags.length > 0) {
      fm.machine_tags = [];
      fixes.add('machine_tags');
    }
  }

  const next = matter.stringify(content, fm).replace(/\r?\n/g, '\n');
  if (next !== raw) {
    writeFileSync(file, next, 'utf8');
    return { file, fixes: [...fixes] };
  }
  return null;
}

const files = globSync('docs/**/*.md', { nodir: true });
const report = [];
for (const file of files) {
  const result = cleanupFile(file);
  if (result) report.push(result);
}
writeFileSync('tmp-final-cleanup-report.json', JSON.stringify(report, null, 2));
