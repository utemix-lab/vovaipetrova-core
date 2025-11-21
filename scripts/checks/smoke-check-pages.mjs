#!/usr/bin/env node
/**
 * Smoke checks для GitHub Pages после релиза
 * Проверяет доступность и базовые метаданные 3 ключевых страниц
 * 
 * Использование:
 *   node scripts/checks/smoke-check-pages.mjs <BASE_URL>
 *   BASE_URL - базовый URL сайта (например, https://utemix-lab.github.io/vovaipetrova-core)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.argv[2] || process.env.PAGES_URL || 'https://utemix-lab.github.io/vovaipetrova-core';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 секунд между попытками

// Пути для проверки (3 пинга согласно требованиям)
const CHECK_PATHS = [
  { path: '/', name: 'Homepage', description: 'Главная страница', type: 'html' },
  { path: '/data/pages.json', name: 'Pages JSON', description: 'Данные pages.json', type: 'json' },
  { path: '/data/stats.json', name: 'Stats JSON', description: 'Статистика stats.json', type: 'json' }
];

/**
 * Выполняет HTTP запрос с повторными попытками
 */
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'GitHub-Actions-Smoke-Check/1.0'
        },
        redirect: 'follow'
      });
      
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        finalUrl: response.url
      };
    } catch (error) {
      if (i === retries - 1) {
        return {
          success: false,
          error: error.message,
          url
        };
      }
      // Ждём перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

/**
 * Проверяет базовые метаданные HTML страницы
 */
async function checkHTMLMetadata(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const charsetMatch = html.match(/<meta\s+charset=["']([^"']+)["']/i);
    const viewportMatch = html.match(/<meta\s+name=["']viewport["']/i);
    
    return {
      success: true,
      hasTitle: !!titleMatch,
      title: titleMatch ? titleMatch[1] : null,
      hasCharset: !!charsetMatch,
      charset: charsetMatch ? charsetMatch[1] : null,
      hasViewport: !!viewportMatch
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Проверяет валидность JSON
 */
async function checkJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const json = await response.json();
    return {
      success: true,
      isValidJSON: true,
      hasData: Array.isArray(json) ? json.length > 0 : Object.keys(json).length > 0,
      itemCount: Array.isArray(json) ? json.length : Object.keys(json).length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔥 Smoke checks для GitHub Pages\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results = [];
  const startTime = Date.now();
  
  for (const check of CHECK_PATHS) {
    const fullUrl = `${BASE_URL}${check.path}`;
    console.log(`🔍 Checking: ${check.name} (${check.path})`);
    
    const result = {
      name: check.name,
      path: check.path,
      url: fullUrl,
      description: check.description,
      timestamp: new Date().toISOString()
    };
    
    // Выполняем базовую проверку доступности
    const fetchResult = await fetchWithRetry(fullUrl);
    result.fetch = fetchResult;
    
    if (fetchResult.success) {
      result.status = fetchResult.status;
      result.statusText = fetchResult.statusText;
      
      // Дополнительные проверки в зависимости от типа контента
      if (check.path.endsWith('.json')) {
        const jsonCheck = await checkJSON(fullUrl);
        result.jsonCheck = jsonCheck;
        if (jsonCheck.success) {
          console.log(`   ✅ Status: ${fetchResult.status}, Valid JSON: ${jsonCheck.isValidJSON}, Items: ${jsonCheck.itemCount}`);
        } else {
          console.log(`   ❌ Status: ${fetchResult.status}, JSON check failed: ${jsonCheck.error}`);
        }
      } else {
        const htmlCheck = await checkHTMLMetadata(fullUrl);
        result.htmlCheck = htmlCheck;
        if (htmlCheck.success) {
          console.log(`   ✅ Status: ${fetchResult.status}, Title: ${htmlCheck.title || 'N/A'}, Charset: ${htmlCheck.charset || 'N/A'}`);
        } else {
          console.log(`   ❌ Status: ${fetchResult.status}, HTML check failed: ${htmlCheck.error}`);
        }
      }
    } else {
      console.log(`   ❌ Failed: ${fetchResult.error}`);
      result.error = fetchResult.error;
    }
    
    results.push(result);
    console.log('');
  }
  
  const duration = Date.now() - startTime;
  
  // Подсчёт результатов
  const passed = results.filter(r => r.fetch?.success && r.fetch?.status === 200).length;
  const failed = results.length - passed;
  const allPassed = failed === 0;
  
  console.log('📊 Summary:');
  console.log(`   Total checks: ${results.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}ms\n`);
  
  // Генерация отчёта
  const reportDir = 'tests/smoke-checks/results';
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = join(reportDir, 'pages-smoke-check-report.md');
  let report = `# Pages Smoke Check Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Base URL: ${BASE_URL}\n`;
  report += `Duration: ${duration}ms\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total checks:** ${results.length}\n`;
  report += `- **Passed:** ${passed}\n`;
  report += `- **Failed:** ${failed}\n`;
  report += `- **Status:** ${allPassed ? '✅ PASS' : '❌ FAIL'}\n\n`;
  report += `## Detailed Results\n\n`;
  
  results.forEach((result, index) => {
    report += `### ${index + 1}. ${result.name} (${result.path})\n\n`;
    report += `- **URL:** ${result.url}\n`;
    report += `- **Status:** ${result.fetch?.success ? `✅ ${result.status}` : `❌ ${result.error || 'Failed'}`}\n`;
    
    if (result.fetch?.success) {
      report += `- **HTTP Status:** ${result.status} ${result.statusText}\n`;
      
      if (result.htmlCheck) {
        report += `- **HTML Metadata:**\n`;
        report += `  - Title: ${result.htmlCheck.title || 'N/A'}\n`;
        report += `  - Charset: ${result.htmlCheck.charset || 'N/A'}\n`;
        report += `  - Viewport: ${result.htmlCheck.hasViewport ? 'Yes' : 'No'}\n`;
      }
      
      if (result.jsonCheck) {
        report += `- **JSON Validation:**\n`;
        report += `  - Valid: ${result.jsonCheck.isValidJSON ? 'Yes' : 'No'}\n`;
        report += `  - Items: ${result.jsonCheck.itemCount || 0}\n`;
      }
    } else {
      report += `- **Error:** ${result.error}\n`;
    }
    
    report += `\n`;
  });
  
  report += `## Conclusion\n\n`;
  if (allPassed) {
    report += `✅ **All smoke checks passed!** Pages deployment is successful.\n`;
  } else {
    report += `❌ **Some smoke checks failed!** Please investigate the issues above.\n`;
  }
  
  writeFileSync(reportPath, report, 'utf8');
  console.log(`📄 Report saved to: ${reportPath}`);
  
  // Код выхода
  if (allPassed) {
    console.log('\n✅ All smoke checks passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some smoke checks failed!');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

