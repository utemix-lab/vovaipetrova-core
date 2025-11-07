#!/usr/bin/env node

import { readFileSync } from 'fs';
import { globSync } from 'glob';
import YAML from 'yaml';
import matter from 'gray-matter';

const ROOT = 'docs';
const TAGS_YAML = 'docs/nav/tags.yaml';

// Extract Title_Case hashtags from content
function extractHashtags(content) {
  const hashtags = [];
  // Match #Title_Case or #TitleCase (with underscores or camelCase)
  const hashtagRe = /#([A-Z][a-zA-Z0-9_]+)/g;
  let match;
  
  while ((match = hashtagRe.exec(content)) !== null) {
    const tag = match[1];
    hashtags.push(tag);
  }
  
  return Array.from(new Set(hashtags));
}

// Load aliases from tags.yaml
function loadAliases() {
  try {
    const raw = readFileSync(TAGS_YAML, 'utf8');
    const parsed = YAML.parse(raw);
    return parsed.aliases || {};
  } catch (e) {
    console.warn(`⚠️ Failed to load ${TAGS_YAML}:`, e.message);
    return {};
  }
}

function main() {
  const aliases = loadAliases();
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  const missing = [];
  
  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const content = parsed.content || '';
      
      // Collect tags from front matter and content
      const tagsFromFM = Array.isArray(fm.tags) ? fm.tags : [];
      const tagsFromContent = extractHashtags(content);
      const allTags = Array.from(new Set([...tagsFromFM, ...tagsFromContent]));
      
      // Check which tags don't have aliases
      const missingAliases = allTags.filter(tag => !aliases[tag]);
      
      if (missingAliases.length > 0) {
        missing.push({
          file,
          missing_aliases: missingAliases
        });
      }
    } catch (e) {
      console.warn(`⚠️ Failed to process ${file}:`, e.message);
    }
  }
  
  // Generate markdown report
  if (missing.length > 0) {
    console.log('\n⚠️  Tags without aliases found:\n');
    console.log('| File | Missing Aliases |');
    console.log('|------|----------------|');
    
    for (const item of missing) {
      const fileRel = item.file.replace(/^docs\//, '');
      const aliasesList = item.missing_aliases.join(', ');
      console.log(`| \`${fileRel}\` | ${aliasesList} |`);
    }
    
    console.log(`\n📊 Summary: ${missing.length} file(s) with ${missing.reduce((sum, item) => sum + item.missing_aliases.length, 0)} missing alias(es)`);
    console.log(`\n💡 Add missing aliases to ${TAGS_YAML} to generate machine_tags automatically.\n`);
  } else {
    console.log('✅ All tags have aliases defined');
  }
  
  // Always exit with 0 (warnings only, not errors)
  process.exit(0);
}

main();

