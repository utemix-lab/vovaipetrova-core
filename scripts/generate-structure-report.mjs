// scripts/generate-structure-report.mjs
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import matter from 'gray-matter';

const ROOT = 'docs';

function main() {
  const files = globSync(`${ROOT}/**/*.md`, { nodir: true });
  const report = {
    total: files.length,
    byTags: {},
    byMachineTags: {},
    files: []
  };

  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data || {};
    const fileInfo = {
      path: f.replace(/^docs\//, ''),
      title: fm.title || 'Untitled',
      slug: fm.slug || '',
      tags: fm.tags || [],
      machine_tags: fm.machine_tags || [],
      summary: fm.summary ? String(fm.summary).slice(0, 100) : ''
    };

    report.files.push(fileInfo);

    // Count by tags
    for (const tag of fileInfo.tags) {
      report.byTags[tag] = (report.byTags[tag] || 0) + 1;
    }

    // Count by machine_tags
    for (const mt of fileInfo.machine_tags) {
      report.byMachineTags[mt] = (report.byMachineTags[mt] || 0) + 1;
    }
  }

  // Generate Markdown report
  let md = `# Структура репозитория vovaipetrova-core\n\n`;
  md += `**Всего документов:** ${report.total}\n\n`;

  md += `## Статистика по тегам\n\n`;
  const sortedTags = Object.entries(report.byTags).sort((a, b) => b[1] - a[1]);
  for (const [tag, count] of sortedTags.slice(0, 20)) {
    md += `- \`${tag}\`: ${count} документов\n`;
  }

  md += `\n## Статистика по машинотегам (фасеты)\n\n`;
  const sortedMT = Object.entries(report.byMachineTags).sort((a, b) => b[1] - a[1]);
  for (const [mt, count] of sortedMT.slice(0, 20)) {
    md += `- \`${mt}\`: ${count} документов\n`;
  }

  md += `\n## Список документов\n\n`;
  for (const f of report.files.sort((a, b) => a.title.localeCompare(b.title))) {
    md += `### ${f.title}\n`;
    md += `- **Slug:** \`${f.slug}\`\n`;
    if (f.tags.length > 0) md += `- **Теги:** ${f.tags.map(t => `\`${t}\``).join(', ')}\n`;
    if (f.machine_tags.length > 0) md += `- **Машинотеги:** ${f.machine_tags.map(mt => `\`${mt}\``).join(', ')}\n`;
    if (f.summary) md += `- **Описание:** ${f.summary}...\n`;
    md += `\n`;
  }

  writeFileSync('STRUCTURE-REPORT.md', md, 'utf8');
  console.log('✅ Отчет создан: STRUCTURE-REPORT.md');
  console.log(`📊 Всего документов: ${report.total}`);
  console.log(`🏷️  Уникальных тегов: ${Object.keys(report.byTags).length}`);
  console.log(`⚙️  Уникальных машинотегов: ${Object.keys(report.byMachineTags).length}`);
}

main();

