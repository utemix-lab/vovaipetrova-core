#!/usr/bin/env node
/**
 * Extractor Stories Terms v2.1: Stories→KB intake с анти-дублем и цитатами
 *
 * Версия 2.1 улучшения:
 * - Агрегация кандидатов по slug (анти-дубль): разные термины с одинаковым slug объединяются
 * - Сохранение 1-2 цитат контекста для каждого кандидата
 * - Задач не плодится: одна Issue на slug, даже если найдено несколько терминов с одинаковым slug
 *
 * Версия 2.0:
 * - Морфология русского языка: извлечение терминов в разных падежах и формах
 * - Улучшенные границы слов: более точное определение терминов
 * - Лучшая фильтрация: исключение ложных срабатываний
 * - Улучшенный контекст: более релевантные примеры использования
 *
 * Извлекает потенциальные термины из измененных файлов Stories в PR и создает:
 * 1. Файл candidates_kb.json с кандидатами терминов (агрегированными по slug)
 * 2. GitHub Issues для каждого slug: "KB: добавить термин <slug>" (максимум одна Issue на slug)
 *
 * Использование:
 *   node scripts/extractor-stories-terms.mjs [--pr=<number>] [--base=main] [--dry-run] [--no-issues] [--no-morphology]
 *
 * Переменные окружения:
 *   GITHUB_TOKEN - токен для доступа к GitHub API
 *   GITHUB_REPO - репозиторий (по умолчанию: utemix-lab/vovaipetrova-core)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync, spawnSync } from 'child_process';
import path from 'path';
import matter from 'gray-matter';
import slugify from 'slugify';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const CANDIDATES_OUTPUT = 'prototype/data/candidates_kb.json';
const STORIES_DIR = 'docs/stories';
const PAGES_JSON_PATH = 'prototype/data/pages.json';
const KB_INDEX_PATH = 'prototype/data/kb-index.json';

// Минимальная длина термина (в символах)
const MIN_TERM_LENGTH = 3;
// Максимальная длина термина (в символах)
const MAX_TERM_LENGTH = 50;

// Исключения: слова, которые не должны быть терминами
const EXCLUDED_TERMS = new Set([
  'что', 'как', 'для', 'это', 'или', 'если', 'когда', 'где', 'кто', 'чем',
  'the', 'and', 'or', 'but', 'for', 'with', 'from', 'into', 'onto', 'upon',
  'автор', 'машина', 'файл', 'страница', 'документ', 'проект', 'система',
  'данные', 'информация', 'контент', 'структура', 'формат', 'шаблон',
  'скрипт', 'код', 'программа', 'функция', 'метод', 'класс', 'объект',
  'github', 'notion', 'cursor', 'copilot', 'codegpt', 'openrouter',
  'markdown', 'yaml', 'json', 'html', 'css', 'js', 'ts', 'mjs',
  'pr', 'ci', 'cd', 'api', 'url', 'uri', 'id', 'uuid', 'md5', 'sha',
  'http', 'https', 'www', 'com', 'org', 'net', 'ru', 'io',
  'true', 'false', 'null', 'undefined', 'nan', 'infinity'
]);

// Паттерны для определения потенциальных терминов
const TERM_PATTERNS = [
  // Заглавные слова (TitleCase или UPPERCASE)
  /\b[A-ZА-ЯЁ][a-zа-яё]{2,}\b/g,
  // Слова с дефисами (kebab-case)
  /\b[a-zа-яё]+(?:-[a-zа-яё]+)+\b/g,
  // Слова с подчеркиваниями (snake_case)
  /\b[a-zа-яё]+(?:_[a-zа-яё]+)+\b/g,
  // Аббревиатуры (2-5 заглавных букв)
  /\b[A-ZА-ЯЁ]{2,5}\b/g
];

function log(message) {
  console.log(`[extractor-terms] ${message}`);
}

function parseArgs() {
  const args = {
    pr: null,
    base: 'main',
    dryRun: false,
    noIssues: false,
    noMorphology: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--pr=')) {
      args.pr = arg.split('=', 2)[1];
    } else if (arg.startsWith('--base=')) {
      args.base = arg.split('=', 2)[1];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--no-issues') {
      args.noIssues = true;
    } else if (arg === '--no-morphology') {
      args.noMorphology = true;
    }
  }

  return args;
}

/**
 * Получает список измененных файлов Stories из PR или git diff
 */
