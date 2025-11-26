// scripts/lint-docs.mjs
import { readFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { resolve, dirname } from 'path';

const ROOT = 'docs';
const STRICT = process.argv.includes('--strict');

// Пороги для lint проверок
const SUMMARY_MAX_LENGTH = 300; // Максимальная длина summary
const CONTENT_MAX_LENGTH = 50000; // Максимальная длина контента (предупреждение)
const CONTENT_CRITICAL_LENGTH = 100000; // Критическая длина контента (ошибка)

function findDuplicateSlugs(files) {
  const slugToFiles = new Map();
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const fm = matter(raw).data || {};
    const slug = fm.slug || '';
    if (!slug) continue;
    const list = slugToFiles.get(slug) || [];
    list.push(f);
    slugToFiles.set(slug, list);
  }
  return [...slugToFiles.entries()].filter(([, list]) => list.length > 1);
}

const VALID_STATUS = new Set(['draft', 'review', 'ready']);

function getFirstContentLine(body) {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    return line.trim();
  }
  return '';
}

function containsForbiddenStoryPhrases(body) {
  const phrases = [
    'дмитрий',
    'я ',
    'я,',
    ' мне ',
    ' меня',
    ' мой',
    ' моя',
    ' мои',
    'я считаю',
    'я думаю',
    'я хочу',
    'по-моему',
    'по моему'
  ];
  // Примечание: "мы" разрешено использовать в stories
  const normalized = body.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase));
}

function lintFile(file) {
  const errors = [];
  const warnings = [];
  const raw = readFileSync(file, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const body = parsed.content || '';
  const isService = fm.service === true;
  const status = fm.status;
  const normalizedPath = file.replace(/\\/g, '/');
  const isStory = normalizedPath.startsWith(`${ROOT}/stories/`);

  if (!fm.title) errors.push('missing title');
  if (!fm.slug) errors.push('missing slug');
  if (!isService) {
    const summary = fm.summary ? String(fm.summary).trim() : '';
    if (summary.length === 0) {
      if (STRICT) {
        errors.push('missing summary (required for non-service pages)');
      } else {
        warnings.push('warn: missing summary');
      }
    } else if (summary.length > SUMMARY_MAX_LENGTH) {
      warnings.push(`warn: summary too long (${summary.length} chars, max ${SUMMARY_MAX_LENGTH})`);
    }
  }
  if (!isService) {
    if (!Array.isArray(fm.tags) || fm.tags.length === 0) {
      if (STRICT) errors.push('missing tags[]');
      else warnings.push('warn: missing tags[]');
    }
    if (!Array.isArray(fm.machine_tags) || fm.machine_tags.length === 0) {
      if (STRICT) errors.push('missing machine_tags[]');
      else warnings.push('warn: missing machine_tags[]');
    }
  }

  if (status == null || status === '') {
    warnings.push('warn: missing status (draft|review|ready)');
  } else if (!VALID_STATUS.has(String(status).toLowerCase())) {
    warnings.push(`warn: invalid status "${status}" (expected draft|review|ready)`);
  }

  // Flag legacy encoded Notion links (percent-encoded .md)
  const legacyLinkRe = /\(([^)]+%[0-9A-Fa-f]{2}[^)]*\.md)\)/g;
  if (legacyLinkRe.test(body)) errors.push('contains legacy percent-encoded .md links');

  if (!isService) {
    const firstLine = getFirstContentLine(body);
    if (!firstLine.startsWith('# ')) {
      warnings.push('warn: missing leading H1 (# Heading)');
    }

    const linkRe = /(?<!\!)\[[^\]]+\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRe.exec(body)) !== null) {
      const target = match[1];
      const pathPart = target.split('#')[0].split('?')[0];
      if (!pathPart.toLowerCase().endsWith('.md')) continue;
      if (target.includes('://')) {
        warnings.push(`warn: .md link should be relative (${target})`);
      }
      if (target.includes('%')) {
        warnings.push(`warn: .md link contains percent-encoding (${target})`);
      }
      if (target.startsWith('/')) {
        warnings.push(`warn: .md link should not start with "/" (${target})`);
      }
    }

    const imgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
    while ((match = imgRe.exec(body)) !== null) {
      const target = match[1];
      if (/^(https?:|data:|#)/i.test(target)) continue;
      const normalized = target.split('#')[0].split('?')[0];
      const absPath = resolve(dirname(file), normalized);
      const docsRoot = resolve(process.cwd(), ROOT);
      if (!absPath.startsWith(docsRoot)) {
        warnings.push(`warn: image path escapes docs/ (${target})`);
        continue;
      }
      if (!existsSync(absPath)) {
        warnings.push(`warn: image not found (${target})`);
      }
    }
  }

  if (isStory && containsForbiddenStoryPhrases(body)) {
    warnings.push(
      'warn: Истории ведём от нейтрального автора; используйте «автор» или безличные формулировки'
    );
  }

  // Проверка длины контента
  if (!isService) {
    const contentLength = body.trim().length;
    if (contentLength > CONTENT_CRITICAL_LENGTH) {
      errors.push(`content too long (${contentLength} chars, critical limit ${CONTENT_CRITICAL_LENGTH})`);
    } else if (contentLength > CONTENT_MAX_LENGTH) {
      warnings.push(`warn: content very long (${contentLength} chars, recommended max ${CONTENT_MAX_LENGTH})`);
    }
  }

  // PII check for docs/ and stories/
  const piiCheck = containsPII(body, file);
  if (piiCheck.found) {
    const message = `warn: PII detected (${piiCheck.kind}): ${piiCheck.match.substring(0, 50)}... Use <user>, <email>, or <phone> instead`;
    if (isStory) {
      errors.push(message); // Blocking for stories
    } else {
      warnings.push(message); // Warning for other docs
    }
  }

  return {
    errors,
    warnings,
    status: status ? String(status).toLowerCase() : null
  };
}

