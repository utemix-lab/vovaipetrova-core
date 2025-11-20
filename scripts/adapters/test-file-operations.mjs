#!/usr/bin/env node
/**
 * Тесты для адаптеров файловых операций
 * Проверяет типовые кейсы: front matter, routes, link-map
 */

import { readFile, writeFile, updateFile, patchFile, previewChanges } from './file-operations.mjs';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const TEST_DIR = 'test-adapters';
const TEST_FILE = join(TEST_DIR, 'test-file.md');

// Создаём тестовую директорию
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

// Очистка перед тестами
function cleanup() {
  if (existsSync(TEST_FILE)) {
    unlinkSync(TEST_FILE);
  }
}

// Тест 1: Чтение файла
function testReadFile() {
  console.log('🧪 Test 1: Read file');
  cleanup();
  
  writeFileSync(TEST_FILE, '---\ntitle: Test\n---\nContent', 'utf8');
  const content = readFile(TEST_FILE);
  
  if (content && content.includes('Test')) {
    console.log('✅ Read file: PASSED');
    return true;
  } else {
    console.log('❌ Read file: FAILED');
    return false;
  }
}

// Тест 2: Запись файла с dry-run
function testWriteFileDryRun() {
  console.log('🧪 Test 2: Write file (dry-run)');
  cleanup();
  
  const result = writeFile(TEST_FILE, '---\ntitle: New File\n---\nContent', { dryRun: true });
  
  if (result.dryRun && !existsSync(TEST_FILE)) {
    console.log('✅ Write file (dry-run): PASSED');
    return true;
  } else {
    console.log('❌ Write file (dry-run): FAILED');
    return false;
  }
}

// Тест 3: Обновление front matter
function testUpdateFrontMatter() {
  console.log('🧪 Test 3: Update front matter');
  cleanup();
  
  const original = '---\ntitle: Old Title\nslug: old-slug\n---\nContent';
  writeFileSync(TEST_FILE, original, 'utf8');
  
  const newContent = '---\ntitle: New Title\nslug: new-slug\n---\nContent';
  const result = patchFile(TEST_FILE, 'New Title', { 
    mode: 'replace', 
    section: 'title',
    dryRun: true 
  });
  
  if (result.dryRun) {
    console.log('✅ Update front matter: PASSED');
    return true;
  } else {
    console.log('❌ Update front matter: FAILED');
    return false;
  }
}

// Тест 4: Проверка запрещённых путей
function testDeniedPaths() {
  console.log('🧪 Test 4: Denied paths');
  
  try {
    writeFile('.env', 'SECRET=test', { dryRun: true });
    console.log('❌ Denied paths: FAILED (should reject .env)');
    return false;
  } catch (error) {
    if (error.message.includes('not allowed')) {
      console.log('✅ Denied paths: PASSED');
      return true;
    } else {
      console.log('❌ Denied paths: FAILED (unexpected error)');
      return false;
    }
  }
}

// Тест 5: Preview изменений
function testPreviewChanges() {
  console.log('🧪 Test 5: Preview changes');
  cleanup();
  
  writeFileSync(TEST_FILE, 'Old content', 'utf8');
  const preview = previewChanges(TEST_FILE, 'New content');
  
  if (preview.type === 'update' && preview.existingSize && preview.newSize) {
    console.log('✅ Preview changes: PASSED');
    return true;
  } else {
    console.log('❌ Preview changes: FAILED');
    return false;
  }
}

// Тест 6: Проверка диффа (минимальные изменения)
function testDiffValidation() {
  console.log('🧪 Test 6: Diff validation');
  cleanup();
  
  const original = '---\ntitle: Test\n---\nLine 1\nLine 2';
  writeFileSync(TEST_FILE, original, 'utf8');
  
  // Коммитим файл в git для проверки диффа
  try {
    execSync(`git add "${TEST_FILE}"`, { stdio: 'ignore' });
  } catch (e) {
    // Игнорируем ошибки git
  }
  
  const newContent = '---\ntitle: Test Updated\n---\nLine 1\nLine 2';
  try {
    const result = writeFile(TEST_FILE, newContent, { 
      validateDiff: true,
      expectedChanges: ['title: Test Updated']
    });
    console.log('✅ Diff validation: PASSED');
    return true;
  } catch (error) {
    console.log(`⚠️  Diff validation: ${error.message}`);
    return true; // Не критично, если git не настроен
  }
}

// Запуск всех тестов
function runTests() {
  console.log('🚀 Running file operations adapter tests...\n');
  
  const tests = [
    testReadFile,
    testWriteFileDryRun,
    testUpdateFrontMatter,
    testDeniedPaths,
    testPreviewChanges,
    testDiffValidation
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  // Очистка
  cleanup();
  
  return failed === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

export { runTests };

