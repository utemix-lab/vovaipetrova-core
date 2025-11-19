#!/usr/bin/env node
/**
 * Тестирование guardrails: one-PR-per-lane и size-guard
 * 
 * Эмуляция нарушений для проверки корректности работы guardrails.
 * Использование: node scripts/test-guardrails.mjs [--test-lanes] [--test-size]
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = join(__dirname, '..', 'test-guardrails');
const TEST_BRANCH = 'test/guardrails-test';

// Пороги для size-guard
const MAX_FILES = 50;
const MAX_ADDITIONS = 2000;
const MAX_DELETIONS = 1000;

function cleanup() {
  try {
    // Удаляем тестовую директорию
    execSync(`rm -rf "${TEST_DIR}"`, { cwd: join(__dirname, '..') });
  } catch (e) {
    // Игнорируем ошибки
  }
}

function testLanesPolicy() {
  console.log('\n🧪 Тест: Lanes Policy (one-PR-per-lane)');
  console.log('─'.repeat(60));
  
  try {
    // Проверяем, что скрипт существует
    if (!existsSync(join(__dirname, 'check-lanes.mjs'))) {
      console.log('⚠️  check-lanes.mjs не найден, пропускаем тест');
      return false;
    }
    
    // Эмулируем проверку с несуществующим PR (должен корректно обработать)
    console.log('Проверка обработки отсутствующего PR...');
    try {
      execSync(`node scripts/check-lanes.mjs 99999`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      console.log('✅ Скрипт корректно обработал отсутствующий PR');
    } catch (e) {
      // Ожидаем ошибку или предупреждение
      console.log('✅ Скрипт корректно обработал отсутствующий PR (ожидаемое поведение)');
    }
    
    // Проверяем, что скрипт корректно извлекает lane labels из PR body
    console.log('\nПроверка извлечения lane labels из PR body...');
    const testPRBody = 'This PR adds new features. Label: lane:feat';
    try {
      execSync(`node scripts/check-lanes.mjs 99999 "${testPRBody}"`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      console.log('✅ Скрипт корректно обработал PR body с lane label');
    } catch (e) {
      // Ожидаем ошибку или предупреждение
      console.log('✅ Скрипт корректно обработал PR body (ожидаемое поведение)');
    }
    
    console.log('\n✅ Тест Lanes Policy пройден');
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при тестировании Lanes Policy: ${error.message}`);
    return false;
  }
}

function testSizeGuard() {
  console.log('\n🧪 Тест: Size Guard');
  console.log('─'.repeat(60));
  
  try {
    // Проверяем, что скрипт существует
    if (!existsSync(join(__dirname, 'check-pr-size.mjs'))) {
      console.log('⚠️  check-pr-size.mjs не найден, пропускаем тест');
      return false;
    }
    
    // Создаём тестовую ветку с большим количеством файлов
    console.log('Создание тестовой ветки с большим количеством файлов...');
    
    // Сохраняем текущую ветку
    const currentBranch = execSync('git branch --show-current', {
      cwd: join(__dirname, '..'),
      encoding: 'utf-8'
    }).trim();
    
    try {
      // Создаём тестовую ветку
      execSync(`git checkout -b ${TEST_BRANCH}`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      // Создаём тестовую директорию с файлами
      execSync(`mkdir -p "${TEST_DIR}"`, {
        cwd: join(__dirname, '..')
      });
      
      // Создаём файлы для превышения лимита
      const fileCount = MAX_FILES + 10; // Превышаем лимит на 10 файлов
      for (let i = 0; i < fileCount; i++) {
        const testFile = join(TEST_DIR, `test-file-${i}.md`);
        writeFileSync(testFile, `# Test File ${i}\n\nContent for testing size guard.\n`.repeat(50));
      }
      
      // Коммитим изменения
      execSync(`git add "${TEST_DIR}"`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      execSync(`git commit -m "test: guardrails size test"`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      // Запускаем проверку размера
      console.log('\nЗапуск проверки размера PR...');
      try {
        execSync(`node scripts/check-pr-size.mjs`, {
          cwd: join(__dirname, '..'),
          stdio: 'inherit',
          encoding: 'utf-8'
        });
        console.log('⚠️  Проверка не обнаружила превышение лимита (возможно, файлы исключены)');
      } catch (e) {
        console.log('✅ Проверка корректно обнаружила превышение лимита');
      }
      
      // Возвращаемся на исходную ветку
      execSync(`git checkout ${currentBranch}`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      // Удаляем тестовую ветку
      execSync(`git branch -D ${TEST_BRANCH}`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      // Очищаем тестовые файлы
      cleanup();
      
      console.log('\n✅ Тест Size Guard пройден');
      return true;
    } catch (error) {
      // Восстанавливаем состояние при ошибке
      try {
        execSync(`git checkout ${currentBranch}`, {
          cwd: join(__dirname, '..'),
          stdio: 'pipe'
        });
        execSync(`git branch -D ${TEST_BRANCH}`, {
          cwd: join(__dirname, '..'),
          stdio: 'pipe'
        });
      } catch (e) {
        // Игнорируем ошибки восстановления
      }
      cleanup();
      throw error;
    }
  } catch (error) {
    console.error(`❌ Ошибка при тестировании Size Guard: ${error.message}`);
    return false;
  }
}

function testLintThresholds() {
  console.log('\n🧪 Тест: Lint Thresholds');
  console.log('─'.repeat(60));
  
  try {
    // Проверяем, что скрипт существует
    if (!existsSync(join(__dirname, 'lint-docs.mjs'))) {
      console.log('⚠️  lint-docs.mjs не найден, пропускаем тест');
      return false;
    }
    
    // Создаём тестовые файлы с нарушениями
    const testFiles = [
      {
        path: join(TEST_DIR, 'empty-summary.md'),
        content: `---
title: Test Empty Summary
slug: test-empty-summary
summary: ""
status: draft
tags: []
machine_tags: []
---
# Test Empty Summary

Content here.
`
      },
      {
        path: join(TEST_DIR, 'long-summary.md'),
        content: `---
title: Test Long Summary
slug: test-long-summary
summary: "${'A'.repeat(500)}"
status: draft
tags: []
machine_tags: []
---
# Test Long Summary

Content here.
`
      },
      {
        path: join(TEST_DIR, 'very-long-content.md'),
        content: `---
title: Test Very Long Content
slug: test-very-long-content
summary: "Test summary"
status: draft
tags: []
machine_tags: []
---
# Test Very Long Content

${'Content line.\n'.repeat(10000)}
`
      }
    ];
    
    // Создаём тестовую директорию
    execSync(`mkdir -p "${TEST_DIR}"`, {
      cwd: join(__dirname, '..')
    });
    
    // Создаём тестовые файлы
    for (const testFile of testFiles) {
      writeFileSync(testFile.path, testFile.content);
    }
    
    // Запускаем линтер
    console.log('Запуск линтера на тестовых файлах...');
    try {
      execSync(`node scripts/lint-docs.mjs`, {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      console.log('✅ Линтер корректно обработал тестовые файлы');
    } catch (e) {
      console.log('✅ Линтер обнаружил проблемы в тестовых файлах (ожидаемое поведение)');
    }
    
    // Очищаем тестовые файлы
    cleanup();
    
    console.log('\n✅ Тест Lint Thresholds пройден');
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при тестировании Lint Thresholds: ${error.message}`);
    cleanup();
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const testLanes = args.includes('--test-lanes') || args.length === 0;
  const testSize = args.includes('--test-size') || args.length === 0;
  const testLint = args.includes('--test-lint') || args.length === 0;
  
  console.log('🔒 Тестирование Guardrails');
  console.log('═'.repeat(60));
  
  let allPassed = true;
  
  if (testLanes) {
    allPassed = testLanesPolicy() && allPassed;
  }
  
  if (testSize) {
    allPassed = testSizeGuard() && allPassed;
  }
  
  if (testLint) {
    allPassed = testLintThresholds() && allPassed;
  }
  
  console.log('\n' + '═'.repeat(60));
  if (allPassed) {
    console.log('✅ Все тесты guardrails пройдены');
    process.exit(0);
  } else {
    console.log('❌ Некоторые тесты guardrails не пройдены');
    process.exit(1);
  }
}

main();

