#!/usr/bin/env node
/**
 * Проверка диффов перед коммитом
 * Обеспечивает минимальные изменения и соответствие правилам
 * 
 * Использование:
 *   node scripts/check-diff.mjs [--strict]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STRICT_MODE = process.argv.includes('--strict');

/**
 * Получает список изменённых файлов
 */
function getChangedFiles() {
  try {
    const output = execSync('git diff --name-status HEAD', { encoding: 'utf8' });
    const lines = output.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const [status, ...rest] = line.split('\t');
      return { status, file: rest.join('\t') };
    });
  } catch (error) {
    console.warn('⚠️  Could not get changed files from git');
    return [];
  }
}

/**
 * Получает дифф для файла
 */
function getFileDiff(filePath) {
  try {
    const diff = execSync(`git diff --no-color HEAD "${filePath}"`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return diff.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Анализирует размер диффа
 */
function analyzeDiff(diff) {
  if (!diff) return { additions: 0, deletions: 0, lines: 0 };
  
  const lines = diff.split('\n');
  const additions = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;
  
  return { additions, deletions, lines: additions + deletions };
}

/**
 * Проверяет, что изменения минимальны
 */
function validateDiffSize(stats, filePath) {
  const MAX_ADDITIONS = 200;
  const MAX_DELETIONS = 100;
  const MAX_TOTAL = 250;
  
  const issues = [];
  
  if (stats.additions > MAX_ADDITIONS) {
    issues.push(`Too many additions: ${stats.additions} (max ${MAX_ADDITIONS})`);
  }
  
  if (stats.deletions > MAX_DELETIONS) {
    issues.push(`Too many deletions: ${stats.deletions} (max ${MAX_DELETIONS})`);
  }
  
  if (stats.lines > MAX_TOTAL) {
    issues.push(`Total changes too large: ${stats.lines} lines (max ${MAX_TOTAL})`);
  }
  
  return { valid: issues.length === 0, issues };
}

/**
 * Проверяет формат изменений для Markdown файлов
 */
function validateMarkdownFormat(filePath, diff) {
  if (!filePath.endsWith('.md')) return { valid: true };
  
  const issues = [];
  const lines = diff.split('\n');
  
  // Проверка на изменения в front matter
  let inFrontMatter = false;
  let frontMatterChanged = false;
  
  for (const line of lines) {
    if (line.includes('---')) {
      inFrontMatter = !inFrontMatter;
    }
    if (inFrontMatter && (line.startsWith('+') || line.startsWith('-'))) {
      frontMatterChanged = true;
      
      // Проверка формата front matter
      if (line.includes(':') && !line.match(/^[+-]\s*[a-z_]+:\s*.+$/)) {
        issues.push(`Invalid front matter format: ${line.substring(0, 50)}`);
      }
    }
  }
  
  return { valid: issues.length === 0, issues, frontMatterChanged };
}

function main() {
  console.log('🔍 Checking diffs before commit...\n');
  
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('✅ No changes detected');
    return 0;
  }
  
  let totalIssues = 0;
  let filesChecked = 0;
  
  for (const { status, file } of changedFiles) {
    if (status.startsWith('D')) {
      console.log(`⚠️  Deleted: ${file} (skipping diff check)`);
      continue;
    }
    
    filesChecked++;
    const diff = getFileDiff(file);
    const stats = analyzeDiff(diff);
    
    console.log(`\n📄 ${file} (${status})`);
    console.log(`   Changes: +${stats.additions} -${stats.deletions} (${stats.lines} total)`);
    
    // Проверка размера
    const sizeCheck = validateDiffSize(stats, file);
    if (!sizeCheck.valid) {
      console.log(`   ❌ Size validation failed:`);
      sizeCheck.issues.forEach(issue => console.log(`      - ${issue}`));
      totalIssues++;
    } else {
      console.log(`   ✅ Size validation passed`);
    }
    
    // Проверка формата для Markdown
    if (file.endsWith('.md') && diff) {
      const formatCheck = validateMarkdownFormat(file, diff);
      if (!formatCheck.valid) {
        console.log(`   ❌ Format validation failed:`);
        formatCheck.issues.forEach(issue => console.log(`      - ${issue}`));
        totalIssues++;
      } else {
        console.log(`   ✅ Format validation passed`);
      }
    }
  }
  
  console.log(`\n📊 Summary: ${filesChecked} files checked, ${totalIssues} issues found`);
  
  if (totalIssues > 0) {
    console.log('\n⚠️  Some diffs failed validation');
    if (STRICT_MODE) {
      console.log('❌ Strict mode: failing');
      return 1;
    } else {
      console.log('ℹ️  Non-strict mode: warnings only');
      return 0;
    }
  } else {
    console.log('\n✅ All diffs validated successfully');
    return 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}

export { getChangedFiles, analyzeDiff, validateDiffSize };

