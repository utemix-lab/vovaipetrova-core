import fs from "fs/promises";
import path from "path";

const rootDir = path.join(process.cwd(), "docs");
const results = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      await processFile(fullPath);
    }
  }
}

function hasServiceTrue(fmLines) {
  return fmLines.some(line => line.trim().toLowerCase() === "service: true");
}

function getStatusInfo(fmLines) {
  const index = fmLines.findIndex(line => line.trim().toLowerCase().startsWith("status:"));
  if (index === -1) {
    return { hasStatus: false, index: -1 };
  }
  const value = fmLines[index].split(":").slice(1).join(":").trim().toLowerCase();
  if (!value || value === "''" || value === '""') {
    return { hasStatus: false, index };
  }
  return { hasStatus: true, index };
}

function getSummaryInfo(fmLines) {
  const index = fmLines.findIndex(line => line.trim().toLowerCase().startsWith("summary:"));
  if (index === -1) {
    return { hasSummary: false, index: -1, removeCount: 0 };
  }
  const raw = fmLines[index].split(":").slice(1).join(":").trim();
  if (!raw || raw === "''" || raw === '""') {
    return { hasSummary: false, index, removeCount: 1 };
  }
  if (raw.startsWith(">") || raw.startsWith("|")) {
    let idx = index + 1;
    let removeCount = 1;
    let hasText = false;
    while (idx < fmLines.length && fmLines[idx].startsWith(" ")) {
      if (fmLines[idx].trim().length > 0) {
        hasText = true;
      }
      idx += 1;
      removeCount += 1;
    }
    return { hasSummary: hasText, index, removeCount };
  }
  return { hasSummary: true, index, removeCount: 1 };
}

function cleanMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, (match) => {
      const label = match.match(/\[[^\]]*\]/)?.[0] ?? "";
      return label.slice(1, -1);
    })
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ");
}

function buildSummary(bodyLines) {
  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("<!--")) continue;
    if (trimmed.startsWith(">")) continue;
    let text = trimmed.startsWith("#") ? trimmed.replace(/^#+\s*/, "") : trimmed;
    text = cleanMarkdown(text);
    text = text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length > 100) {
      text = text.slice(0, 100).trim();
      if (text.endsWith(",")) text = text.slice(0, -1);
    }
    if (!/[.!?…]$/.test(text)) {
      if (text.length >= 100) {
        text = text.replace(/[.!?…]+$/, "");
      } else {
        text += ".";
      }
    }
    if (text.length > 100) {
      text = text.slice(0, 99).trim();
      if (!/[.!?…]$/.test(text)) text += ".";
    }
    return text;
  }
  return "Draft summary.";
}

async function processFile(file) {
  const content = await fs.readFile(file, "utf8");
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") return;
  const fmEnd = lines.indexOf("---", 1);
  if (fmEnd === -1) return;
  const fmLines = lines.slice(1, fmEnd);
  if (hasServiceTrue(fmLines)) return;
  const bodyLines = lines.slice(fmEnd + 1);

  const statusInfo = getStatusInfo(fmLines);
  const summaryInfo = getSummaryInfo(fmLines);

  let addedStatus = false;
  let addedSummary = false;

  if (!summaryInfo.hasSummary) {
    const summaryText = buildSummary(bodyLines);
    const summaryLines = ["summary: >-", `  ${summaryText}`];
    if (summaryInfo.index >= 0) {
      fmLines.splice(summaryInfo.index, summaryInfo.removeCount || 1, ...summaryLines);
    } else {
      let insertIdx = fmLines.findIndex(line => line.trim().toLowerCase().startsWith("slug:"));
      if (insertIdx === -1) insertIdx = fmLines.findIndex(line => line.trim().toLowerCase().startsWith("title:"));
      if (insertIdx === -1) insertIdx = -1;
      fmLines.splice(insertIdx + 1, 0, ...summaryLines);
    }
    addedSummary = true;
  }

  if (!statusInfo.hasStatus) {
    let insertIdx = fmLines.findIndex(line => line.trim().toLowerCase().startsWith("summary:"));
    if (insertIdx !== -1) {
      insertIdx += 1;
      while (insertIdx < fmLines.length && fmLines[insertIdx].startsWith(" ")) insertIdx += 1;
    } else {
      insertIdx = fmLines.length;
    }
    fmLines.splice(insertIdx, 0, "status: draft");
    addedStatus = true;
  }

  if (addedStatus || addedSummary) {
    const newLines = ["---", ...fmLines, "---", ...bodyLines];
    let output = newLines.join("\n");
    if (!output.endsWith("\n")) output += "\n";
    await fs.writeFile(file, output, "utf8");
    results.push({
      file: path.relative(process.cwd(), file).replace(/\\\\/g, "/"),
      addedStatus,
      addedSummary
    });
  }
}

await walk(rootDir);

results.sort((a, b) => a.file.localeCompare(b.file));

console.log(JSON.stringify({
  total: results.length,
  addedStatus: results.filter(r => r.addedStatus).length,
  addedSummary: results.filter(r => r.addedSummary).length,
  files: results
}, null, 2));