function getChangedStoriesFiles(prNumber, baseRef) {
  let files = [];

  if (prNumber) {
    // Получаем файлы из PR через GitHub API
    try {
      const command = `gh pr view ${prNumber} --json files --jq '.files[].path'`;
      const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      files = output.trim().split('\n').filter(Boolean);
    } catch (error) {
      log(`⚠️  Не удалось получить файлы из PR #${prNumber}: ${error.message}`);
      log('   Пробую через git diff...');
      files = getChangedFilesFromGit(baseRef);
    }
  } else {
    // Получаем файлы из git diff
    files = getChangedFilesFromGit(baseRef);
  }

  // Фильтруем только файлы Stories
  return files.filter(file =>
    file.startsWith(STORIES_DIR) &&
    file.endsWith('.md') &&
    !file.includes('CONCEPT') &&
    !file.includes('README') &&
    !file.includes('SHARED_CONTEXT') &&
    !file.includes('REVIEW') &&
    !file.includes('GITHUB_INSTRUCTIONS') &&
    !file.includes('OPUS4_ROLE') &&
    !file.includes('QUICK_START')
  );
}

/**
 * Получает список измененных файлов через git diff
 */
function getChangedFilesFromGit(baseRef) {
  try {
    const command = `git diff --name-only ${baseRef}...HEAD`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    log(`⚠️  Не удалось получить файлы из git diff: ${error.message}`);
    return [];
  }
}

/**
 * Извлекает текст из файла Stories (игнорируя front matter и code blocks)
 */
