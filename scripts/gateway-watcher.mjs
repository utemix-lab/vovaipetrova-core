#!/usr/bin/env node
/**
 * Gateway Watcher: inbox/author → захват и валидация
 * 
 * Мониторит папку inbox/author на наличие новых файлов и валидирует их:
 * - PII (персональные данные)
 * - Длина контента (минимальная/максимальная)
 * - Тон (запрещённые фразы для Stories)
 * 
 * При успешной валидации добавляет идею в очередь tmp/ideas.json со статусом "approved".
 * При ошибках логирует проблемы и оставляет файл в inbox/author.
 * 
 * Usage:
 *   node scripts/gateway-watcher.mjs [--watch] [--file=path/to/file.md]
 * 
 * Options:
 *   --watch        Запустить в режиме постоянного мониторинга (использует chokidar)
 *   --file=...     Обработать конкретный файл (разовый запуск)
 *   --dry-run      Показать результаты валидации без добавления в очередь
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { resolve, join, dirname, basename } from 'path';
import matter from 'gray-matter';

const INBOX_DIR = resolve(process.cwd(), 'inbox', 'author');
const QUEUE_PATH = resolve(process.cwd(), 'tmp', 'ideas.json');
const PROCESSED_DIR = resolve(process.cwd(), 'inbox', 'author', '.processed');

// Пороги валидации
const CONTENT_MIN_LENGTH = 50; // Минимальная длина контента
const CONTENT_MAX_LENGTH = 50000; // Максимальная длина контента (предупреждение)
const CONTENT_CRITICAL_LENGTH = 100000; // Критическая длина (ошибка)

function log(msg) {
  console.log(`[gateway-watcher] ${msg}`);
}

function error(msg) {
  console.error(`[gateway-watcher] ERROR: ${msg}`);
}

/**
 * Загружает очередь идей
 */
function loadQueue() {
  if (!existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(QUEUE_PATH, 'utf8')) || [];
  } catch (err) {
    error(`Failed to parse queue: ${err.message}`);
    return [];
  }
}

/**
 * Сохраняет очередь идей
 */
function saveQueue(q) {
  try {
    mkdirSync(dirname(QUEUE_PATH), { recursive: true });
    writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2), 'utf8');
  } catch (err) {
    error(`Failed to save queue: ${err.message}`);
  }
}

/**
 * Проверка PII (использует логику из lint-docs.mjs)
 */
function containsPII(body) {
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
      regex: /\b\d{10,15}\b/g
    },
    {
      name: 'full_name_russian',
      regex: /\b([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\b/g
    },
    {
      name: 'full_name_english',
      regex: /\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b/g,
      excludePatterns: [
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
        /Gateway Watcher/i,
        /Author Gateway/i
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
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    }
  ];
  
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
    /192\.168\./i,
    /10\./i,
    /172\.(1[6-9]|2[0-9]|3[01])\./i,
    /john\.doe@example\.com/i,
    /jane\.doe@example\.com/i,
    /test@test\.com/i,
    /v?\d+\.\d+\.\d+/i,
    /[0-9a-f]{32,}/i,
    /github\.com/i,
    /gitlab\.com/i,
    /bitbucket\.org/i,
    /C:\\Users\\.{2,}/i,
    /\/home\/\.{2,}/i,
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
    /Gateway Watcher/i,
    /Author Gateway/i,
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
      if (codeBlockCount % 2 === 1) continue;
      
      // Skip if already sanitized or in exclusions
      const matchedText = match[0];
      if (exclusions.some(exclusion => exclusion.test(matchedText))) {
        continue;
      }
      
      // Проверяем исключения для конкретного паттерна
      if (pattern.excludePatterns && pattern.excludePatterns.some(exclude => exclude.test(matchedText))) {
        continue;
      }
      
      return { found: true, kind: pattern.name, match: matchedText };
    }
  }
  
  return { found: false };
}

/**
 * Проверка тона (запрещённые фразы для Stories)
 */
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
  const normalized = body.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase));
}

/**
 * Валидация длины контента
 */
function validateLength(body) {
  const contentLength = body.trim().length;
  const errors = [];
  const warnings = [];
  
  if (contentLength < CONTENT_MIN_LENGTH) {
    errors.push(`content too short (${contentLength} chars, minimum ${CONTENT_MIN_LENGTH})`);
  }
  
  if (contentLength > CONTENT_CRITICAL_LENGTH) {
    errors.push(`content too long (${contentLength} chars, critical limit ${CONTENT_CRITICAL_LENGTH})`);
  } else if (contentLength > CONTENT_MAX_LENGTH) {
    warnings.push(`content very long (${contentLength} chars, recommended max ${CONTENT_MAX_LENGTH})`);
  }
  
  return { errors, warnings, length: contentLength };
}

/**
 * Валидация файла
 */