function containsPII(body, filePath = '') {
  // Обновлено: расширены паттерны PII для лучшего обнаружения (2025-11-20)
  const patterns = [
    {
      name: 'windows_user_path',
      regex: /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)/g
    },
    {
      name: 'unix_home_path',
      regex: /\/(?:home|Users)\/([A-Za-z0-9.-]+)/g
    },
    {
      name: 'email',
      regex: /[A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
    },
    {
      name: 'phone',
      regex: /\+?\d{1,3}[\s\-()]\d{2,4}[\s\-()]\d{2,4}[\s\-()]?\d{2,4}/g
    },
    {
      name: 'phone_compact',
      regex: /\b\d{10,15}\b/g // Компактный формат без разделителей (может быть ложным срабатыванием)
    },
    {
      name: 'full_name_russian',
      regex: /\b([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\b/g // Полное имя на русском
    },
    {
      name: 'full_name_english',
      regex: /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g, // Полное имя на английском (минимум 3 символа в каждом слове)
      // Исключаем технические термины и названия продуктов
      excludePatterns: [
        /Think Tank/i,
        /After Effects/i,
        /Single Source/i,
        /Cursor Bugbot/i,
        /Gateway Watcher/i,
        /Static First/i,
        /Docker Compose/i,
        /Stable Diffusion/i,
        /Frame Interpolation/i,
        /Notion Integrations/i,
        /Adobe Character/i,
        /Knowledge Base/i,
        /Open Source/i,
        /Core Memory/i,
        /Issues View/i,
        /Notion Import/i,
        /Docs Path/i,
        /Eval Harness/i,
        /Compatibility Tracker/i,
        /Requires Review/i,
        /Deploy Pages/i,
        /Notion Briefs/i,
        /Hugging Face/i
      ]
    },
    {
      name: 'api_key_pattern',
      regex: /(?:api[_-]?key|secret|token|password|pwd)\s*[:=]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi
    },
    {
      name: 'github_token',
      regex: /ghp_[A-Za-z0-9]{36}/g
    },
    {
      name: 'notion_token',
      regex: /(?:secret_|ntn_)[A-Za-z0-9_-]{32,}/g
    },
    {
      name: 'aws_access_key',
      regex: /AKIA[0-9A-Z]{16}/g
    },
    {
      name: 'credit_card',
      regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g
    },
    {
      name: 'ip_address',
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g // Может быть примером или версией
    }
  ];

  // Исключения (уже санитизированные или примеры)
  // Обновлено: расширен список исключений для уменьшения ложных срабатываний
  const exclusions = [
    /<user>/i,
    /<email>/i,
    /<phone>/i,
    /<name>/i,
    /<path>/i,
    /placeholder/i,
    /example/i,
    /test@/i,
    /test@example/i,
    /user@example/i,
    /admin@localhost/i,
    /localhost/i,
    /127\.0\.0\.1/i,
    /0\.0\.0\.0/i,
    /192\.168\./i, // Частные IP сети (обычно примеры)
    /10\./i, // Частные IP сети
    /172\.(1[6-9]|2[0-9]|3[01])\./i, // Частные IP сети
    /john\.doe@example\.com/i,
    /jane\.doe@example\.com/i,
    /test@test\.com/i,
    /v?\d+\.\d+\.\d+/i, // Версии типа 1.2.3
    /[0-9a-f]{32,}/i, // Хеши (MD5, SHA256 и т.д.)
    /github\.com/i,
    /gitlab\.com/i,
    /bitbucket\.org/i,
    // Примеры путей в документации (с многоточием или в примерах кода)
    /C:\\Users\\.{2,}/i, // C:\Users\...
    /\/home\/\.{2,}/i, // /home/...
    // Исключения для технических терминов, которые могут быть приняты за имена
    /Think Tank/i,
    /After Effects/i,
    /Static First/i,
    /Docker Compose/i,
    /Stable Diffusion/i,
    /Frame Interpolation/i,
    /Notion Integrations/i,
    /Adobe Character/i,
    /Knowledge Base/i,
    /Open Source/i,
    /Core Memory/i,
    /Issues View/i,
    /Notion Import/i,
    /Docs Path/i,
    /Eval Harness/i,
    /Compatibility Tracker/i,
    /Requires Review/i,
    /Deploy Pages/i,
    /Hugging Face/i,
    /Safety Rails/i,
    /Setup Node/i,
    /Pull Request/i,
    /Model Context/i,
    /Save Prompt/i,
    /Internal Integration/i,
    /Upstream Source/i,
    /Explorer/i,
    /Letta Cloud/i,
    /Protocol Servers/i
  ];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(body)) !== null) {
      // Skip matches in code blocks (```...```)
      const beforeMatch = body.substring(0, match.index);
      const codeBlockCount = (beforeMatch.match(/```/g) || []).length;
      if (codeBlockCount % 2 === 1) continue; // Inside code block

      // Skip if already sanitized or in exclusions
      const matchedText = match[0];
      if (exclusions.some(exclusion => exclusion.test(matchedText))) {
        continue;
      }

      // Проверяем исключения для конкретного паттерна (например, для full_name_english)
      if (pattern.excludePatterns && pattern.excludePatterns.some(exclude => exclude.test(matchedText))) {
        continue;
      }

      return { found: true, kind: pattern.name, match: matchedText };
    }
  }

  return { found: false };
}

function main() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true })
    .filter(f => {
      // Исключаем тестовые файлы с намеренными нарушениями
      // Нормализуем путь для кроссплатформенной совместимости
      const normalizedPath = f.replace(/\\/g, '/');
      return !normalizedPath.includes('test-guardrails/bad-examples/');
    });
  let totalIssues = 0;
  let draftCount = 0;
  for (const f of files) {
    const { errors, warnings, status } = lintFile(f);
    if (status === 'draft') {
      draftCount += 1;
      console.log(`ℹ️  ${f}`);
      console.log('  - info: status=draft');
    }
    if (errors.length > 0 || warnings.length > 0) {
      const icon = errors.length > 0 ? '⚠️ ' : 'ℹ️ ';
      console.log(`${icon} ${f}`);
      for (const w of warnings) console.log(`  - ${w}`);
      for (const e of errors) console.log(`  - ${e}`);
      totalIssues += errors.length;
    }
  }

  const dups = findDuplicateSlugs(files);
  if (dups.length > 0) {
    console.log('⚠️  duplicate slugs detected:');
    for (const [slug, list] of dups) {
      console.log(`  - ${slug}:`);
      for (const f of list) console.log(`    · ${f}`);
    }
    totalIssues += dups.length;
  }

  if (totalIssues === 0) {
    console.log('✅ docs lint passed with no blocking issues');
    if (draftCount > 0) {
      console.log(`ℹ️  draft documents detected: ${draftCount}`);
    }
    process.exit(0);
  } else {
    console.log(`❌ docs lint found ${totalIssues} issues`);
    process.exit(1);
  }
}

main();


