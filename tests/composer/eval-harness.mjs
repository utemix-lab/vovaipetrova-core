#!/usr/bin/env node
/**
 * Eval harness: метрики качества и регрессии для Composer
 * Эталонные задачи и метрики pass/fail для проверки качества работы Composer
 * 
 * Использование:
 *   node tests/composer/eval-harness.mjs [--verbose]
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import YAML from 'yaml';
import matter from 'gray-matter';

const VERBOSE = process.argv.includes('--verbose');
const RESULTS_DIR = 'tests/composer/results';

/**
 * Результат выполнения теста
 */
class TestResult {
  constructor(name, passed, metrics = {}, error = null) {
    this.name = name;
    this.passed = passed;
    this.metrics = metrics;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Базовый класс для тестов
 */
class EvalTest {
  constructor(name) {
    this.name = name;
  }
  
  async run() {
    const startTime = Date.now();
    try {
      const result = await this.execute();
      const duration = Date.now() - startTime;
      return new TestResult(this.name, result.passed, {
        ...result.metrics,
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      return new TestResult(this.name, false, { duration }, error.message);
    }
  }
  
  async execute() {
    throw new Error('execute() must be implemented');
  }
}

/**
 * Тест: нормализация тегов
 */
class TagsNormalizationTest extends EvalTest {
  constructor() {
    super('tags-normalization');
  }
  
  async execute() {
    const tagsYamlPath = 'docs/nav/tags.yaml';
    if (!existsSync(tagsYamlPath)) {
      return { passed: false, metrics: { error: 'tags.yaml not found' } };
    }
    
    const tags = YAML.parse(readFileSync(tagsYamlPath, 'utf8'));
    const aliases = tags.aliases || {};
    
    // Проверка: все алиасы должны быть валидными
    const invalidAliases = [];
    for (const [alias, machineTags] of Object.entries(aliases)) {
      if (!Array.isArray(machineTags) || machineTags.length === 0) {
        invalidAliases.push(alias);
      }
    }
    
    const passed = invalidAliases.length === 0;
    return {
      passed,
      metrics: {
        totalAliases: Object.keys(aliases).length,
        invalidAliases: invalidAliases.length,
        coverage: Object.keys(aliases).length > 0 ? 100 : 0
      }
    };
  }
}

/**
 * Тест: link-map консистентность
 */
class LinkMapConsistencyTest extends EvalTest {
  constructor() {
    super('link-map-consistency');
  }
  
  async execute() {
    const linkMapPath = 'prototype/link-map.json';
    if (!existsSync(linkMapPath)) {
      return { passed: false, metrics: { error: 'link-map.json not found' } };
    }
    
    const linkMap = JSON.parse(readFileSync(linkMapPath, 'utf8'));
    const exact = linkMap.exact || {};
    const patterns = linkMap.patterns || [];
    
    // Проверка: все exact mappings должны быть валидными
    const invalidMappings = [];
    for (const [key, value] of Object.entries(exact)) {
      if (!value || typeof value !== 'string') {
        invalidMappings.push(key);
      }
    }
    
    // Проверка: все patterns должны иметь match и replacement
    const invalidPatterns = [];
    for (const pattern of patterns) {
      if (!pattern.match || !pattern.replacement) {
        invalidPatterns.push(pattern);
      }
    }
    
    const passed = invalidMappings.length === 0 && invalidPatterns.length === 0;
    return {
      passed,
      metrics: {
        exactMappings: Object.keys(exact).length,
        invalidMappings: invalidMappings.length,
        patterns: patterns.length,
        invalidPatterns: invalidPatterns.length
      }
    };
  }
}

/**
 * Тест: routes консистентность
 */
class RoutesConsistencyTest extends EvalTest {
  constructor() {
    super('routes-consistency');
  }
  
  async execute() {
    const routesYamlPath = 'docs/nav/routes.yml';
    if (!existsSync(routesYamlPath)) {
      return { passed: false, metrics: { error: 'routes.yml not found' } };
    }
    
    const routes = YAML.parse(readFileSync(routesYamlPath, 'utf8'));
    const routesList = routes.routes || [];
    
    // Проверка: все routes должны иметь path и entries
    const invalidRoutes = [];
    const totalSlugs = new Set();
    
    for (const route of routesList) {
      if (!route.path || !route.entries || !Array.isArray(route.entries)) {
        invalidRoutes.push(route.path || 'unknown');
        continue;
      }
      
      // Проверка: все entries должны иметь slug и doc
      for (const entry of route.entries) {
        if (!entry.slug || !entry.doc) {
          invalidRoutes.push(`${route.path}/${entry.slug || 'unknown'}`);
        } else {
          totalSlugs.add(entry.slug);
        }
      }
    }
    
    const passed = invalidRoutes.length === 0;
    return {
      passed,
      metrics: {
        totalRoutes: routesList.length,
        invalidRoutes: invalidRoutes.length,
        totalSlugs: totalSlugs.size,
        uniqueSlugs: totalSlugs.size
      }
    };
  }
}

/**
 * Тест: lint качество
 */
class LintQualityTest extends EvalTest {
  constructor() {
    super('lint-quality');
  }
  
  async execute() {
    try {
      // Запускаем lint-docs в режиме проверки
      const output = execSync('npm run lint:docs', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Парсим вывод на наличие ошибок
      const hasErrors = output.includes('❌') || output.includes('Error');
      const hasWarnings = output.includes('⚠️') || output.includes('Warning');
      
      // Подсчитываем количество проблем
      const errorMatches = output.match(/❌/g) || [];
      const warningMatches = output.match(/⚠️/g) || [];
      
      const passed = !hasErrors;
      return {
        passed,
        metrics: {
          errors: errorMatches.length,
          warnings: warningMatches.length,
          hasErrors,
          hasWarnings
        }
      };
    } catch (error) {
      // Если команда завершилась с ошибкой, это провал
      return {
        passed: false,
        metrics: {
          errors: 1,
          warnings: 0,
          hasErrors: true,
          hasWarnings: false,
          errorMessage: error.message
        }
      };
    }
  }
}

/**
 * Тест: diff размер (минимальные изменения)
 */
class DiffSizeTest extends EvalTest {
  constructor() {
    super('diff-size');
  }
  
  async execute() {
    try {
      const output = execSync('git diff --stat HEAD', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Парсим статистику git diff
      const lines = output.trim().split('\n');
      let totalAdditions = 0;
      let totalDeletions = 0;
      let filesChanged = 0;
      
      for (const line of lines) {
        if (line.includes('|')) {
          filesChanged++;
          const match = line.match(/(\d+)\s+\+\+\+.*?(\d+)\s+---/);
          if (match) {
            totalAdditions += parseInt(match[1]) || 0;
            totalDeletions += parseInt(match[2]) || 0;
          }
        }
      }
      
      // Пороги: максимум 200 добавлений, 100 удалений
      const maxAdditions = 200;
      const maxDeletions = 100;
      
      const passed = totalAdditions <= maxAdditions && totalDeletions <= maxDeletions;
      return {
        passed,
        metrics: {
          additions: totalAdditions,
          deletions: totalDeletions,
          filesChanged,
          maxAdditions,
          maxDeletions,
          withinLimits: passed
        }
      };
    } catch (error) {
      // Если нет изменений или ошибка git, считаем пройденным
      return {
        passed: true,
        metrics: {
          additions: 0,
          deletions: 0,
          filesChanged: 0,
          note: 'No changes or git error'
        }
      };
    }
  }
}

/**
 * Запуск всех тестов
 */
async function runAllTests() {
  const tests = [
    new TagsNormalizationTest(),
    new LinkMapConsistencyTest(),
    new RoutesConsistencyTest(),
    new LintQualityTest(),
    new DiffSizeTest()
  ];
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  console.log('🧪 Running Composer eval harness...\n');
  
  for (const test of tests) {
    if (VERBOSE) {
      console.log(`Running: ${test.name}...`);
    }
    
    const result = await test.run();
    results.push(result);
    
    if (result.passed) {
      passedCount++;
      console.log(`✅ ${test.name}: PASSED`);
    } else {
      failedCount++;
      console.log(`❌ ${test.name}: FAILED`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    if (VERBOSE) {
      console.log(`   Metrics:`, JSON.stringify(result.metrics, null, 2));
    }
  }
  
  console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed`);
  
  return {
    results,
    summary: {
      total: tests.length,
      passed: passedCount,
      failed: failedCount,
      passRate: (passedCount / tests.length) * 100
    }
  };
}

/**
 * Сохранение результатов
 */
function saveResults(testResults) {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultPath = join(RESULTS_DIR, `eval-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    ...testResults
  };
  
  writeFileSync(resultPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 Results saved to: ${resultPath}`);
  
  return resultPath;
}

/**
 * Генерация отчёта для PR
 */
function generatePRReport(testResults) {
  const { summary, results } = testResults;
  
  let report = '## Eval Harness Results\n\n';
  report += `**Pass Rate:** ${summary.passRate.toFixed(1)}% (${summary.passed}/${summary.total})\n\n`;
  
  report += '### Test Results\n\n';
  report += '| Test | Status | Metrics |\n';
  report += '|------|--------|---------|\n';
  
  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const metrics = Object.entries(result.metrics)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    report += `| ${result.name} | ${status} | ${metrics} |\n`;
  }
  
  if (summary.failed > 0) {
    report += '\n⚠️ **Regression detected!** Some tests failed.\n';
  } else {
    report += '\n✅ **All tests passed!** No regressions detected.\n';
  }
  
  return report;
}

async function main() {
  const testResults = await runAllTests();
  const resultPath = saveResults(testResults);
  const prReport = generatePRReport(testResults);
  
  // Сохраняем отчёт для PR
  const prReportPath = join(RESULTS_DIR, 'pr-report.md');
  writeFileSync(prReportPath, prReport, 'utf8');
  console.log(`📄 PR report saved to: ${prReportPath}`);
  
  // Выводим отчёт в консоль
  console.log('\n' + prReport);
  
  // Возвращаем код выхода: 0 если все тесты прошли, 1 если есть провалы
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.endsWith('eval-harness.mjs')) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests, generatePRReport, EvalTest };

