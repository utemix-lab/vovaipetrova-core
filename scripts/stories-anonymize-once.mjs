#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, relative } from 'path';
import { globSync } from 'glob';

const STORIES_GLOB = 'docs/stories/**/*.md';
const REPORT_JSON = 'prototype/data/stories-anonymize-report.json';
const REPORT_MD = 'prototype/data/stories-anonymize-report.md';
const APPLY = process.argv.includes('--apply');

const MATCHERS = [
  {
    type: 'name',
    label: 'Дмитрий',
    regex: /\bдмитри[ийя]\b/gi,
    suggestion: 'Заменить «Дмитрий» на «автор»',
    autoReplace: true,
    replacement: 'автор'
  },
  {
    type: 'pronoun',
    label: 'я/мне/меня',
    regex: /\b(я|мне|меня)\b/gi,
    suggestion: 'Переписать фразу на нейтрального автора (без «я/мне/меня»)',
    autoReplace: false
  },
  {
    type: 'possessive',
    label: 'мой/моя/мои',
    regex: /\b(мой|моя|мои)\b/gi,
    suggestion: 'Переписать фразу без личных местоимений (мой/моя/мои)',
    autoReplace: false
  },
  {
    type: 'phrase',
    label: 'мы с <имя>',
    regex: /\bмы\s+с\s+[А-ЯЁA-Z][а-яёa-z]+\b/gi,
    suggestion: 'Переписать «мы с …» на безличную формулировку',
    autoReplace: false
  },
  {
    type: 'opinion',
    label: 'я считаю/думаю/хочу',
    regex: /\bя\s+(считаю|думаю|хочу)\b/gi,
    suggestion: 'Переписать «я считаю/думаю/хочу» на нейтральное описание',
    autoReplace: false
  },
  {
    type: 'opinion',
    label: 'по-моему',
    regex: /\bпо-?моему\b/gi,
    suggestion: 'Переписать «по-моему» на нейтральное описание',
    autoReplace: false
  }
];

function ensureDir(pathname) {
  mkdirSync(dirname(pathname), { recursive: true });
}

function collectMatches(filePath, content) {
  const lines = content.split(/\r?\n/);
  const matches = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const matcher of MATCHERS) {
      matcher.regex.lastIndex = 0;
      let match;
      while ((match = matcher.regex.exec(line)) !== null) {
        matches.push({
          file: filePath,
          line: lineIndex + 1,
          match: match[0],
          type: matcher.type,
          label: matcher.label,
          snippet: line.trim(),
          suggestion: matcher.suggestion,
          autoReplace: matcher.autoReplace,
          replacement: matcher.replacement ?? null
        });
      }
    }
  }

  return matches;
}

function applyReplacements(content) {
  let updated = content;
  for (const matcher of MATCHERS) {
    if (!matcher.autoReplace) continue;
    matcher.regex.lastIndex = 0;
    if (matcher.replacement) {
      updated = updated.replace(matcher.regex, matcher.replacement);
    }
  }
  return updated;
}

function makeMarkdownTable(matches) {
  if (matches.length === 0) {
    return '# Stories anonymization report\n\nПроблемных вхождений не найдено.';
  }

  const rows = [
    '# Stories anonymization report',
    '',
    '| File | Line | Snippet | Suggestion |',
    '| --- | --- | --- | --- |'
  ];

  for (const item of matches) {
    const snippet = item.snippet.replace(/\|/g, '\\|');
    rows.push(
      `| ${item.file} | ${item.line} | ${snippet} | ${item.suggestion} |`
    );
  }

  return rows.join('\n');
}

function main() {
  const files = globSync(STORIES_GLOB, { nodir: true }).sort();
  const reportMatches = [];
  let touched = 0;

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const matches = collectMatches(file, raw);
    if (matches.length > 0) {
      reportMatches.push(...matches.map((m) => ({ ...m, file: file.replace(/\\/g, '/') })));
    }
    if (APPLY) {
      const next = applyReplacements(raw);
      if (next !== raw) {
        writeFileSync(file, next, 'utf8');
        touched += 1;
      }
    }
  }

  ensureDir(REPORT_JSON);
  const payload = {
    generated_at: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'report',
    matches: reportMatches.map((item) => ({
      file: item.file,
      line: item.line,
      match: item.match,
      label: item.label,
      snippet: item.snippet,
      suggestion: item.suggestion,
      autoReplace: item.autoReplace
    }))
  };
  writeFileSync(REPORT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  writeFileSync(REPORT_MD, makeMarkdownTable(reportMatches), 'utf8');

  console.log(
    `[stories-anonymize] ${reportMatches.length} issues recorded in ${REPORT_JSON}`
  );
  if (APPLY) {
    console.log(
      `[stories-anonymize] Auto replacements applied in ${touched} files`
    );
  }
}

main();

