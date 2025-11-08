import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import slugify from "slugify";

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split(/=(.+)/);
    result[key] = value !== undefined ? value : "true";
  }
  return result;
}

function toSlug(input) {
  const base = String(input || "").replace(/\./g, "-");
  const slug = slugify(base, { lower: true, strict: true, locale: "ru" })
    .replace(/_/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "new-document";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = (args.type || "article").toLowerCase();
  const title = args.title;

  if (!title) {
    console.error("вќЊ --title is required");
    process.exit(1);
  }

  const templatesDir = resolve(process.cwd(), "templates");
  const templatePath = resolve(templatesDir, `${type}.md`);
  if (!existsSync(templatePath)) {
    console.error(`вќЊ Template not found for type \'${type}\' at ${templatePath}`);
    process.exit(1);
  }

  const slug = toSlug(args.slug || title);
  const outDir = resolve(process.cwd(), args.out || "docs");
  mkdirSync(outDir, { recursive: true });
  const destination = resolve(outDir, `${slug}.md`);
  if (existsSync(destination) && args.force !== "true") {
    console.error(`вќЊ File already exists: ${destination}`);
    console.error("   Use --force=true to overwrite.");
    process.exit(1);
  }

  const template = readFileSync(templatePath, "utf8");
  const summary = args.summary || "";
  const filled = template
    .replace(/{{TITLE}}/g, title)
    .replace(/{{SLUG}}/g, slug)
    .replace(/{{SUMMARY}}/g, summary);

  writeFileSync(destination, filled, "utf8");
  console.log(`вњ… Created ${destination}`);
  console.log(`   title: ${title}`);
  console.log(`   slug: ${slug}`);
  console.log(`   status: draft`);
}

main();