#!/usr/bin/env python3
import sys, pathlib, datetime, re
ROOT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("docs")
TODAY = datetime.date.today().isoformat()
def slugify(name: str) -> str:
s = name.strip().lower()
s = re.sub(r"⁠
⁠", "", s)
s = s.replace(" ", "-").replace("_", "-")
s = re.sub(r"-+", "-", s)
return s
for md in ROOT.rglob("*.md"):
text = md.read_text(encoding="utf-8")
if text.lstrip().startswith("---n"):
continue
title = md.stem.replace("-", " ")
parts = md.relative_to(ROOT).parts
section = parts[0] if parts else "docs"
fm = (
f"---n"
f"title: "{title}"n"
f"slug: {slugify(md.stem)}n"
f"section: {section}n"
f"tags: []n"
f"updated: {TODAY}n"
f"source: Notionn"
f"---nn"
)
md.write_text(fm + text, encoding="utf-8")
