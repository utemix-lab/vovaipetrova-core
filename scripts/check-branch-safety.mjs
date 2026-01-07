#!/usr/bin/env node
/**
 * Branch Safety Preset: проверка безопасности имён веток
 *
 * Проверяет, что имя ветки соответствует конвенциям проекта:
 * - Использует правильные префиксы: feat/, fix/, docs/, chore/, notion-sync/
 * - Не содержит запрещённых символов
 * - Соответствует формату kebab-case
 *
 * Использование:
 *   node scripts/check-branch-safety.mjs [--branch=<name>]
 *
 * В CI используется автоматически через переменную окружения GITHUB_HEAD_REF
 */

// Разрешённые префиксы веток
const ALLOWED_PREFIXES = [
  'feat/',      // Новые возможности
  'fix/',       // Исправления, багфиксы
  'docs/',      // Документация
  'chore/',     // Инфраструктура, скрипты
  'notion-sync/', // Автоматический импорт из Notion
  'refactor/',  // Рефакторинг
  'test/',      // Тесты
];

// Запрещённые символы в именах веток
const FORBIDDEN_CHARS = /[^a-z0-9\/\-_]/;

// Запрещённые имена веток (защищённые ветки)
const PROTECTED_BRANCHES = [
  'main',
  'master',
  'develop',
  'dev',
  'production',
  'prod',
];

function log(message) {
  console.log(`[branch-safety] ${message}`);
}

function parseArgs() {
  const args = {
    branch: null,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--branch=')) {
      args.branch = arg.split('=', 2)[1];
    }
  }

  return args;
}

/**
 * Проверяет, соответствует ли имя ветки конвенциям
 */
function validateBranchName(branchName) {
  if (!branchName) {
    return {
      valid: false,
      error: 'Имя ветки не указано'
    };
  }

  // Проверка на защищённые ветки
  if (PROTECTED_BRANCHES.includes(branchName.toLowerCase())) {
    return {
      valid: false,
      error: `Ветка "${branchName}" является защищённой и не может быть использована для разработки`
    };
  }

  // Проверка на запрещённые символы
  if (FORBIDDEN_CHARS.test(branchName)) {
    const forbiddenMatch = branchName.match(FORBIDDEN_CHARS);
    return {
      valid: false,
      error: `Имя ветки содержит запрещённые символы: "${forbiddenMatch[0]}"`
    };
  }

  // Проверка префикса
  const hasValidPrefix = ALLOWED_PREFIXES.some(prefix => branchName.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return {
      valid: false,
      error: `Имя ветки должно начинаться с одного из префиксов: ${ALLOWED_PREFIXES.join(', ')}`,
      suggestion: `Рекомендуется использовать формат: ${ALLOWED_PREFIXES[0]}<описание-изменений>`
    };
  }

  // Проверка формата после префикса (kebab-case)
  const afterPrefix = branchName.split('/').slice(1).join('/');
  if (afterPrefix && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(afterPrefix)) {
    return {
      valid: false,
      error: `Часть после префикса должна быть в формате kebab-case (только строчные буквы, цифры и дефисы)`,
      suggestion: `Пример: ${branchName.split('/')[0]}/my-feature-name`
    };
  }

  return {
    valid: true,
    prefix: branchName.split('/')[0],
    description: afterPrefix || 'без описания'
  };
}

function main() {
  const args = parseArgs();
  
  // В CI используем переменную окружения GITHUB_HEAD_REF
  // Локально можно передать через --branch=
  const branchName = args.branch || 
                     process.env.GITHUB_HEAD_REF || 
                     process.env.CI_BRANCH_NAME ||
                     null;

  if (!branchName) {
    log('ℹ️  Имя ветки не указано. Пропускаем проверку.');
    log('   Использование: node scripts/check-branch-safety.mjs --branch=<name>');
    log('   В CI используется автоматически через GITHUB_HEAD_REF');
    process.exit(0);
  }

  log(`Проверка безопасности ветки: ${branchName}`);

  const result = validateBranchName(branchName);

  if (!result.valid) {
    log(`❌ Ветка не соответствует конвенциям безопасности:`);
    log(`   ${result.error}`);
    
    if (result.suggestion) {
      log(`   💡 Рекомендация: ${result.suggestion}`);
    }
    
    log('');
    log('📖 Правила именования веток:');
    log('   - Префиксы: feat/, fix/, docs/, chore/, notion-sync/, refactor/, test/');
    log('   - Формат: kebab-case (строчные буквы, цифры, дефисы)');
    log('   - Примеры: feat/my-feature, fix/bug-description, docs/update-readme');
    log('');
    log('📖 См. также: CONTRIBUTING.md и docs/SINGLE-SOURCE-PLAYBOOK.md');
    
    process.exit(1);
  }

  log(`✅ Ветка соответствует конвенциям безопасности`);
  log(`   Префикс: ${result.prefix}`);
  log(`   Описание: ${result.description}`);
  
  process.exit(0);
}

main();

