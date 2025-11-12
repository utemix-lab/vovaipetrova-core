import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { globSync } from "glob";

const DOCS_ROOT = "docs";
const ROOT_ABS = process.cwd();

const PERCENT_PATTERN = /%[0-9A-Fa-f]{2}/;

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_`~!@#$%^&*()+=\[\]{}|\\:;"'<>?,./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNotionId(value) {
  return value.replace(/\s+[0-9a-f]{8,}.*$/i, "").trim();
}

function decodePart(value) {
  if (!PERCENT_PATTERN.test(value)) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildIndex() {
  const map = new Map();
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true });
  for (const file of files) {
    const rel = file.replace(/\\+/g, '/');
    const raw = fs.readFileSync(file, 'utf8');
    const data = matter(raw).data || {};
    const candidates = [data.title, data.slug, path.posix.basename(rel, '.md'), rel];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const normalized = normalize(candidate);
      if (normalized && !map.has(normalized)) {
        map.set(normalized, rel);
      }
      const normalizedNoId = normalize(candidate.replace(/\s+[0-9a-f]{8,}.*$/i, ''));
      if (normalizedNoId && !map.has(normalizedNoId)) {
        map.set(normalizedNoId, rel);
      }
    }
  }
  return map;
}

function relPath(from, to) {
  const fromDir = path.posix.dirname(from);
  let rel = path.posix.relative(fromDir, to);
  if (!rel) rel = path.posix.basename(to);
  return rel.replace(/\\+/g, '/');
}

function analyzeLink(url, currentRel, docsIndex) {
  const trimmed = url.trim();
  const result = { action: 'keep', newUrl: trimmed, note: '' };

  if (!trimmed || trimmed.startsWith('http') || trimmed.startsWith('mailto:') || trimmed.startsWith('#')) {
    return result;
  }

  const decoded = decodePart(trimmed.replace(/\\\\/g, '/'));
  const [pathPartOriginal, ...anchorParts] = decoded.split('#');
  const anchor = anchorParts.length ? `#${anchorParts.join('#')}` : '';
  const baseCandidate = stripNotionId(pathPartOriginal);
  const normalizedKey = normalize(baseCandidate);

  if (PERCENT_PATTERN.test(trimmed) && docsIndex.has(normalizedKey)) {
    const target = docsIndex.get(normalizedKey);
    const newUrl = `${relPath(currentRel, target)}${anchor}`;
    if (newUrl !== trimmed) {
      result.action = 'replace';
      result.newUrl = newUrl;
      result.note = 'percent_fixed';
    }
    return result;
  }

  // Local relative file
  const candidate = path.posix.normalize(path.posix.join(path.posix.dirname(currentRel), pathPartOriginal));
  const abs = path.resolve(ROOT_ABS, candidate);
  if (fs.existsSync(abs)) {
    const newUrl = `${relPath(currentRel, candidate)}${anchor}`;
    if (newUrl !== trimmed) {
      result.action = 'replace';
      result.newUrl = newUrl;
      result.note = 'normalized_path';
    }
    return result;
  }

  // Attempt slug lookup for plain text references
  if (docsIndex.has(normalizedKey)) {
    const target = docsIndex.get(normalizedKey);
    const newUrl = `${relPath(currentRel, target)}${anchor}`;
    if (newUrl !== trimmed) {
      result.action = 'replace';
      result.newUrl = newUrl;
      result.note = 'slug_lookup';
    }
    return result;
  }

  // File genuinely missing
  result.action = 'log';
  result.note = 'missing_target';
  return result;
}

function findClosing(text, startIndex, openChar, closeChar) {
  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function replaceLinks(content, currentRel, docsIndex, stats) {
  let result = '';
  let index = 0;

  while (index < content.length) {
    const start = content.indexOf('[', index);
    if (start === -1) {
      result += content.slice(index);
      break;
    }
    if (start > 0 && content[start - 1] === '\\') {
      result += content.slice(index, start + 1);
      index = start + 1;
      continue;
    }
    const labelEnd = findClosing(content, start, '[', ']');
    if (labelEnd === -1 || labelEnd + 1 >= content.length || content[labelEnd + 1] !== '(') {
      result += content.slice(index, start + 1);
      index = start + 1;
      continue;
    }
    const isImage = start > 0 && content[start - 1] === '!';
    const parenStart = labelEnd + 1;
    const urlStart = parenStart + 1;
    const urlEnd = findClosing(content, parenStart, '(', ')');
    if (urlEnd === -1) {
      result += content.slice(index, labelEnd + 1);
      index = labelEnd + 1;
      continue;
    }

    result += content.slice(index, isImage ? start - 1 : start);
    const label = content.slice(start + 1, labelEnd);
    const url = content.slice(urlStart, urlEnd);
    const analysis = analyzeLink(url, currentRel, docsIndex);

    if (analysis.action === 'replace') {
      if (analysis.note === 'percent_fixed') stats.linksPercent += 1;
      else stats.linksNormalized += 1;
      result += (isImage ? '!' : '') + `[${label}](${analysis.newUrl})`;
    } else {
      if (analysis.action === 'log') {
        stats.missing.push({ file: currentRel, label, url });
      }
      result += (isImage ? '!' : '') + `[${label}](${url})`;
    }
    index = urlEnd + 1;
  }

  return result;
}

function processFile(file, docsIndex) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const rel = file.replace(/\\+/g, '/');
  const stats = { linksPercent: 0, linksNormalized: 0, missing: [] };
  const updated = replaceLinks(parsed.content, rel, docsIndex, stats);
  if (updated === parsed.content) return null;
  const finalContent = matter.stringify(updated, parsed.data || {});
  fs.writeFileSync(file, finalContent.replace(/\r?\n/g, '\n'), 'utf8');
  return { file: rel, ...stats };
}

function main() {
  const index = buildIndex();
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true });
  const reports = [];
  const missing = [];
  for (const file of files) {
    const report = processFile(file, index);
    if (!report) continue;
    reports.push(report);
    missing.push(...report.missing);
  }
  const summary = {
    totalFilesChanged: reports.length,
    totalPercentFixed: reports.reduce((acc, r) => acc + r.linksPercent, 0),
    totalNormalized: reports.reduce((acc, r) => acc + r.linksNormalized, 0),
    missingTargets: missing
  };
  console.log(JSON.stringify(summary, null, 2));
}

main();
