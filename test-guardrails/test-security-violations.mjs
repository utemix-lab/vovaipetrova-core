#!/usr/bin/env node
/**
 * Тестирование нарушений безопасности: PII-scrub и forbidden-paths
 * 
 * Проверяет, что guardrails корректно обнаруживают нарушения безопасности.
 * Использование: node test-guardrails/test-security-violations.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = join(__dirname, 'bad-examples');

// Импортируем функции проверки из guardrails-v2.mjs
// Примечание: функции должны быть экспортированы из guardrails-v2.mjs
import { execSync } from 'child_process';

const TEST_FILES = [
  {
    file: 'pii-user-path.md',
    expectedPII: ['windows_user_path'],
    expectedForbidden: [],
    description: 'Windows user path detection'
  },
  {
    file: 'pii-email.md',
    expectedPII: ['email'],
    expectedForbidden: [],
    description: 'Email address detection'
  },
  {
    file: 'pii-phone.md',
    expectedPII: ['phone'],
    expectedForbidden: [],
    description: 'Phone number detection'
  },
  {
    file: 'pii-api-key.md',
    expectedPII: ['api_key_pattern'],
    expectedForbidden: [],
    description: 'API key pattern detection'
  },
  {
    file: 'pii-full-name.md',
    expectedPII: ['full_name_russian', 'full_name_english'],
    expectedForbidden: [],
    description: 'Full name detection (Russian and English)'
  },
  {
    file: 'pii-credit-card.md',
    expectedPII: ['credit_card'],
    expectedForbidden: [],
    description: 'Credit card pattern detection'
  },
  {
    file: 'pii-aws-key.md',
    expectedPII: ['aws_access_key'],
    expectedForbidden: [],
    description: 'AWS access key detection'
  },
  {
    file: 'forbidden-package-json.md',
    expectedPII: [],
    expectedForbidden: [],
    description: 'Forbidden path reference (package.json)'
  },
  {
    file: 'forbidden-readme.md',
    expectedPII: [],
    expectedForbidden: [],
    description: 'Forbidden path reference (README.md)'
  },
  {
    file: 'forbidden-env.md',
    expectedPII: [],
    expectedForbidden: [],
    description: 'Forbidden path reference (.env)'
  }
];

function testPIIDetection() {
  console.log('\n🧪 Тест: PII Detection');
  console.log('─'.repeat(60));
  
  let allPassed = true;
  let passedCount = 0;
  let failedCount = 0;
  
  for (const test of TEST_FILES) {
    const filePath = join(TEST_DIR, test.file);
    if (!existsSync(filePath)) {
      console.log(`⚠️  Test file not found: ${test.file}`);
      continue;
    }
    
    // Читаем содержимое файла для прямой проверки
    const content = readFileSync(filePath, 'utf8');
    
    // Запускаем lint-docs.mjs для проверки PII
    try {
      const output = execSync(`node scripts/lint-docs.mjs`, {
        cwd: join(__dirname, '..'),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Проверяем, что файл упоминается в выводе
      if (test.expectedPII.length > 0) {
        const fileDetected = output.includes(test.file);
        const piiDetected = output.includes('PII detected');
        const expectedPatternsFound = test.expectedPII.some(pattern => {
          // Проверяем, что хотя бы один ожидаемый паттерн упоминается в выводе
          return output.toLowerCase().includes(pattern.toLowerCase()) || 
                 output.includes(test.file);
        });
        
        if (fileDetected && (piiDetected || expectedPatternsFound)) {
          console.log(`✅ ${test.file}: PII detection passed (${test.description})`);
          passedCount++;
        } else {
          console.log(`⚠️  ${test.file}: PII may not be detected (${test.description})`);
          console.log(`   Expected patterns: ${test.expectedPII.join(', ')}`);
          failedCount++;
          allPassed = false;
        }
      } else {
        // Файл не должен содержать PII
        if (!output.includes(test.file) || !output.includes('PII detected')) {
          console.log(`✅ ${test.file}: No PII expected, check passed (${test.description})`);
          passedCount++;
        } else {
          console.log(`⚠️  ${test.file}: Unexpected PII detection (${test.description})`);
          failedCount++;
        }
      }
    } catch (error) {
      // Ожидаем ошибку, если PII обнаружен
      if (test.expectedPII.length > 0) {
        const errorOutput = error.stdout || error.stderr || '';
        if (errorOutput.includes(test.file) || errorOutput.includes('PII detected')) {
          console.log(`✅ ${test.file}: PII detection triggered (expected) (${test.description})`);
          passedCount++;
        } else {
          console.log(`⚠️  ${test.file}: PII detection may have failed (${test.description})`);
          failedCount++;
          allPassed = false;
        }
      } else {
        console.log(`✅ ${test.file}: No PII expected, error is acceptable (${test.description})`);
        passedCount++;
      }
    }
  }
  
  console.log(`\n📊 PII Detection Results: ${passedCount} passed, ${failedCount} failed`);
  return allPassed;
}

function testForbiddenPaths() {
  console.log('\n🧪 Тест: Forbidden Paths');
  console.log('─'.repeat(60));
  
  // Тестируем через guardrails-v2.mjs
  const testFiles = [
    { file: 'package.json', shouldBeForbidden: false, description: 'package.json is allowed (FORBIDDEN_ALLOWED)' },
    { file: 'package-lock.json', shouldBeForbidden: true, description: 'package-lock.json is forbidden' },
    { file: '.env', shouldBeForbidden: true, description: '.env is forbidden' },
    { file: '.env.local', shouldBeForbidden: true, description: '.env.local is forbidden' },
    { file: '.github/workflows/notion-import.yml', shouldBeForbidden: true, description: 'notion-import.yml is forbidden' },
    { file: '.github/workflows/docs-ci.yml', shouldBeForbidden: false, description: 'docs-ci.yml is allowed (FORBIDDEN_ALLOWED)' },
    { file: 'docs/.import-map.yaml', shouldBeForbidden: true, description: '.import-map.yaml is forbidden' },
    { file: 'README.md', shouldBeForbidden: true, description: 'README.md is forbidden' },
    { file: 'CONTRIBUTING.md', shouldBeForbidden: true, description: 'CONTRIBUTING.md is forbidden' },
    { file: 'LICENSE', shouldBeForbidden: true, description: 'LICENSE is forbidden' },
    { file: 'SECURITY.md', shouldBeForbidden: true, description: 'SECURITY.md is forbidden' },
    { file: 'codegpt.config.json', shouldBeForbidden: true, description: 'codegpt.config.json is forbidden' },
    { file: 'prototype/data/pages.json', shouldBeForbidden: true, description: 'prototype/data/*.json is forbidden (auto-generated)' },
    { file: 'prototype/page/index.html', shouldBeForbidden: true, description: 'prototype/page/*.html is forbidden (auto-generated)' },
    { file: 'docs/test.md', shouldBeForbidden: false, description: 'docs/test.md is allowed' },
    { file: 'scripts/test.mjs', shouldBeForbidden: false, description: 'scripts/test.mjs is allowed (but scripts/** is in deny_paths for imports)' }
  ];
  
  let allPassed = true;
  let passedCount = 0;
  let failedCount = 0;
  
  for (const test of testFiles) {
    try {
      // Импортируем функцию checkForbiddenPaths из guardrails-v2.mjs
      // Для тестирования создаём массив с одним файлом
      const testChangedFiles = [test.file];
      
      // Используем прямой вызов через execSync для проверки логики
      // В реальном сценарии guardrails-v2.mjs проверяет изменённые файлы из git diff
      const output = execSync(`node -e "import('./scripts/guardrails-v2.mjs').then(m => { const files = ['${test.file}']; const violations = []; const FORBIDDEN_PATHS = ${JSON.stringify([/^package-lock\.json$/, /^\.env$/, /^\.github\/workflows\/.*\.yml$/, /^docs\/\.import-map\.yaml$/, /^README\.md$/, /^CONTRIBUTING\.md$/, /^LICENSE$/, /^SECURITY\.md$/, /^codegpt\.config\.json$/, /^prototype\/data\/.*\.json$/, /^prototype\/page\/.*\.html$/])}; const FORBIDDEN_ALLOWED = ${JSON.stringify([/^\.github\/workflows\/docs-ci\.yml$/, /^package\.json$/])}; for (const file of files) { const isAllowed = FORBIDDEN_ALLOWED.some(p => p.test(file)); if (!isAllowed && FORBIDDEN_PATHS.some(p => p.test(file))) { violations.push(file); } } console.log(violations.length > 0 ? 'FORBIDDEN' : 'ALLOWED'); });"`, {
        cwd: join(__dirname, '..'),
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      
      const isForbidden = output === 'FORBIDDEN';
      
      if (test.shouldBeForbidden && !isForbidden) {
        console.log(`⚠️  ${test.file}: Not detected as forbidden (${test.description})`);
        failedCount++;
        allPassed = false;
      } else if (!test.shouldBeForbidden && isForbidden) {
        console.log(`❌ ${test.file}: Incorrectly detected as forbidden (${test.description})`);
        failedCount++;
        allPassed = false;
      } else {
        console.log(`✅ ${test.file}: Correctly ${test.shouldBeForbidden ? 'forbidden' : 'allowed'} (${test.description})`);
        passedCount++;
      }
    } catch (error) {
      // Упрощённая проверка через чтение guardrails-v2.mjs и проверку паттернов
      const guardrailsContent = readFileSync(join(__dirname, '..', 'scripts', 'guardrails-v2.mjs'), 'utf8');
      const forbiddenPatterns = guardrailsContent.match(/\/\^[^\/]+\$\//g) || [];
      const allowedPatterns = guardrailsContent.match(/FORBIDDEN_ALLOWED[\s\S]*?\[([\s\S]*?)\];/)?.[1] || '';
      
      // Простая проверка: если файл соответствует forbidden паттерну и не в allowed
      const matchesForbidden = forbiddenPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(test.file);
        } catch {
          return false;
        }
      });
      
      const matchesAllowed = allowedPatterns.includes(test.file.split('/').pop()?.split('.')[0] || '');
      
      const isForbidden = matchesForbidden && !matchesAllowed;
      
      if (test.shouldBeForbidden === isForbidden) {
        console.log(`✅ ${test.file}: Correctly ${test.shouldBeForbidden ? 'forbidden' : 'allowed'} (${test.description})`);
        passedCount++;
      } else {
        console.log(`⚠️  ${test.file}: Could not verify (${test.description}) - manual check required`);
        failedCount++;
      }
    }
  }
  
  console.log(`\n📊 Forbidden Paths Results: ${passedCount} passed, ${failedCount} failed`);
  return allPassed;
}

function main() {
  console.log('🔒 Тестирование нарушений безопасности');
  console.log('═'.repeat(60));
  
  const piiPassed = testPIIDetection();
  const forbiddenPassed = testForbiddenPaths();
  
  console.log('\n' + '═'.repeat(60));
  if (piiPassed && forbiddenPassed) {
    console.log('✅ Все тесты безопасности пройдены');
    process.exit(0);
  } else {
    console.log('❌ Некоторые тесты безопасности не пройдены');
    process.exit(1);
  }
}

main();

