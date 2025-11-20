#!/usr/bin/env node
/**
 * Sanity-check для экспорта Notion → GitHub
 * Проверяет наличие ключевых узлов, валидность front matter, актуальность индексов, целостность ссылок
 * 
 * Использование:
 *   node scripts/sanity-check.mjs
 *   node scripts/sanity-check.mjs --check-key-nodes
 *   node scripts/sanity-check.mjs --check-front-matter
 *   node scripts/sanity-check.mjs --check-indices
 *   node scripts/sanity-check.mjs --check-links
 *   node scripts/sanity-check.mjs --check-lint
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { globSync } from 'glob';
import matter from 'gray-matter';
import YAML from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCS_ROOT = join(__dirname, '../docs');
const ROUTES_YML = join(__dirname, '../docs/nav/routes.yml');
const TAGS_YAML = join(__dirname, '../docs/nav/tags.yaml');
const STATS_JSON = join(__dirname, '../prototype/data/stats.json');
const BROKEN_LINKS_JSON = join(__dirname, '../prototype/data/broken-links.json');

// Ключевые узлы, которые должны присутствовать
const KEY_NODES = [
  'docs/think-tank-kompaktnoe-yadro.md',
  'docs/adr-source-of-truth-mirroring.md',
  'docs/protocol-kontraktnaya-model-dlya-agentov.md',
  'docs/nav/routes.yml',
  'docs/nav/tags.yaml'
];

const errors = [];
const warnings = [];
let checksRun = 0;
let checksPassed = 0;

function checkKeyNodes() {
  console.log('\n🔍 Checking key nodes...');
  checksRun++;
  
  const missing = [];
  for (const node of KEY_NODES) {
    if (!existsSync(join(__dirname, '..', node))) {
      missing.push(node);
    }
  }
  
  if (missing.length > 0) {
    errors.push(`Missing key nodes: ${missing.join(', ')}`);
    console.log(`❌ Missing ${missing.length} key node(s):`);
    missing.forEach(n => console.log(`   - ${n}`));
  } else {
    checksPassed++;
    console.log(`✅ All ${KEY_NODES.length} key nodes present`);
  }
}

function checkFrontMatter() {
  console.log('\n🔍 Checking front matter validity...');
  checksRun++;
  
  const files = globSync(`${DOCS_ROOT}/**/*.md`, { nodir: true });
  const invalid = [];
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      const parsed = matter(content);
      const data = parsed.data || {};
      
      const issues = [];
      if (!data.title || data.title.trim() === '') {
        issues.push('missing or empty title');
      }
      if (!data.slug || data.slug.trim() === '') {
        issues.push('missing or empty slug');
      }
      if (!data.status) {
        issues.push('missing status');
      } else if (!['draft', 'review', 'ready'].includes(data.status)) {
        issues.push(`invalid status: ${data.status}`);
      }
      
      // Для файлов из Notion должны быть notion_page_id и last_edited_time
      // Но не все файлы могут быть из Notion, поэтому это предупреждение
      if (!data.notion_page_id && !data.service) {
        warnings.push(`${file}: missing notion_page_id (may not be from Notion)`);
      }
      
      if (issues.length > 0) {
        invalid.push({ file, issues });
      }
    } catch (error) {
      invalid.push({ file, issues: [`parse error: ${error.message}`] });
    }
  }
  
  if (invalid.length > 0) {
    errors.push(`Invalid front matter in ${invalid.length} file(s)`);
    console.log(`❌ Found ${invalid.length} file(s) with invalid front matter:`);
    invalid.slice(0, 10).forEach(({ file, issues }) => {
      console.log(`   - ${file}: ${issues.join(', ')}`);
    });
    if (invalid.length > 10) {
      console.log(`   ... and ${invalid.length - 10} more`);
    }
  } else {
    checksPassed++;
    console.log(`✅ All ${files.length} files have valid front matter`);
  }
}

function checkIndices() {
  console.log('\n🔍 Checking indices...');
  checksRun++;
  
  let hasErrors = false;
  
  // Проверка routes.yml
  if (!existsSync(ROUTES_YML)) {
    errors.push('routes.yml not found');
    hasErrors = true;
    console.log('❌ routes.yml not found');
  } else {
    try {
      const content = readFileSync(ROUTES_YML, 'utf8');
      YAML.parse(content);
      console.log('✅ routes.yml is valid YAML');
    } catch (error) {
      errors.push(`routes.yml parse error: ${error.message}`);
      hasErrors = true;
      console.log(`❌ routes.yml parse error: ${error.message}`);
    }
  }
  
  // Проверка tags.yaml
  if (!existsSync(TAGS_YAML)) {
    errors.push('tags.yaml not found');
    hasErrors = true;
    console.log('❌ tags.yaml not found');
  } else {
    try {
      const content = readFileSync(TAGS_YAML, 'utf8');
      YAML.parse(content);
      console.log('✅ tags.yaml is valid YAML');
    } catch (error) {
      errors.push(`tags.yaml parse error: ${error.message}`);
      hasErrors = true;
      console.log(`❌ tags.yaml parse error: ${error.message}`);
    }
  }
  
  // Проверка orphan pages (если скрипт доступен)
  try {
    execSync('npm run routes:check', { stdio: 'pipe', encoding: 'utf8' });
    console.log('✅ Routes consistency check passed');
  } catch (error) {
    warnings.push('Routes consistency check failed or found orphans');
    console.log('⚠️  Routes consistency check failed (may have orphans)');
  }
  
  if (!hasErrors) {
    checksPassed++;
  }
}

function checkLinks() {
  console.log('\n🔍 Checking link integrity...');
  checksRun++;
  
  // Проверка broken-links.json
  if (!existsSync(BROKEN_LINKS_JSON)) {
    warnings.push('broken-links.json not found (run diagnostics:snapshot)');
    console.log('⚠️  broken-links.json not found (run npm run diagnostics:snapshot)');
  } else {
    try {
      const brokenLinks = JSON.parse(readFileSync(BROKEN_LINKS_JSON, 'utf8'));
      const internalMissing = brokenLinks.issues?.filter(
        i => i.reason === 'missing' && !i.link.startsWith('http')
      ).length || 0;
      
      if (internalMissing > 0) {
        errors.push(`Found ${internalMissing} internal-missing links`);
        console.log(`❌ Found ${internalMissing} internal-missing link(s)`);
      } else {
        console.log('✅ No internal-missing links');
      }
    } catch (error) {
      warnings.push(`broken-links.json parse error: ${error.message}`);
      console.log(`⚠️  broken-links.json parse error: ${error.message}`);
    }
  }
  
  // Проверка stats.json
  if (!existsSync(STATS_JSON)) {
    warnings.push('stats.json not found (run diagnostics:snapshot)');
    console.log('⚠️  stats.json not found (run npm run diagnostics:snapshot)');
  } else {
    try {
      const stats = JSON.parse(readFileSync(STATS_JSON, 'utf8'));
      const internalMissing = stats.totals?.issues_internal_missing || 0;
      
      if (internalMissing > 0) {
        errors.push(`Stats show ${internalMissing} internal-missing links`);
        console.log(`❌ Stats show ${internalMissing} internal-missing link(s)`);
      } else {
        console.log('✅ Stats show no internal-missing links');
      }
    } catch (error) {
      warnings.push(`stats.json parse error: ${error.message}`);
      console.log(`⚠️  stats.json parse error: ${error.message}`);
    }
  }
  
  if (errors.filter(e => e.includes('internal-missing')).length === 0) {
    checksPassed++;
  }
}

function checkLint() {
  console.log('\n🔍 Checking linting...');
  checksRun++;
  
  try {
    execSync('npm run lint:docs', { stdio: 'pipe', encoding: 'utf8' });
    console.log('✅ Linting passed');
    checksPassed++;
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    const hasErrors = output.includes('error') || output.includes('Error');
    
    if (hasErrors) {
      errors.push('Linting found errors');
      console.log('❌ Linting found errors (check output above)');
    } else {
      warnings.push('Linting found warnings');
      console.log('⚠️  Linting found warnings (non-blocking)');
      checksPassed++; // Предупреждения не блокируют
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  const checkAll = args.length === 0;
  
  console.log('🔍 Running sanity-check for Notion → GitHub export...\n');
  
  if (checkAll || args.includes('--check-key-nodes')) {
    checkKeyNodes();
  }
  if (checkAll || args.includes('--check-front-matter')) {
    checkFrontMatter();
  }
  if (checkAll || args.includes('--check-indices')) {
    checkIndices();
  }
  if (checkAll || args.includes('--check-links')) {
    checkLinks();
  }
  if (checkAll || args.includes('--check-lint')) {
    checkLint();
  }
  
  // Итоговый отчёт
  console.log('\n' + '='.repeat(60));
  console.log('📊 Sanity-check Summary');
  console.log('='.repeat(60));
  console.log(`Checks run: ${checksRun}`);
  console.log(`Checks passed: ${checksPassed}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.slice(0, 5).forEach(w => console.log(`   - ${w}`));
    if (warnings.length > 5) {
      console.log(`   ... and ${warnings.length - 5} more`);
    }
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
    console.log('\n❌ Sanity-check FAILED');
    console.log('Please fix errors before merging.');
    process.exit(1);
  } else if (checksPassed === checksRun) {
    console.log('\n✅ Sanity-check PASSED');
    console.log('Export is ready to merge.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Sanity-check PASSED with warnings');
    console.log('Export can be merged, but consider fixing warnings.');
    process.exit(0);
  }
}

main();

