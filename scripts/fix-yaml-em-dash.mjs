#!/usr/bin/env node
/**
 * Исправление YAML front matter: добавление кавычек к title с длинным тире (—)
 */

import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

const files = globSync('docs/**/*.md');
const problematic = [];
const fixed = [];

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf8');
    
    // Проверяем, есть ли title с длинным тире без кавычек
    const titleMatch = content.match(/^title:\s*([^\n]+)/m);
    if (titleMatch) {
      const titleLine = titleMatch[0];
      const titleValue = titleMatch[1].trim();
      
      // Проверяем, содержит ли длинное тире и не в кавычках
      if (titleValue.includes('—') && !titleValue.match(/^['"]/)) {
        problematic.push({ file, titleLine, titleValue });
        
        // Исправляем: добавляем кавычки
        const fixedTitleLine = `title: "${titleValue}"`;
        const fixedContent = content.replace(/^title:\s*[^\n]+/m, fixedTitleLine);
        
        writeFileSync(file, fixedContent, 'utf8');
        fixed.push(file);
        console.log(`✅ Fixed: ${file}`);
      }
    }
  } catch (error) {
    if (error.message.includes('YAMLException') || error.message.includes('incomplete')) {
      problematic.push({ file, error: error.message });
      console.log(`❌ Parse error: ${file} - ${error.message}`);
    }
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Found problematic files: ${problematic.length}`);
console.log(`   Fixed files: ${fixed.length}`);

if (fixed.length > 0) {
  console.log(`\n✅ Fixed files:`);
  fixed.forEach(f => console.log(`   - ${f}`));
}

