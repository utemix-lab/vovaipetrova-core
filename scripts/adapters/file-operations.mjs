#!/usr/bin/env node
/**
 * Адаптеры для файловых операций с проверками диффов
 * Обеспечивает надёжные изменения в docs/ и prototype/ через минимальные диффы
 * 
 * Использование:
 *   import { readFile, writeFile, updateFile, patchFile } from './adapters/file-operations.mjs';
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Разрешённые зоны записи
const ALLOWED_PATHS = [
  'docs/**',
  'prototype/**',
  'templates/**'
];

// Запрещённые зоны
const DENY_PATHS = [
  'notion-brain/**',
  '.env',
  '.env.*',
  'node_modules/**',
  'vendor/**',
  '.git/**'
];

/**
 * Проверяет, разрешён ли путь для записи
 */
function isPathAllowed(filePath) {
  const relativePath = relative(process.cwd(), filePath);
  
  // Проверка запрещённых путей
  for (const denyPattern of DENY_PATHS) {
    if (matchesPattern(relativePath, denyPattern)) {
      return { allowed: false, reason: `matches deny_paths: ${denyPattern}` };
    }
  }
  
  // Проверка разрешённых путей
  for (const allowPattern of ALLOWED_PATHS) {
    if (matchesPattern(relativePath, allowPattern)) {
      return { allowed: true };
    }
  }
  
  return { allowed: false, reason: 'not in allowed_paths' };
}

/**
 * Проверяет соответствие пути паттерну
 */
function matchesPattern(path, pattern) {
  const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
  return regex.test(path);
}

/**
 * Получает git diff для файла
 */
function getFileDiff(filePath) {
  try {
    const relativePath = relative(process.cwd(), filePath);
    const diff = execSync(`git diff --no-color "${relativePath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return diff.trim();
  } catch (error) {
    // Файл не отслеживается git или нет изменений
    return null;
  }
}

/**
 * Проверяет, что дифф минимален (только ожидаемые изменения)
 */
function validateDiff(diff, expectedChanges = []) {
  if (!diff) return { valid: true, message: 'No changes detected' };
  
  const lines = diff.split('\n');
  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
  const removedLines = lines.filter(l => l.startsWith('-') && !l.startsWith('---'));
  
  // Проверка на слишком большие изменения
  if (addedLines.length > 100 || removedLines.length > 100) {
    return { 
      valid: false, 
      message: `Diff too large: ${addedLines.length} additions, ${removedLines.length} deletions` 
    };
  }
  
  // Проверка на неожиданные изменения (если указаны ожидаемые)
  if (expectedChanges.length > 0) {
    const unexpected = [];
    for (const line of [...addedLines, ...removedLines]) {
      const content = line.substring(1).trim();
      const matches = expectedChanges.some(expected => 
        content.includes(expected) || expected.includes(content)
      );
      if (!matches && content.length > 0) {
        unexpected.push(content.substring(0, 50));
      }
    }
    
    if (unexpected.length > 0) {
      return { 
        valid: false, 
        message: `Unexpected changes detected: ${unexpected.slice(0, 3).join(', ')}...` 
      };
    }
  }
  
  return { valid: true, message: 'Diff validated' };
}

/**
 * Чтение файла с проверкой пути
 */
export function readFile(filePath) {
  const pathCheck = isPathAllowed(filePath);
  if (!pathCheck.allowed && !existsSync(filePath)) {
    throw new Error(`Path not allowed: ${pathCheck.reason}`);
  }
  
  if (!existsSync(filePath)) {
    return null;
  }
  
  return readFileSync(filePath, 'utf8');
}

/**
 * Запись файла с проверками
 */
export function writeFile(filePath, content, options = {}) {
  const { dryRun = false, validateDiff: validate = true, expectedChanges = [] } = options;
  
  // Проверка пути
  const pathCheck = isPathAllowed(filePath);
  if (!pathCheck.allowed) {
    throw new Error(`Path not allowed: ${pathCheck.reason}`);
  }
  
  // Dry-run режим
  if (dryRun) {
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
    const diff = existing !== content ? `Would write ${content.length} bytes (was ${existing.length})` : 'No changes';
    return { success: true, dryRun: true, diff };
  }
  
  // Запись файла
  writeFileSync(filePath, content, 'utf8');
  
  // Проверка диффа после записи
  if (validate) {
    const diff = getFileDiff(filePath);
    const validation = validateDiff(diff, expectedChanges);
    if (!validation.valid) {
      throw new Error(`Diff validation failed: ${validation.message}`);
    }
  }
  
  return { success: true, path: filePath };
}

/**
 * Обновление файла (replace) с проверками
 */
export function updateFile(filePath, newContent, options = {}) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  return writeFile(filePath, newContent, options);
}

/**
 * Патч файла (append/replace section) с проверками
 */
export function patchFile(filePath, patch, options = {}) {
  const { mode = 'replace', section = null, dryRun = false } = options;
  
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const existing = readFileSync(filePath, 'utf8');
  let newContent;
  
  if (mode === 'append') {
    newContent = existing + '\n' + patch;
  } else if (mode === 'prepend') {
    newContent = patch + '\n' + existing;
  } else if (mode === 'replace' && section) {
    // Замена секции (например, front matter)
    const sectionRegex = new RegExp(`(${section}:\\s*)([^\\n]+)`, 'm');
    if (sectionRegex.test(existing)) {
      newContent = existing.replace(sectionRegex, `$1${patch}`);
    } else {
      throw new Error(`Section not found: ${section}`);
    }
  } else {
    throw new Error(`Invalid patch mode: ${mode}`);
  }
  
  return writeFile(filePath, newContent, options);
}

/**
 * Preview изменений (dry-run с детальным выводом)
 */
export function previewChanges(filePath, newContent) {
  if (!existsSync(filePath)) {
    return {
      type: 'create',
      preview: newContent,
      size: newContent.length
    };
  }
  
  const existing = readFileSync(filePath, 'utf8');
  const diff = getFileDiff(filePath);
  
  return {
    type: 'update',
    preview: newContent,
    existingSize: existing.length,
    newSize: newContent.length,
    diff: diff || 'No git diff available',
    changes: {
      additions: newContent.length - existing.length,
      linesChanged: newContent.split('\n').length - existing.split('\n').length
    }
  };
}

