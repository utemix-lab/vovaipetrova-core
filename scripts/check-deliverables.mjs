#!/usr/bin/env node
/**
 * Проверка наличия и корректности секции Deliverables в PR описании
 * 
 * Использование:
 *   node scripts/check-deliverables.mjs <PR_BODY_FILE>
 *   или
 *   echo "$PR_BODY" | node scripts/check-deliverables.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function checkDeliverables(prBody) {
  if (!prBody || prBody.trim().length === 0) {
    console.log('⚠️ PR body is empty, skipping Deliverables check');
    return { passed: true, warnings: ['PR body is empty'] };
  }

  const issues = [];
  const warnings = [];

  // Проверка наличия секции Deliverables
  if (!prBody.includes('## Deliverables')) {
    issues.push('Deliverables section not found');
    return { passed: false, issues, warnings };
  }

  console.log('✅ Deliverables section found in PR');

  // Проверка обязательных полей
  const requiredFields = [
    { name: 'Executor', pattern: /Executor\s*:/i },
    { name: 'Status', pattern: /Status\s*:/i },
    { name: 'Task', pattern: /Task\s*:/i }
  ];

  const missingFields = [];
  for (const field of requiredFields) {
    if (!field.pattern.test(prBody)) {
      missingFields.push(field.name);
    }
  }

  if (missingFields.length > 0) {
    issues.push(`Missing required fields: ${missingFields.join(', ')}`);
  } else {
    console.log('✅ Required fields (Executor, Status, Task) found');
  }

  // Проверка опциональных полей (предупреждения)
  const optionalFields = [
    { name: 'Completed', pattern: /###\s*Completed/i },
    { name: 'Changes', pattern: /###\s*Changes/i },
    { name: 'Files Changed', pattern: /###\s*Files Changed/i }
  ];

  const missingOptional = [];
  for (const field of optionalFields) {
    if (!field.pattern.test(prBody)) {
      missingOptional.push(field.name);
    }
  }

  if (missingOptional.length > 0) {
    warnings.push(`Optional fields not found: ${missingOptional.join(', ')}`);
  }

  // Проверка формата Status
  const statusMatch = prBody.match(/Status\s*:\s*([^\n]+)/i);
  if (statusMatch) {
    const status = statusMatch[1].trim();
    const validStatuses = ['✅ Completed', '⏳ In Progress', '❌ Blocked', 'Completed', 'In Progress', 'Blocked'];
    if (!validStatuses.some(vs => status.includes(vs))) {
      warnings.push(`Status format might be incorrect: "${status}" (expected: ✅ Completed | ⏳ In Progress | ❌ Blocked)`);
    }
  }

  const passed = issues.length === 0;
  return { passed, issues, warnings };
}

function main() {
  let prBody = '';

  // Читаем из файла или stdin
  if (process.argv[2]) {
    try {
      prBody = readFileSync(process.argv[2], 'utf8');
    } catch (error) {
      console.error(`❌ Error reading file: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Читаем из stdin
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      prBody = chunks.join('');
      const result = checkDeliverables(prBody);
      printResult(result);
    });
    return;
  }

  const result = checkDeliverables(prBody);
  printResult(result);
}

function printResult(result) {
  if (result.warnings && result.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (result.issues && result.issues.length > 0) {
    console.log('\n❌ Issues:');
    result.issues.forEach(i => console.log(`   - ${i}`));
    console.log('\nConsider adding a Deliverables section according to docs/protocol-kontraktnaya-model-dlya-agentov.md');
    process.exit(1);
  }

  if (result.passed) {
    console.log('\n✅ Deliverables check passed');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith('check-deliverables.mjs')) {
  main();
}

export { checkDeliverables };