function validateFile(filePath) {
  const errors = [];
  const warnings = [];
  
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const body = parsed.content || '';
    const fm = parsed.data || {};
    
    // Проверка PII
    const piiCheck = containsPII(body);
    if (piiCheck.found) {
      errors.push(`PII detected (${piiCheck.kind}): ${piiCheck.match.substring(0, 50)}... Use <user>, <email>, or <phone> instead`);
    }
    
    // Проверка тона
    if (containsForbiddenStoryPhrases(body)) {
      warnings.push('Истории ведём от нейтрального автора; используйте «автор» или безличные формулировки');
    }
    
    // Проверка длины
    const lengthCheck = validateLength(body);
    errors.push(...lengthCheck.errors);
    warnings.push(...lengthCheck.warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      frontMatter: fm,
      body,
      contentLength: lengthCheck.length
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to read file: ${err.message}`],
      warnings: []
    };
  }
}

/**
 * Обработка файла: валидация и добавление в очередь
 */
function processFile(filePath, dryRun = false) {
  const fileName = basename(filePath);
  log(`Processing: ${fileName}`);
  
  const validation = validateFile(filePath);
  
  if (!validation.valid) {
    error(`Validation failed for ${fileName}:`);
    for (const err of validation.errors) {
      error(`  - ${err}`);
    }
    if (validation.warnings.length > 0) {
      log(`  ⚠️  Warnings:`);
      for (const warn of validation.warnings) {
        log(`    - ${warn}`);
      }
    }
    return { success: false, validation };
  }
  
  // Предупреждения не блокируют, но логируем их
  if (validation.warnings.length > 0) {
    log(`⚠️  Warnings for ${fileName}:`);
    for (const warn of validation.warnings) {
      log(`  - ${warn}`);
    }
  }
  
  if (dryRun) {
    log(`✅ Validation passed (dry-run, not adding to queue)`);
    return { success: true, validation };
  }
  
  // Проверяем, не существует ли уже идея с таким source_file
  const queue = loadQueue();
  const normalizedPath = filePath.replace(/\\/g, '/');
  const existingIdea = queue.find(item => {
    const existingPath = (item.source_file || '').replace(/\\/g, '/');
    return existingPath === normalizedPath;
  });
  
  if (existingIdea) {
    log(`⚠️  Idea already exists in queue: ${existingIdea.id} (${existingIdea.title})`);
    log(`   Skipping duplicate for ${fileName}`);
    return { success: false, validation, reason: 'duplicate' };
  }
  
  // Создаём идею из файла
  const title = validation.frontMatter.title || fileName.replace(/\.md$/, '');
  const seedText = validation.body.substring(0, 500).trim(); // Первые 500 символов как seed_text
  
  // Генерируем уникальный ID с использованием timestamp и случайного компонента для предотвращения коллизий
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ideaId = `idea-${timestamp}-${randomSuffix}`;
  
  const idea = {
    id: ideaId,
    status: 'approved',
    title: title,
    seed_text: seedText,
    created_at: new Date().toISOString(),
    author: validation.frontMatter.author || 'автор',
    source_file: filePath,
    content_length: validation.contentLength
  };
  
  // Добавляем в очередь
  queue.push(idea);
  saveQueue(queue);
  
  log(`✅ Added to queue: ${idea.id} (${idea.title})`);
  
  // Перемещаем файл в .processed
  try {
    mkdirSync(PROCESSED_DIR, { recursive: true });
    // Используем тот же ID для имени файла, чтобы избежать коллизий
    const processedPath = join(PROCESSED_DIR, `${ideaId}-${fileName}`);
    writeFileSync(processedPath, readFileSync(filePath, 'utf8'), 'utf8');
    // Удаляем оригинальный файл (опционально, можно закомментировать для отладки)
    // unlinkSync(filePath);
    log(`📦 Moved to .processed: ${processedPath}`);
  } catch (err) {
    error(`Failed to move file to .processed: ${err.message}`);
  }
  
  return { success: true, validation, idea };
}

/**
 * Сканирование inbox/author на наличие новых файлов
 */
function scanInbox() {
  if (!existsSync(INBOX_DIR)) {
    log(`Creating inbox directory: ${INBOX_DIR}`);
    mkdirSync(INBOX_DIR, { recursive: true });
    return [];
  }
  
  const files = readdirSync(INBOX_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'))
    .map(f => join(INBOX_DIR, f))
    .filter(f => {
      const stats = statSync(f);
      return stats.isFile();
    });
  
  return files;
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const watchMode = args.includes('--watch');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  
  if (fileArg) {
    // Обработка конкретного файла
    const filePath = fileArg.split('=', 2)[1];
    if (!existsSync(filePath)) {
      error(`File not found: ${filePath}`);
      process.exit(1);
    }
    const result = processFile(filePath, dryRun);
    process.exit(result.success ? 0 : 1);
  } else if (watchMode) {
    // Режим постоянного мониторинга (требует chokidar)
    log('Watch mode requires chokidar. Install with: npm install chokidar');
    log('For now, use --file=... or run without --watch to scan once');
    process.exit(1);
  } else {
    // Разовое сканирование inbox/author
    log('Scanning inbox/author...');
    const files = scanInbox();
    
    if (files.length === 0) {
      log('No files found in inbox/author');
      process.exit(0);
    }
    
    log(`Found ${files.length} file(s)`);
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
      const result = processFile(file, dryRun);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    log(`\nSummary: ${successCount} succeeded, ${failCount} failed`);
    process.exit(failCount > 0 ? 1 : 0);
  }
}

main();

