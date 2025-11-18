// scripts/stories-quality-scan.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';
import { resolve } from 'path';

const ROOT = process.cwd();
const STORIES_DIR = 'docs/stories';

function scanStory(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data || {};
  const body = parsed.content || '';
  
  const issues = [];
  const metrics = {
    file: filePath.replace(ROOT + '/', ''),
    slug: fm.slug || '',
    title: fm.title || '',
    status: fm.status || 'draft',
    hasSummary: !!fm.summary && String(fm.summary).trim().length > 0,
    summaryLength: fm.summary ? String(fm.summary).length : 0,
    bodyLength: body.length,
    hasTLDR: body.includes('TL;DR'),
    hasStructure: {
      whatHappened: /Что произошло/i.test(body),
      why: /Зачем/i.test(body),
      whatResulted: /Что получилось/i.test(body),
      techInsert: /Тех-вставка/i.test(body),
      whatNext: /Что дальше/i.test(body)
    },
    structureScore: 0,
    hasPersonalPronouns: /(?:^|\s)(?:я|мне|меня|мой|моя|мои|я считаю|я думаю|я хочу|по-моему|по моему)/i.test(body),
    hasPersonalNames: /дмитрий/i.test(body),
    hasPII: false,
    wordCount: body.split(/\s+/).filter(w => w.length > 0).length,
    charCount: body.length
  };
  
  // Calculate structure score
  const structureKeys = Object.keys(metrics.hasStructure);
  metrics.structureScore = structureKeys.filter(key => metrics.hasStructure[key]).length;
  
  // Check PII patterns
  const piiPatterns = [
    /[A-Za-z]:\\Users\\([A-Za-z0-9._ -]+)/g,
    /\/(?:home|Users)\/([A-Za-z0-9.-]+)/g,
    /[A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
  ];
  
  for (const pattern of piiPatterns) {
    if (pattern.test(body)) {
      metrics.hasPII = true;
      break;
    }
  }
  
  // Check for issues
  if (!fm.title) issues.push('missing title');
  if (!fm.slug) issues.push('missing slug');
  if (!fm.summary || String(fm.summary).trim().length === 0) issues.push('missing summary');
  if (metrics.summaryLength > 200) issues.push('summary too long');
  if (metrics.bodyLength < 700) issues.push('body too short');
  if (metrics.bodyLength > 1200) issues.push('body too long');
  if (!metrics.hasTLDR) issues.push('missing TL;DR');
  if (metrics.structureScore < 4) issues.push(`incomplete structure (${metrics.structureScore}/5)`);
  if (metrics.hasPersonalPronouns) issues.push('contains personal pronouns');
  if (metrics.hasPersonalNames) issues.push('contains personal name');
  if (metrics.hasPII) issues.push('contains PII');
  
  metrics.issues = issues;
  metrics.issueCount = issues.length;
  metrics.qualityScore = 100 - (issues.length * 10); // Base score minus penalties
  
  return metrics;
}

function scanAllStories() {
  const files = globSync(`${STORIES_DIR}/00*.md`, { cwd: ROOT, absolute: true });
  const results = [];
  
  for (const file of files) {
    if (!existsSync(file)) continue;
    const metrics = scanStory(file);
    results.push(metrics);
  }
  
  // Sort by quality score (descending)
  results.sort((a, b) => b.qualityScore - a.qualityScore);
  
  return results;
}

function generateReport(results) {
  const report = {
    generatedAt: new Date().toISOString(),
    totalStories: results.length,
    byStatus: {
      draft: 0,
      review: 0,
      ready: 0
    },
    qualityDistribution: {
      excellent: 0, // 90-100
      good: 0,      // 70-89
      fair: 0,     // 50-69
      poor: 0      // <50
    },
    topCandidates: [],
    results: results
  };
  
  for (const result of results) {
    const status = result.status || 'draft';
    if (report.byStatus[status] !== undefined) {
      report.byStatus[status]++;
    }
    
    if (result.qualityScore >= 90) report.qualityDistribution.excellent++;
    else if (result.qualityScore >= 70) report.qualityDistribution.good++;
    else if (result.qualityScore >= 50) report.qualityDistribution.fair++;
    else report.qualityDistribution.poor++;
  }
  
  // Top 5 candidates (highest quality, no critical issues)
  report.topCandidates = results
    .filter(r => r.issueCount <= 2 && r.status === 'draft')
    .slice(0, 5)
    .map(r => ({
      slug: r.slug,
      title: r.title,
      qualityScore: r.qualityScore,
      issueCount: r.issueCount,
      issues: r.issues
    }));
  
  return report;
}

function generateMarkdownTable(results) {
  let table = '## Quality Scan Results (001-020)\n\n';
  table += '| № | Slug | Title | Status | Quality | Issues | Structure | Length |\n';
  table += '|---|------|-------|--------|---------|--------|-----------|--------|\n';
  
  for (const result of results) {
    const num = result.slug.match(/^(\d+)-/)?.[1] || '';
    const slug = result.slug.length > 30 ? result.slug.substring(0, 27) + '...' : result.slug;
    const title = (result.title || '').length > 40 ? (result.title || '').substring(0, 37) + '...' : (result.title || '');
    const status = result.status || 'draft';
    const quality = result.qualityScore >= 90 ? '🟢 Excellent' : result.qualityScore >= 70 ? '🟡 Good' : result.qualityScore >= 50 ? '🟠 Fair' : '🔴 Poor';
    const issues = result.issueCount > 0 ? `⚠️ ${result.issueCount}` : '✅ 0';
    const structure = `${result.structureScore}/5`;
    const length = `${result.charCount} chars`;
    
    table += `| ${num} | \`${slug}\` | ${title} | ${status} | ${quality} | ${issues} | ${structure} | ${length} |\n`;
  }
  
  return table;
}

function main() {
  console.log('🔍 Scanning stories 001-020 for quality...\n');
  
  const results = scanAllStories();
  const report = generateReport(results);
  
  // Save JSON report
  const reportPath = resolve(ROOT, 'prototype/data/stories-quality-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✅ Saved report to ${reportPath}`);
  
  // Generate Markdown table
  const markdownTable = generateMarkdownTable(results);
  const markdownPath = resolve(ROOT, 'prototype/data/stories-quality-report.md');
  writeFileSync(markdownPath, markdownTable, 'utf8');
  console.log(`✅ Saved Markdown table to ${markdownPath}`);
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total stories: ${report.totalStories}`);
  console.log(`   By status:`, report.byStatus);
  console.log(`   Quality distribution:`, report.qualityDistribution);
  console.log(`\n🎯 Top candidates for first batch:`);
  for (const candidate of report.topCandidates) {
    console.log(`   - ${candidate.slug}: ${candidate.qualityScore}% (${candidate.issueCount} issues)`);
  }
}

main();