function extractTextFromStory(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    let content = parsed.content;

    // Удаляем code blocks
    content = content.replace(/```[\s\S]*?```/g, ' ');
    // Удаляем inline code
    content = content.replace(/`[^`\n]*`/g, ' ');
    // Удаляем ссылки [text](url)
    content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Удаляем изображения ![alt](url)
    content = content.replace(/!\[([^\]]*)\]\([^)]+\)/g, ' ');
    // Удаляем HTML комментарии
    content = content.replace(/<!--[\s\S]*?-->/g, ' ');

    return content;
  } catch (error) {
    log(`⚠️  Не удалось прочитать файл ${filePath}: ${error.message}`);
    return '';
  }
}

/**
 * Проверяет, является ли слово русским
 */
function isRussianWord(word) {
  return /[\u0400-\u04FF]/u.test(word);
}

/**
 * Проверяет, является ли символ согласной буквой
 */
function isConsonant(char) {
  if (!char) return false;
  const consonants = 'бвгджзйклмнпрстфхцчшщ';
  return consonants.includes(char.toLowerCase());
}

/**
 * Генерирует морфологические формы для русского слова (v2)
 * Используется для нормализации терминов к именительному падежу
 */
function generateMorphologicalForms(word) {
  if (!isRussianWord(word) || word.length < 3) {
    return [word.toLowerCase()];
  }

  const forms = new Set([word.toLowerCase()]);
  const lowerWord = word.toLowerCase();

  // Родительный падеж
  if (lowerWord.endsWith('а')) {
    const beforeA = lowerWord[lowerWord.length - 2];
    if (beforeA && 'гкхжчшщц'.includes(beforeA)) {
      forms.add(lowerWord.slice(0, -1) + 'и');
    } else {
      forms.add(lowerWord.slice(0, -1) + 'ы');
    }
  } else if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ия');
    forms.add(lowerWord.slice(0, -2) + 'ий');
  } else if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'а');
  } else if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'я');
  } else if (lowerWord.endsWith('ь')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
    forms.add(lowerWord.slice(0, -1) + 'ей');
  } else if (lowerWord.endsWith('й')) {
    forms.add(lowerWord.slice(0, -1) + 'я');
    forms.add(lowerWord.slice(0, -1) + 'ев');
  } else if (isConsonant(lowerWord[lowerWord.length - 1])) {
    forms.add(lowerWord + 'а');
    forms.add(lowerWord + 'ов');
  }

  // Дательный падеж
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'е');
  } else if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ию');
  } else if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'у');
  } else if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'ю');
  } else if (lowerWord.endsWith('ь')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('й')) {
    forms.add(lowerWord.slice(0, -1) + 'ю');
  } else if (isConsonant(lowerWord[lowerWord.length - 1])) {
    forms.add(lowerWord + 'у');
  }

  // Винительный падеж
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'у');
  } else if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'ю');
  } else if (lowerWord.endsWith('й')) {
    forms.add(lowerWord.slice(0, -1) + 'я');
  }

  // Творительный падеж
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'ой');
    forms.add(lowerWord.slice(0, -1) + 'ою');
  } else if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'ей');
    forms.add(lowerWord.slice(0, -1) + 'ёй');
  } else if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ием');
  } else if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'ом');
  } else if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'ем');
  } else if (lowerWord.endsWith('ь')) {
    forms.add(lowerWord.slice(0, -1) + 'ью');
  } else if (lowerWord.endsWith('й')) {
    forms.add(lowerWord.slice(0, -1) + 'ем');
  } else if (isConsonant(lowerWord[lowerWord.length - 1])) {
    forms.add(lowerWord + 'ом');
  }

  // Предложный падеж
  if (lowerWord.endsWith('а')) {
    forms.add(lowerWord.slice(0, -1) + 'е');
  } else if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -2) + 'ии');
  } else if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'е');
  } else if (lowerWord.endsWith('е') && !lowerWord.endsWith('ие')) {
    forms.add(lowerWord.slice(0, -1) + 'е');
  } else if (lowerWord.endsWith('ь')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('й')) {
    forms.add(lowerWord.slice(0, -1) + 'е');
  } else if (isConsonant(lowerWord[lowerWord.length - 1])) {
    forms.add(lowerWord + 'е');
  }

  // Множественное число
  if (lowerWord.endsWith('а')) {
    const beforeA = lowerWord[lowerWord.length - 2];
    if (beforeA && 'гкхжчшщц'.includes(beforeA)) {
      forms.add(lowerWord.slice(0, -1) + 'и');
    } else {
      forms.add(lowerWord.slice(0, -1) + 'ы');
    }
  } else if (lowerWord.endsWith('я')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('о')) {
    forms.add(lowerWord.slice(0, -1) + 'а');
  } else if (lowerWord.endsWith('е')) {
    forms.add(lowerWord.slice(0, -1) + 'я');
  } else if (lowerWord.endsWith('ь')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (lowerWord.endsWith('й')) {
    forms.add(lowerWord.slice(0, -1) + 'и');
  } else if (isConsonant(lowerWord[lowerWord.length - 1])) {
    forms.add(lowerWord + 'ы');
  }

  // Для составных терминов
  if (lowerWord.includes(' ')) {
    const parts = lowerWord.split(' ');
    if (parts.length === 2) {
      const [first, second] = parts;
      const secondForms = generateMorphologicalForms(second);
      secondForms.forEach(f2 => {
        if (f2 !== second) {
          forms.add(`${first} ${f2}`);
        }
      });
      if (isRussianWord(first)) {
        const firstForms = generateMorphologicalForms(first);
        firstForms.forEach(f1 => {
          if (f1 !== first) {
            forms.add(`${f1} ${second}`);
          }
        });
      }
    }
  }

  return Array.from(forms);
}

/**
 * Нормализует термин к именительному падежу (если возможно)
 * Для русских слов пытается найти базовую форму
 */
function normalizeToNominative(term, existingKBTerms) {
  const lowerTerm = term.toLowerCase();

  // Если термин уже в именительном падеже (есть в KB), возвращаем его
  if (existingKBTerms && existingKBTerms.has(lowerTerm)) {
    return term;
  }

  // Для русских слов пытаемся найти базовую форму через морфологию
  if (isRussianWord(term) && !term.includes('-') && !term.includes('_')) {
    // Генерируем все возможные формы и проверяем, есть ли среди них каноническая
    const forms = generateMorphologicalForms(term);
    for (const form of forms) {
      if (existingKBTerms && existingKBTerms.has(form)) {
        // Нашли каноническую форму - возвращаем её
        return form;
      }
    }
  }

  return term;
}

/**
 * Загружает существующие термины из KB для нормализации
 */
function loadExistingKBTerms() {
  const terms = new Set();

  try {
    // Загружаем из pages.json
    if (existsSync(PAGES_JSON_PATH)) {
      const pages = JSON.parse(readFileSync(PAGES_JSON_PATH, 'utf8'));
      if (Array.isArray(pages)) {
        pages.forEach(page => {
          if (page.service) return;
          if ((page.machine_tags || []).some(tag => tag.startsWith('product/kb'))) {
            if (page.slug) terms.add(page.slug.toLowerCase());
            if (page.title) terms.add(page.title.toLowerCase());
          }
        });
      }
    }

    // Загружаем из kb-index.json
    if (existsSync(KB_INDEX_PATH)) {
      const kbIndex = JSON.parse(readFileSync(KB_INDEX_PATH, 'utf8'));
      if (kbIndex.index) {
        for (const pages of Object.values(kbIndex.index)) {
          pages.forEach(page => {
            if (page.slug) terms.add(page.slug.toLowerCase());
            if (page.title) terms.add(page.title.toLowerCase());
          });
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки загрузки
  }

  return terms;
}

/**
 * Извлекает потенциальные термины из текста (v2 с улучшенными границами слов)
 */
function extractTerms(text, args, existingKBTerms) {
  const terms = new Map(); // normalized term -> original term

  // Улучшенные паттерны с более точными границами слов
  const improvedPatterns = [
    // Заглавные слова (TitleCase) - только если это начало слова
    /\b(?<!['"`])([A-ZА-ЯЁ][a-zа-яё]{2,})\b(?!['"`])/g,
    // Слова с дефисами (kebab-case)
    /\b([a-zа-яё]+(?:-[a-zа-яё]+)+)\b/g,
    // Слова с подчеркиваниями (snake_case)
    /\b([a-zа-яё]+(?:_[a-zа-яё]+)+)\b/g,
    // Аббревиатуры (2-5 заглавных букв, не в начале предложения)
    /(?<!^|\s)([A-ZА-ЯЁ]{2,5})\b/g
  ];

  // Применяем паттерны для поиска терминов
  for (const pattern of improvedPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const term = match[1] || match[0];
      const normalized = term.toLowerCase().trim();

      // Фильтруем по длине
      if (normalized.length < MIN_TERM_LENGTH || normalized.length > MAX_TERM_LENGTH) {
        continue;
      }

      // Исключаем известные слова
      if (EXCLUDED_TERMS.has(normalized)) {
        continue;
      }

      // Исключаем числа
      if (/^\d+$/.test(normalized)) {
        continue;
      }

      // Исключаем email и URL
      if (normalized.includes('@') || normalized.includes('://') || normalized.includes('www.')) {
        continue;
      }

      // Нормализуем к именительному падежу (для русских слов)
      let normalizedTerm = normalized;
      if (!args.noMorphology && isRussianWord(normalized) && existingKBTerms) {
        normalizedTerm = normalizeToNominative(normalized, existingKBTerms);
      }

      // Сохраняем оригинальный термин и нормализованный
      if (!terms.has(normalizedTerm)) {
        terms.set(normalizedTerm, term);
      }
    }
  }

  return Array.from(terms.values());
}

