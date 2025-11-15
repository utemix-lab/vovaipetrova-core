// scripts/pii-sanitize.mjs
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');

// Sanitization rules
const SANITIZE_RULES = [
  {
    name: 'windows_user_path',
    regex: /([A-Za-z]:\\Users\\)([A-Za-z0-9._ -]+)/g,
    replacement: '$1<user>'
  },
  {
    name: 'unix_home_path',
    regex: /(\/(?:home|Users)\/)([A-Za-z0-9.-]+)/g,
    replacement: '$1<user>'
  },
  {
    name: 'email',
    regex: /([A-Za-z0-9.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
    replacement: '<email>'
  },
  {
    name: 'phone',
    regex: /(\+?\d[\d ()-]{6,})/g,
    replacement: '<phone>'
  }
];

function sanitizeContent(content, filePath) {
  let sanitized = content;
  let changes = [];
  
  for (const rule of SANITIZE_RULES) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match;
    const newMatches = [];
    
    while ((match = regex.exec(sanitized)) !== null) {
      // Skip matches in code blocks (```...```)
      const beforeMatch = sanitized.substring(0, match.index);
      const codeBlockCount = (beforeMatch.match(/```/g) || []).length;
      if (codeBlockCount % 2 === 1) continue; // Inside code block
      
      // Skip if already sanitized
      if (match[0].includes('<user>') || match[0].includes('<email>') || match[0].includes('<phone>')) {
        continue;
      }
      
      newMatches.push({
        original: match[0],
        replacement: match[0].replace(regex, rule.replacement),
        rule: rule.name
      });
    }
    
    if (newMatches.length > 0) {
      // Apply replacements
      for (const m of newMatches) {
        sanitized = sanitized.replace(m.original, m.replacement);
        changes.push({
          file: filePath,
          original: m.original,
          replacement: m.replacement,
          rule: m.rule
        });
      }
    }
  }
  
  return { sanitized, changes };
}

function sanitizeFile(filePath) {
  if (!existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return [];
  }
  
  const content = readFileSync(filePath, 'utf8');
  const { sanitized, changes } = sanitizeContent(content, filePath);
  
  if (changes.length > 0 && APPLY) {
    writeFileSync(filePath, sanitized, 'utf8');
    console.log(`✅ Sanitized ${filePath} (${changes.length} changes)`);
  }
  
  return changes;
}

function main() {
  const reportPath = resolve(ROOT, 'prototype/data/pii-report.json');
  
  if (!existsSync(reportPath)) {
    console.error('❌ PII report not found. Run pii-scan.mjs first.');
    process.exit(1);
  }
  
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const filesToSanitize = [...new Set(report.matches.map(m => m.file))];
  
  console.log(`🔧 Sanitizing ${filesToSanitize.length} files...\n`);
  
  if (!APPLY) {
    console.log('⚠️  Dry-run mode. Use --apply to actually sanitize files.\n');
  }
  
  const allChanges = [];
  
  for (const file of filesToSanitize) {
    const fullPath = resolve(ROOT, file);
    const changes = sanitizeFile(fullPath);
    allChanges.push(...changes);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${filesToSanitize.length}`);
  console.log(`   Total changes: ${allChanges.length}`);
  
  if (allChanges.length > 0 && !APPLY) {
    console.log('\n💡 Run with --apply to apply changes.');
  } else if (allChanges.length > 0 && APPLY) {
    console.log('\n✅ Sanitization complete.');
  } else {
    console.log('\n✅ No changes needed.');
  }
}

main();

