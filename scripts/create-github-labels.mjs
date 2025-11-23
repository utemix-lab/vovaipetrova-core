#!/usr/bin/env node
/**
 * Create GitHub labels for the repository
 * 
 * Usage:
 *   node scripts/create-github-labels.mjs
 * 
 * Requires:
 *   - GITHUB_TOKEN environment variable
 *   - GITHUB_REPO environment variable (format: owner/repo)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'utemix-lab/vovaipetrova-core';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

// Label definitions
const labels = [
  // Standard lane labels
  { name: 'lane:docs', color: '0E8A16', description: 'Documentation work' },
  { name: 'lane:infra', color: '0E8A16', description: 'Infrastructure, workflows, scripts' },
  { name: 'lane:feat', color: '0E8A16', description: 'New features' },
  { name: 'lane:fix', color: '0E8A16', description: 'Bug fixes' },
  { name: 'lane:refactor', color: '0E8A16', description: 'Code refactoring' },
  { name: 'lane:stories', color: '0E8A16', description: 'Stories episodes' },
  { name: 'lane:characters', color: '0E8A16', description: 'Character work' },
  { name: 'lane:qa', color: '0E8A16', description: 'Quality assurance' },
  { name: 'lane:composer', color: '0E8A16', description: 'Composer tasks (isolated lane)' },
  
  // CodeGPT lane labels
  { name: 'lane:codegpt:orchestrator', color: '0E8A16', description: 'CodeGPT Orchestrator tasks' },
  { name: 'lane:codegpt:docs', color: '0E8A16', description: 'CodeGPT Docs Agent tasks' },
  { name: 'lane:codegpt:refactor', color: '0E8A16', description: 'CodeGPT Refactor Agent tasks' },
  { name: 'lane:codegpt:creative', color: '0E8A16', description: 'CodeGPT Creative Agent tasks' },
  
  // Copilot lane labels
  { name: 'lane:copilot', color: '1F77B4', description: 'GitHub Copilot tasks (general)' },
  { name: 'lane:copilot:docs', color: '1F77B4', description: 'Copilot documentation tasks' },
  { name: 'lane:copilot:infra', color: '1F77B4', description: 'Copilot infrastructure tasks' },
  { name: 'lane:copilot:stories', color: '1F77B4', description: 'Copilot Stories tasks' },
  { name: 'lane:copilot:refactor', color: '1F77B4', description: 'Copilot refactoring tasks' },
  { name: 'lane:copilot:feat', color: '1F77B4', description: 'Copilot feature tasks' },
  { name: 'lane:copilot:fix', color: '1F77B4', description: 'Copilot bug fix tasks' },
  
  // Sequence labels (for sequential tasks)
  { name: 'seq:1', color: 'FBCA04', description: 'Sequence step 1' },
  { name: 'seq:2', color: 'FBCA04', description: 'Sequence step 2' },
  { name: 'seq:3', color: 'FBCA04', description: 'Sequence step 3' },
  { name: 'seq:4', color: 'FBCA04', description: 'Sequence step 4' },
  { name: 'seq:5', color: 'FBCA04', description: 'Sequence step 5' },
  { name: 'seq:6', color: 'FBCA04', description: 'Sequence step 6' },
  { name: 'seq:7', color: 'FBCA04', description: 'Sequence step 7' },
  { name: 'seq:8', color: 'FBCA04', description: 'Sequence step 8' },
  { name: 'seq:9', color: 'FBCA04', description: 'Sequence step 9' },
  { name: 'seq:10', color: 'FBCA04', description: 'Sequence step 10' },
  { name: 'seq:11', color: 'FBCA04', description: 'Sequence step 11' },
  { name: 'seq:12', color: 'FBCA04', description: 'Sequence step 12' },
  { name: 'seq:13', color: 'FBCA04', description: 'Sequence step 13' },
  { name: 'seq:14', color: 'FBCA04', description: 'Sequence step 14' },
  { name: 'seq:15', color: 'FBCA04', description: 'Sequence step 15' },
  
  // Status labels
  { name: 'auto:ready-for-review', color: '0E8A16', description: 'Auto-generated PR ready for review' },
  { name: 'auto:needs-fixes', color: 'D93F0B', description: 'Auto-generated PR needs fixes' },
  { name: 'auto:story', color: '7057FF', description: 'Auto-generated story episode' },
  { name: 'urgent', color: 'D93F0B', description: 'Urgent task (SLA: 12 hours)' },
  { name: 'content/story', color: '7057FF', description: 'Story episode content' },
  { name: 'lane-blocked', color: 'D93F0B', description: 'PR blocked due to lane conflict' },
];

/**
 * Create or update a GitHub label
 */
function createLabel(label) {
  const { name, color, description } = label;
  
  try {
    // Check if label exists
    const checkCmd = `gh api repos/${GITHUB_REPO}/labels/${encodeURIComponent(name)} --jq .name 2>/dev/null || echo ""`;
    const existing = execSync(checkCmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    
    if (existing) {
      // Update existing label
      console.log(`🔄 Updating label: ${name}`);
      execSync(
        `gh api repos/${GITHUB_REPO}/labels/${encodeURIComponent(name)} -X PATCH -f name="${name}" -f color="${color}" -f description="${description}"`,
        { stdio: 'inherit' }
      );
    } else {
      // Create new label
      console.log(`✨ Creating label: ${name}`);
      execSync(
        `gh api repos/${GITHUB_REPO}/labels -X POST -f name="${name}" -f color="${color}" -f description="${description}"`,
        { stdio: 'inherit' }
      );
    }
  } catch (error) {
    console.error(`❌ Error processing label ${name}:`, error.message);
    return false;
  }
  
  return true;
}

/**
 * Main function
 */
function main() {
  console.log('📋 Creating GitHub labels...\n');
  console.log(`Repository: ${GITHUB_REPO}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const label of labels) {
    if (createLabel(label)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n✅ Created/updated: ${successCount} labels`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount} labels`);
  }
  
  console.log('\n📝 Labels created:');
  labels.forEach(label => {
    console.log(`   - ${label.name} (${label.color})`);
  });
}

main();