function escapeRegexForTerm(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Создает slug для термина
 */
function createSlug(term) {
  return slugify(term, {
    lower: true,
    strict: true,
    locale: 'ru',
    trim: true
  });
}

/**
 * Проверяет, существует ли уже страница KB для термина
 */
function termExistsInKB(slug) {
  try {
    // Проверяем в kb-index.json
    if (existsSync('prototype/data/kb-index.json')) {
      const kbIndex = JSON.parse(readFileSync('prototype/data/kb-index.json', 'utf8'));
      if (kbIndex.index) {
        for (const pages of Object.values(kbIndex.index)) {
          if (pages.some(page => page.slug === slug)) {
            return true;
          }
        }
      }
    }

    // Проверяем в pages.json
    if (existsSync('prototype/data/pages.json')) {
      const pages = JSON.parse(readFileSync('prototype/data/pages.json', 'utf8'));
      if (Array.isArray(pages)) {
        if (pages.some(page => page.slug === slug && (page.machine_tags || []).some(tag => tag.startsWith('product/kb')))) {
          return true;
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки проверки
  }

  return false;
}

/**
 * Загружает существующие Issues из GitHub для проверки дубликатов
 * Возвращает Map: slug -> issue_url
 */
async function loadExistingIssues() {
  const issues = new Map();

  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN не установлен, пропускаю проверку существующих Issues');
    return issues;
  }

  try {
    // Ищем Issues с меткой kb и заголовком "KB: добавить термин"
    // Используем --label для поиска по метке (может быть kb или content/kb)
    const ghArgs = [
      'issue', 'list',
      '--repo', GITHUB_REPO,
      '--label', 'kb',
      '--state', 'all',
      '--limit', '500',
      '--json', 'title,number,url'
    ];
    const res = spawnSync('gh', ghArgs, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, GITHUB_TOKEN }
    });

    if (res.error || res.status !== 0) {
      log(`⚠️  Не удалось загрузить существующие Issues: ${res.error?.message || res.stderr}`);
      return issues;
    }

    const issuesData = JSON.parse(res.stdout || '[]');
    for (const issue of issuesData) {
      // Парсим slug из заголовка "KB: добавить термин <slug>"
      const match = issue.title.match(/^KB: добавить термин (.+)$/);
      if (match) {
        const slug = match[1].trim();
        issues.set(slug, issue.url);
      }
    }

    return issues;
  } catch (error) {
    log(`⚠️  Ошибка при загрузке существующих Issues: ${error.message}`);
    return issues;
  }
}

/**
 * Создает GitHub Issue для термина
 */
async function createIssueForTerm(term, slug, context, args) {
  if (args.noIssues || args.dryRun) {
    log(`[DRY] Would create issue: "KB: добавить термин ${slug}"`);
    return null;
  }

  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN не установлен, пропускаю создание Issue');
    return null;
  }

  try {
    const title = `KB: добавить термин ${slug}`;
    const bodyArr = [
      `## Термин: ${term}`,
      '',
      `**Slug**: \`${slug}\``,
      '',
      '**Контекст появления**:',
      `Термин найден в файлах Stories:`,
      ...context.files.map(f => `- \`${f}\``),
      ''
    ];

    if (context.originalForms && context.originalForms.length > 0 && context.originalForms.length > 1) {
      bodyArr.push('**Найденные формы термина:**');
      bodyArr.push(context.originalForms.map(f => `- \`${f}\``).join('\n'));
      bodyArr.push('');
    }

    if (context.contexts && context.contexts.length > 0) {
      bodyArr.push('**Примеры контекста (1-2):**');
      for (const snippet of (context.contexts || [])) {
        // Добавляем как блок-цитату, экранируя лишние символы
        const safe = snippet.replace(/\n/g, ' ');
        bodyArr.push('> ' + safe);
        bodyArr.push('');
      }
    }

    bodyArr.push('**Действия**:');
    bodyArr.push('- [ ] Создать страницу KB для термина');
    bodyArr.push('- [ ] Добавить определение');
    bodyArr.push('- [ ] Добавить примеры использования');
    bodyArr.push('- [ ] Связать с другими терминами (если применимо)');
    bodyArr.push('');
    bodyArr.push(`_Автоматически создано из PR #${context.prNumber || 'N/A'}_`);

    const body = bodyArr.join('\n');

    // Use spawnSync to avoid shell quoting issues with multiline body or backticks
    // Call the 'gh' CLI directly with argument array so no shell interpolation occurs.
    const ghArgs = [
      'issue', 'create',
      '--repo', GITHUB_REPO,
      '--title', title,
      '--body', body,
      '--label', 'kb,content/kb'
    ];

    const res = spawnSync('gh', ghArgs, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, GITHUB_TOKEN }
    });

    if (res.error) {
      throw res.error;
    }
    if (res.status !== 0) {
      throw new Error(res.stderr || `gh exited with code ${res.status}`);
    }

    log(`✅ Создан Issue для термина "${term}" (${slug})`);
    return (res.stdout || '').trim();
  } catch (error) {
    log(`⚠️  Не удалось создать Issue для термина "${term}": ${error.message}`);
    return null;
  }
}

