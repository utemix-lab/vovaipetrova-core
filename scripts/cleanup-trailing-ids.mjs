import fs from "fs";
import { globSync } from "glob";

const pattern = /\]\(([^)]+?\.md)\)%20[0-9a-f]{8,}[^)]*\)/gi;
const files = globSync('docs/**/*.md', { nodir: true });
let changed = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const next = raw.replace(pattern, ']($1)');
  if (next !== raw) {
    fs.writeFileSync(file, next.replace(/\r?\n/g, '\n'), 'utf8');
    changed++;
    console.log(`Cleaned trailing ids in ${file}`);
  }
}
console.log(`Total files updated: ${changed}`);
