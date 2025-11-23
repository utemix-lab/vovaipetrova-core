#!/usr/bin/env node
/**
 * Extractor Stories Terms: извлечение терминов из PR → candidates_kb.json → авто-задачи
 * 
 * Извлекает потенциальные термины из измененных файлов Stories в PR и создает:
 * 1. Файл candidates_kb.json с кандидатами терминов
 * 2. GitHub Issues для каждого термина: "KB: добавить термин <slug>"
 * 
 * Использование:
 *   node scripts/extractor-stories-terms.mjs [--pr=<number>] [--base=main] [--dry-run] [--no-issues]
 * 
 * Переменные окружения:
 *   GITHUB_TOKEN - токен для доступа к GitHub API
 *   GITHUB_REPO - репозиторий (по умолчанию: utemix-lab/vovaipetrova-core)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import matter from 'gray-matter';
import slugify from 'slugify';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';
const CANDIDATES_OUTPUT = 'candidates_kb.json';
const STORIES_DIR = 'docs/stories';
const DRY_RUN = process.argv.includes('--dry-run');
const NO_ISSUES = process.argv.includes('--no-issues');

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
    dryRun: DRY_RUN,
    noIssues: NO_ISSUES
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
    !file.includes('SHARED_CONTEXT')
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
 * Извлекает потенциальные термины из текста
 */
function extractTerms(text) {
  const terms = new Set();

  // Применяем паттерны для поиска терминов
  for (const pattern of TERM_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const term = match[0];
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

      terms.add(term);
    }
  }

  return Array.from(terms);
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
 * Создает GitHub Issue для термина
 */
async function createIssueForTerm(term, slug, context) {
  if (NO_ISSUES || DRY_RUN) {
    log(`[DRY] Would create issue: "KB: добавить термин ${slug}"`);
    return null;
  }

  if (!GITHUB_TOKEN) {
    log('⚠️  GITHUB_TOKEN не установлен, пропускаю создание Issue');
    return null;
  }

  try {
    const title = `KB: добавить термин ${slug}`;
    const body = [
      `## Термин: ${term}`,
      '',
      `**Slug**: \`${slug}\``,
      '',
      '**Контекст появления**:',
      `Термин найден в файлах Stories:`,
      ...context.files.map(f => `- \`${f}\``),
      '',
      '**Действия**:',
      '- [ ] Создать страницу KB для термина',
      '- [ ] Добавить определение',
      '- [ ] Добавить примеры использования',
      '- [ ] Связать с другими терминами (если применимо)',
      '',
      `_Автоматически создано из PR #${context.prNumber || 'N/A'}_`
    ].join('\n');

    const [owner, repo] = GITHUB_REPO.split('/');
    const command = `gh issue create --repo ${GITHUB_REPO} --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "kb,content/kb"`;

    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, GITHUB_TOKEN }
    });

    log(`✅ Создан Issue для термина "${term}" (${slug})`);
    return output.trim();
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

  // Извлекаем термины из каждого файла
  const allTerms = new Map(); // term -> { count, files, slug }

  for (const file of changedFiles) {
    if (!existsSync(file)) {
      log(`⚠️  Файл не существует: ${file}`);
      continue;
    }

    const text = extractTextFromStory(file);
    const terms = extractTerms(text);

    for (const term of terms) {
      const slug = createSlug(term);
      
      // Пропускаем, если термин уже существует в KB
      if (termExistsInKB(slug)) {
        continue;
      }

      if (!allTerms.has(term)) {
        allTerms.set(term, {
          term,
          slug,
          count: 0,
          files: []
        });
      }

      const entry = allTerms.get(term);
      entry.count++;
      if (!entry.files.includes(file)) {
        entry.files.push(file);
      }
    }
  }

  // Сортируем термины по частоте появления
  const candidates = Array.from(allTerms.values())
    .sort((a, b) => b.count - a.count)
    .map(({ term, slug, count, files }) => ({
      term,
      slug,
      frequency: count,
      files: files.slice(0, 5), // Ограничиваем количество файлов
      created_at: new Date().toISOString(),
      pr_number: args.pr || null
    }));

  if (candidates.length === 0) {
    log('ℹ️  Не найдено новых терминов для добавления в KB');
    process.exit(0);
  }

  log(`Найдено ${candidates.length} потенциальных терминов`);

  // Сохраняем в candidates_kb.json
  const output = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    pr_number: args.pr || null,
    base_ref: args.base,
    total_candidates: candidates.length,
    candidates
  };

  if (!DRY_RUN) {
    writeFileSync(CANDIDATES_OUTPUT, JSON.stringify(output, null, 2), 'utf8');
    log(`✅ Сохранено в ${CANDIDATES_OUTPUT}`);
  } else {
    log(`[DRY] Would save ${candidates.length} candidates to ${CANDIDATES_OUTPUT}`);
  }

  // Создаем Issues для каждого термина
  if (!NO_ISSUES) {
    log('Создание GitHub Issues...');
    let created = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      // Создаем Issue только для терминов, которые встречаются минимум 2 раза
      if (candidate.frequency < 2) {
        skipped++;
        continue;
      }

      const issueUrl = await createIssueForTerm(candidate.term, candidate.slug, {
        prNumber: args.pr,
        files: candidate.files
      });

      if (issueUrl) {
        candidate.issue_url = issueUrl;
        created++;
      }

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    log(`✅ Создано ${created} Issues, пропущено ${skipped} (низкая частота)`);

    // Обновляем candidates_kb.json с URL Issues
    if (!DRY_RUN && created > 0) {
      writeFileSync(CANDIDATES_OUTPUT, JSON.stringify(output, null, 2), 'utf8');
    }
  }

  log('✅ Готово!');
}

main().catch(error => {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
});