/**
 * Основная функция
 */
async function main() {
  const args = parseArgs();

  log('Извлечение терминов из Stories...');

  // Получаем измененные файлы Stories
  const changedFiles = getChangedStoriesFiles(args.pr, args.base);

  if (changedFiles.length === 0) {
    log('ℹ️  Нет измененных файлов Stories в PR');
    process.exit(0);
  }

  log(`Найдено ${changedFiles.length} измененных файлов Stories`);

  if (args.dryRun) {
    log('[DRY RUN] Режим тестирования - файлы и Issues не будут созданы');
  }

  // Загружаем существующие термины KB для нормализации
  const existingKBTerms = loadExistingKBTerms();
  log(`Загружено ${existingKBTerms.size} существующих терминов из KB для нормализации`);

  // Извлекаем термины из каждого файла
  // v2.1: Агрегируем по slug (анти-дубль) вместо normalized term
  const allTerms = new Map(); // slug -> { count, files, slug, originalForms, canonicalTerm }

  for (const file of changedFiles) {
    if (!existsSync(file)) {
      log(`⚠️  Файл не существует: ${file}`);
      continue;
    }

    const text = extractTextFromStory(file);
    const terms = extractTerms(text, args, existingKBTerms);

    for (const term of terms) {
      const normalizedTerm = term.toLowerCase();
      const slug = createSlug(term);

      // Пропускаем, если термин уже существует в KB
      if (termExistsInKB(slug)) {
        continue;
      }

      // Проверяем все морфологические формы для нормализации
      let canonicalTerm = normalizedTerm;
      if (!args.noMorphology && isRussianWord(normalizedTerm)) {
        const morphForms = generateMorphologicalForms(normalizedTerm);
        // Проверяем, есть ли каноническая форма среди существующих терминов
        for (const form of morphForms) {
          if (existingKBTerms.has(form)) {
            canonicalTerm = form;
            break;
          }
        }
      }

      // v2.1: Используем slug как ключ для агрегации (анти-дубль)
      // Это гарантирует, что разные термины с одинаковым slug будут объединены
      if (!allTerms.has(slug)) {
        allTerms.set(slug, {
          slug: slug, // Slug как уникальный ключ
          term: canonicalTerm, // Каноническая форма термина
          count: 0,
          files: [],
          contexts: [], // Максимум 1-2 цитаты
          originalForms: new Set() // Все формы, в которых встречался термин
        });
      }

      const entry = allTerms.get(slug);
      entry.count++;
      entry.originalForms.add(term); // Сохраняем оригинальную форму
      // Обновляем канонический термин, если нашли более подходящий
      if (canonicalTerm && canonicalTerm !== normalizedTerm) {
        entry.term = canonicalTerm;
      }
      if (!entry.files.includes(file)) {
        entry.files.push(file);
      }

      // v2.1: Собираем 1-2 цитаты контекста для термина из текста файла
      // Ограничиваем до максимум 2 цитат на slug (не на термин)
      // Ищем все формы термина (включая морфологические)
      try {
        // Проверяем, что у нас еще не набралось максимум цитат для этого slug
        if (entry.contexts.length >= 2) {
          continue; // Уже есть 2 цитаты для этого slug, пропускаем
        }

        const lower = text.toLowerCase();
        const searchTerms = [term.toLowerCase(), canonicalTerm];

        // Добавляем морфологические формы для поиска контекста
        if (!args.noMorphology && isRussianWord(normalizedTerm)) {
          const morphForms = generateMorphologicalForms(normalizedTerm);
          searchTerms.push(...morphForms.slice(0, 5)); // Ограничиваем количество форм
        }

        let found = 0;
        const maxQuotes = 2 - entry.contexts.length; // Сколько еще можно добавить
        for (const searchTerm of searchTerms) {
          if (found >= maxQuotes) break;

          let startPos = 0;
          while (found < maxQuotes) {
            const idx = lower.indexOf(searchTerm, startPos);
            if (idx === -1) break;

            // Проверяем границы слова
            const before = idx > 0 ? text[idx - 1] : ' ';
            const after = idx + searchTerm.length < text.length ? text[idx + searchTerm.length] : ' ';
            const isWordBoundary = !/[a-zA-Zа-яёА-ЯЁ0-9]/.test(before) && !/[a-zA-Zа-яёА-ЯЁ0-9]/.test(after);

            if (!isWordBoundary) {
              startPos = idx + 1;
              continue;
            }

            const snippetStart = Math.max(0, idx - 80);
            const snippetEnd = Math.min(text.length, idx + searchTerm.length + 80);
            let snippet = text.substring(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();

            // Добавим многоточия, если обрезали текст
            if (snippetStart > 0) snippet = '…' + snippet;
            if (snippetEnd < text.length) snippet = snippet + '…';

            // Сформатируем цитату: ограничим длину и экранируем бэктики
            snippet = snippet.replace(/`/g, "'");

            // Дедупликация: проверяем, что такая цитата еще не добавлена
            const isDuplicate = entry.contexts.some(ctx => {
              // Сравниваем нормализованные версии (без многоточий и пробелов)
              const normalizedCtx = ctx.replace(/…/g, '').replace(/\s+/g, ' ').toLowerCase();
              const normalizedSnippet = snippet.replace(/…/g, '').replace(/\s+/g, ' ').toLowerCase();
              return normalizedCtx === normalizedSnippet || normalizedCtx.includes(searchTerm) && normalizedSnippet.includes(searchTerm);
            });

            if (!isDuplicate) {
              entry.contexts.push(snippet);
              found++;
            }

            startPos = idx + searchTerm.length;
          }
        }
      } catch (e) {
        // не критично
      }
    }
  }

  // v2.1: Сортируем кандидатов по частоте появления
  // Убеждаемся, что contexts содержит максимум 1-2 цитаты (уже ограничено выше)
  const candidates = Array.from(allTerms.values())
    .sort((a, b) => b.count - a.count)
    .map(({ term, slug, count, files, contexts, originalForms }) => ({
      term,
      slug,
      frequency: count,
      files: files.slice(0, 5), // Ограничиваем количество файлов
      contexts: (contexts || []).slice(0, 2), // v2.1: Гарантируем максимум 1-2 цитаты
      originalForms: Array.from(originalForms || []).slice(0, 5), // Формы, в которых встречался термин
      created_at: new Date().toISOString(),
      pr_number: args.pr || null
    }));

  if (candidates.length === 0) {
    log('ℹ️  Не найдено новых терминов для добавления в KB');
    process.exit(0);
  }

  log(`Найдено ${candidates.length} потенциальных терминов`);

  // v2.2: Загружаем существующих кандидатов и дополняем (анти-дубль)
  let existingCandidates = [];
  let existingCandidatesBySlug = new Map();
  if (!args.dryRun && existsSync(CANDIDATES_OUTPUT)) {
    try {
      const existingData = JSON.parse(readFileSync(CANDIDATES_OUTPUT, 'utf8'));
      if (Array.isArray(existingData.candidates)) {
        existingCandidates = existingData.candidates;
        for (const cand of existingCandidates) {
          existingCandidatesBySlug.set(cand.slug, cand);
        }
        log(`Загружено ${existingCandidates.length} существующих кандидатов из ${CANDIDATES_OUTPUT}`);
      }
    } catch (error) {
      log(`⚠️  Не удалось загрузить существующих кандидатов: ${error.message}`);
    }
  }

  // Объединяем существующих и новых кандидатов по slug
  const mergedCandidates = new Map();
  
  // Сначала добавляем существующих
  for (const cand of existingCandidates) {
    mergedCandidates.set(cand.slug, { ...cand });
  }

  // Затем добавляем/обновляем новыми (более свежие данные)
  let newCount = 0;
  let updatedCount = 0;
  for (const cand of candidates) {
    if (mergedCandidates.has(cand.slug)) {
      // Обновляем существующего: объединяем файлы и контексты, обновляем частоту
      const existing = mergedCandidates.get(cand.slug);
      const mergedFiles = new Set([...existing.files, ...cand.files]);
      existing.files = Array.from(mergedFiles).slice(0, 5);
      // Объединяем контексты (максимум 2)
      const mergedContexts = [...(existing.contexts || []), ...(cand.contexts || [])];
      existing.contexts = mergedContexts.slice(0, 2);
      // Обновляем частоту
      existing.frequency = (existing.frequency || 0) + cand.frequency;
      // Обновляем дату и PR
      existing.created_at = new Date().toISOString();
      existing.pr_number = args.pr || existing.pr_number;
      // Объединяем формы
      const mergedForms = new Set([...(existing.originalForms || []), ...(cand.originalForms || [])]);
      existing.originalForms = Array.from(mergedForms).slice(0, 5);
      updatedCount++;
    } else {
      // Новый кандидат
      mergedCandidates.set(cand.slug, { ...cand });
      newCount++;
    }
  }

  const finalCandidates = Array.from(mergedCandidates.values());

  // v2.2: Сохраняем в candidates_kb.json (дополнение, а не перезапись)
  const output = {
    version: '2.2',
    generated_at: new Date().toISOString(),
    pr_number: args.pr || null,
    base_ref: args.base,
    total_candidates: finalCandidates.length,
    stats: {
      new_candidates: newCount,
      updated_candidates: updatedCount,
      existing_candidates: existingCandidates.length
    },
    features: {
      morphology: !args.noMorphology,
      wordBoundaries: true,
      normalization: true,
      slugAggregation: true, // v2.1: Агрегация по slug (анти-дубль)
      maxQuotes: 2, // v2.1: Максимум 1-2 цитаты на кандидата
      incremental: true // v2.2: Дополнение вместо перезаписи
    },
    candidates: finalCandidates
  };

  if (!args.dryRun) {
    // Убеждаемся, что директория существует
    const outputDir = path.dirname(CANDIDATES_OUTPUT);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    writeFileSync(CANDIDATES_OUTPUT, JSON.stringify(output, null, 2), 'utf8');
    log(`✅ Сохранено в ${CANDIDATES_OUTPUT} (${newCount} новых, ${updatedCount} обновлено)`);
  } else {
    log(`[DRY] Would save ${finalCandidates.length} candidates to ${CANDIDATES_OUTPUT} (${newCount} новых, ${updatedCount} обновлено)`);
  }

  // v2.2: Создаем Issues для каждого slug (не плодим задач - одна на slug)
  if (!args.noIssues) {
    log('Проверка существующих Issues и создание новых...');
    
    // v2.2: Загружаем существующие Issues из GitHub (анти-дубль)
    const existingIssues = await loadExistingIssues();
    log(`Найдено ${existingIssues.size} существующих Issues для KB терминов`);

    let created = 0;
    let skipped = 0;
    const createdSlugs = new Set(); // Отслеживаем созданные Issues по slug в этой сессии

    // Используем finalCandidates для создания Issues
    for (const candidate of finalCandidates) {
      // v2.2: Проверяем, что Issue для этого slug еще не существует (анти-дубль)
      if (createdSlugs.has(candidate.slug)) {
        log(`⏭️  Issue для slug "${candidate.slug}" уже создан в этой сессии, пропускаем`);
        skipped++;
        continue;
      }

      // Проверяем существующие Issues в GitHub
      if (existingIssues.has(candidate.slug)) {
        log(`⏭️  Issue для slug "${candidate.slug}" уже существует в GitHub, пропускаем (анти-дубль)`);
        skipped++;
        // Обновляем URL Issue в кандидате
        candidate.issue_url = existingIssues.get(candidate.slug);
        continue;
      }

      // Создаем Issue только для терминов, которые встречаются минимум 2 раза
      if (candidate.frequency < 2) {
        skipped++;
        continue;
      }

      const issueUrl = await createIssueForTerm(candidate.term, candidate.slug, {
        prNumber: args.pr,
        files: candidate.files,
        contexts: candidate.contexts || [], // v2.2: Уже ограничено до 1-2 цитат
        originalForms: candidate.originalForms || []
      }, args);

      if (issueUrl) {
        candidate.issue_url = issueUrl;
        createdSlugs.add(candidate.slug); // Помечаем slug как обработанный
        created++;
        existingIssues.set(candidate.slug, issueUrl); // Добавляем в кеш
      }

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log(`✅ Создано ${created} Issues (по одному на slug), пропущено ${skipped} (низкая частота или дубликаты)`);

    // Обновляем candidates_kb.json с URL Issues
    if (!args.dryRun && created > 0) {
      writeFileSync(CANDIDATES_OUTPUT, JSON.stringify(output, null, 2), 'utf8');
    }
  }

  log('✅ Готово!');
}

main().catch(error => {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
});

