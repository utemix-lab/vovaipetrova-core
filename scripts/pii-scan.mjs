// scripts/pii-scan.mjs
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { globSync } from 'glob';
import { resolve } from 'path';

const ROOT = process.cwd();
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/prototype/data/**',
  '**/package-lock.json',
  '**/*.lock',
  '**/.DS_Store'
];

// PII patterns
const PATTERNS = [
  {
    name: 'windows_user_path',
    regex: /([A-Za-z]:\\Users\\([A-Za-z0-9._ -]+))/g,
    kind: 'path'
  },
  {
    name: 'unix_home_path',
    regex: /(\/(?:home|Users)\/([A-Za-z0-9.-]+))/g,
    kind: 'path'
  },
  {
    name: 'email',
    regex: /([A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    kind: 'email'
  },
  {
    name: 'phone',
    // More specific phone pattern: international format or local with area code
    // Excludes dates (YYYY-MM-DD), CSS values (0 0 0 1), and short numbers
    regex: /(\+?\d{1,3}[\s\-()]\d{2,4}[\s\-()]\d{2,4}[\s\-()]?\d{2,4})/g,
    kind: 'phone'
  }
];

function isExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return EXCLUDE_PATTERNS.some(pattern => {
    const globPattern = pattern.replace(/\*\*/g, '**');
    return normalized.includes(pattern.replace(/\*\*/g, '').replace(/\//g, ''));
  }) || normalized.includes('node_modules') || normalized.includes('.git') || normalized.includes('prototype/data');
}

function scanFile(filePath) {
  const matches = [];
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (const pattern of PATTERNS) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;
        while ((match = regex.exec(line)) !== null) {
          // Skip matches in code blocks (```...```)
          const beforeMatch = line.substring(0, match.index);
          const codeBlockCount = (beforeMatch.match(/```/g) || []).length;
          if (codeBlockCount % 2 === 1) continue; // Inside code block
          
          // Skip if already sanitized
          if (match[0].includes('<user>') || match[0].includes('<email>') || match[0].includes('<phone>')) {
            continue;
          }
          
          matches.push({
            file: filePath.replace(ROOT + '/', ''),
            line: lineNum + 1,
            match: match[0],
            kind: pattern.kind,
            pattern: pattern.name
          });
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Failed to read ${filePath}:`, error.message);
  }
  
  return matches;
}

function scanRepository() {
  const allMatches = [];
  
  // Scan docs/, prototype/, scripts/, README.md, CHANGELOG.md, etc.
  const scanPaths = [
    'docs/**/*.{md,yml,yaml,json}',
    'prototype/**/*.{js,html,css,json}',
    'scripts/**/*.mjs',
    'README.md',
    'CHANGELOG.md',
    '*.md'
  ];
  
  for (const pattern of scanPaths) {
    const files = globSync(pattern, { cwd: ROOT, absolute: true });
    for (const file of files) {
      if (isExcluded(file)) continue;
      if (!existsSync(file)) continue;
      
      const stats = statSync(file);
      if (!stats.isFile()) continue;
      
      const matches = scanFile(file);
      allMatches.push(...matches);
    }
  }
  
  return allMatches;
}

function generateReport(matches) {
  const report = {
    generatedAt: new Date().toISOString(),
    totalMatches: matches.length,
    byKind: {},
    byFile: {},
    matches: matches.slice(0, 100) // Top 100 for report
  };
  
  // Group by kind
  for (const match of matches) {
    report.byKind[match.kind] = (report.byKind[match.kind] || 0) + 1;
    report.byFile[match.file] = (report.byFile[match.file] || 0) + 1;
  }
  
  return report;
}

function generateMarkdownTable(matches) {
  if (matches.length === 0) {
    return '## PII Scan Results\n\n✅ No PII found.\n';
  }
  
  const topMatches = matches.slice(0, 100);
  let table = '## PII Scan Results (Top 100)\n\n';
  table += '| File | Line | Match | Kind |\n';
  table += '|------|------|-------|------|\n';
  
  for (const match of topMatches) {
    const file = match.file.length > 50 ? '...' + match.file.slice(-47) : match.file;
    const matchText = match.match.length > 40 ? match.match.slice(0, 37) + '...' : match.match;
    table += `| \`${file}\` | ${match.line} | \`${matchText}\` | ${match.kind} |\n`;
  }
  
  return table;
}

function main() {
  console.log('🔍 Scanning repository for PII...\n');
  
  const matches = scanRepository();
  const report = generateReport(matches);
  
  // Save JSON report
  const reportPath = resolve(ROOT, 'prototype/data/pii-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✅ Saved report to ${reportPath}`);
  
  // Generate Markdown table
  const markdownTable = generateMarkdownTable(matches);
  const markdownPath = resolve(ROOT, 'prototype/data/pii-report.md');
  writeFileSync(markdownPath, markdownTable, 'utf8');
  console.log(`✅ Saved Markdown table to ${markdownPath}`);
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total matches: ${matches.length}`);
  console.log(`   By kind:`, report.byKind);
  console.log(`   Files affected: ${Object.keys(report.byFile).length}`);
  
  if (matches.length > 0) {
    console.log('\n⚠️  PII found. Review report and run sanitize script if needed.');
    process.exit(1);
  } else {
    console.log('\n✅ No PII found.');
    process.exit(0);
  }
}

main();

