---
title: Р­РєСЃРїРѕСЂС‚ РІ GitHub вЂ” СЂСѓРєРѕРІРѕРґСЃС‚РІРѕ Рё С€Р°Р±Р»РѕРЅС‹
slug: eksport-v-github-rukovodstvo-i-shablony-007c56
summary: >-
  РџСЂР°РєС‚РёС‡РµСЃРєРѕРµ СЂСѓРєРѕРІРѕРґСЃС‚РІРѕ РїРѕ СЌРєСЃРїРѕСЂС‚Сѓ Notion
  в†’ GitHub: СЃС‚СЂСѓРєС‚СѓСЂР°, СЃРєСЂРёРїС‚С‹ Рё Р°РІС‚РѕРјР°С‚РёР·Р°С†РёСЏ.
tags: []
machine_tags: []
status: review
service: true
---
# Р­РєСЃРїРѕСЂС‚ РІ GitHub вЂ” СЂСѓРєРѕРІРѕРґСЃС‚РІРѕ Рё С€Р°Р±Р»РѕРЅС‹

<aside>
рџ”—

Р­РєСЃРїРѕСЂС‚ СЃС‚СЂСѓРєС‚СѓСЂС‹ РІ GitHub РІ С„РѕСЂРјР°С‚Рµ Markdown, С‡РёС‚Р°РµРјРѕРј РґР»СЏ LLM.

</aside>

### TL;DR

- Р­РєСЃРїРѕСЂС‚РёСЂСѓРµРј РІРµС‚РєСѓ Notion в†’ Markdown (.md + РїР°РїРєРё) в†’ GitHub repo
- Р•РґРёРЅС‹Рµ РїСЂР°РІРёР»Р° РёРјС‘РЅ/С„СЂРѕРЅС‚вЂ‘РјР°С‚С‚РµСЂР° в†’ Р»СѓС‡С€РµРµ РёРЅРґРµРєСЃРёСЂРѕРІР°РЅРёРµ LLM
- РЎРєСЂРёРїС‚вЂ‘СЂС‹Р±Р° Рё СЃС‚СЂСѓРєС‚СѓСЂР° СЂРµРїРѕР·РёС‚РѕСЂРёСЏ РЅРёР¶Рµ

---

### РўСЂРµР±РѕРІР°РЅРёСЏ

- РђРєРєР°СѓРЅС‚ GitHub Рё РїСѓСЃС‚РѕР№ СЂРµРїРѕР·РёС‚РѕСЂРёР№, РЅР°РїСЂРёРјРµСЂ: vovaipetrova-core
- Git СѓСЃС‚Р°РЅРѕРІР»РµРЅ Р»РѕРєР°Р»СЊРЅРѕ
- (РћРїС†РёРѕРЅР°Р»СЊРЅРѕ) n8n/Make/Zapier РґР»СЏ Р°РІС‚РѕРјР°С‚РёР·Р°С†РёРё РїРѕ СЂР°СЃРїРёСЃР°РЅРёСЋ

### Р РµРєРѕРјРµРЅРґСѓРµРјР°СЏ СЃС‚СЂСѓРєС‚СѓСЂР° СЂРµРїРѕР·РёС‚РѕСЂРёСЏ

```
/README.md
/docs/                # РїСѓР±Р»РёС‡РЅР°СЏ РґРѕРєСѓРјРµРЅС‚Р°С†РёСЏ
  /project/           # РѕРїРёСЃР°РЅРёРµ РїСЂРѕРµРєС‚Р° (СЌС‚РѕС‚ СЂР°Р·РґРµР»)
  /think-tank/        # СЏРґСЂРѕ (goals, org, agents, focus)
  /kb/                # Р±Р°Р·Р° Р·РЅР°РЅРёР№ (СЃС‚Р°С‚СЊРё, РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹)
  /portfolio/         # РєРµР№СЃС‹
  /nav/               # РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєР°СЏ РЅР°РІРёРіР°С†РёСЏ Рё РіР°Р№РґС‹
/scripts/             # СѓС‚РёР»РёС‚С‹ СЌРєСЃРїРѕСЂС‚Р°/СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё
/.github/workflows/   # Р°РІС‚РѕСЃР±РѕСЂРєРё/РїСЂРѕРІРµСЂРєРё (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)
```

### РРјРµРЅРѕРІР°РЅРёРµ С„Р°Р№Р»РѕРІ Рё РїР°РїРѕРє

- kebab-case РґР»СЏ С„Р°Р№Р»РѕРІ: `suts-proekta-one-liner.md`
- РџР°РїРєРё СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‚ СЂР°Р·РґРµР»Р°Рј РІ Notion
- Р’РЅСѓС‚СЂРµРЅРЅРёРµ СЃСЃС‹Р»РєРё вЂ” РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Рµ MarkdownвЂ‘СЃСЃС‹Р»РєРё

### YAML С„СЂРѕРЅС‚вЂ‘РјР°С‚С‚РµСЂ РґР»СЏ LLM

Р’ РЅР°С‡Р°Р»Рѕ РєР°Р¶РґРѕРіРѕ .md:

```yaml
---
title: "РЎСѓС‚СЊ РїСЂРѕРµРєС‚Р° вЂ” One-liner"
slug: suts-proekta-one-liner
section: project
tags: [concept, overview]
updated: 2025-11-02
source: Notion
---
```

### РЎРєСЂРёРїС‚вЂ‘СЂС‹Р±Р°: СЌРєСЃРїРѕСЂС‚ Markdown РІ GitHub

Р¤Р°Р№Р»: `scripts/export_notion_to_github.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
# РџР°СЂР°РјРµС‚СЂС‹
REPO_DIR="${1:-$HOME/vovaipetrova-core}"
EXPORT_ZIP="${2:-/tmp/notion_export.zip}"
EXPORT_DIR="${3:-/tmp/notion_export}"
ROOT_PAGE="Р’РѕРІР° Рё РџРµС‚СЂРѕРІР°"

if [ ! -f "$EXPORT_ZIP" ]; then
  echo "РќРµ РЅР°Р№РґРµРЅ ZIP СЌРєСЃРїРѕСЂС‚ Notion: $EXPORT_ZIP" >&2
  exit 1
fi

rm -rf "$EXPORT_DIR" && mkdir -p "$EXPORT_DIR"
unzip -q "$EXPORT_ZIP" -d "$EXPORT_DIR"

mkdir -p "$REPO_DIR/docs/project" "$REPO_DIR/docs/think-tank" "$REPO_DIR/docs/kb" "$REРџРћ_DIR/docs/portfolio" "$REРџРћ_DIR/docs/nav" "$REРџРћ_DIR/scripts"

rsync -a "$EXPORT_DIR/$ROOT_PAGE/РћРїРёСЃР°РЅРёРµ вЂ” Р»РёС‚РµСЂР°С‚СѓСЂРЅР°СЏ РІРµСЂСЃРёСЏ"/ "$REРџРћ_DIR/docs/project/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/Think Tank вЂ” РєРѕРјРїР°РєС‚РЅРѕРµ СЏРґСЂРѕ"/ "$REРџРћ_DIR/docs/think-tank/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/Р‘Р°Р·Р° Р·РЅР°РЅРёР№"/ "$REРџРћ_DIR/docs/kb/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/РџРѕСЂС‚С„РѕР»РёРѕ вЂ” РєРѕСЂРµРЅСЊ"/ "$REРџРћ_DIR/docs/portfolio/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/РќР°РІРёРіР°С†РёСЏ (РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєР°СЏ)"/ "$REРџРћ_DIR/docs/nav/" || true

# РџСЂРµРѕР±СЂР°Р·РѕРІР°РЅРёСЏ РјРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ Р·РґРµСЃСЊ (frontвЂ‘matter, СЃСЃС‹Р»РєРё)

cd "$REРџРћ_DIR"
if git rev-parse --git-dir > /dev/null 2>&1; then
  git add .
  git diff --cached --quiet || git commit -m "chore: sync from Notion export $(date +%F-%T)"
else
  echo "Р РµРїРѕР·РёС‚РѕСЂРёР№ РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ: $REРџРћ_DIR" >&2
fi
```

### РЎРєСЂРёРїС‚вЂ‘СЂС‹Р±Р°: РґРѕР±Р°РІР»РµРЅРёРµ С„СЂРѕРЅС‚вЂ‘РјР°С‚С‚РµСЂР°

Р¤Р°Р№Р»: `scripts/add_frontmatter.py`

```python
#!/usr/bin/env python3
import sys
import pathlib
import datetime
import re

ROOT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("docs")
TODAY = datetime.date.today().isoformat()

def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\- _]", "", s)
    s = s.replace(" ", "-").replace("_", "-")
    s = re.sub(r"-+", "-", s)
    return s

for md in ROOT.rglob("*.md"):
    text = md.read_text(encoding="utf-8")
    if text.lstrip().startswith("---\n"):  # СѓР¶Рµ РµСЃС‚СЊ С„СЂРѕРЅС‚вЂ‘РјР°С‚С‚РµСЂ
        continue
    title = md.stem.replace("-", " ")
    slug = slugify(md.stem)
    section = md.parts[1] if len(md.parts) > 1 else "docs"
    fm = (
        f"---\n"
        f"title: \"{title}\"\n"
        f"slug: {slug}\n"
        f"section: {section}\n"
        f"tags: []\n"
        f"updated: {TODAY}\n"
        f"source: Notion\n"
        f"---\n\n"
    )
    md.write_text(fm + text, encoding="utf-8")
```

### GitHub Actions (РїСЂРѕРІРµСЂРєР° СЃСЃС‹Р»РѕРє, РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)

Р¤Р°Р№Р»: .github/workflows/docs.yml

```yaml
name: Docs checks
on: [push]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check frontвЂ‘matter exists
        run: |
          echo "РџСЂРѕРІРµСЂРєР° РЅР°Р»РёС‡РёСЏ С„СЂРѕРЅС‚вЂ‘РјР°С‚С‚РµСЂР° (РїСЂРёРјРµСЂ)"
          # Р—РґРµСЃСЊ РјРѕР¶РЅРѕ РґРѕР±Р°РІРёС‚СЊ СЃРєСЂРёРїС‚ РїСЂРѕРІРµСЂРєРё
      - name: List changed files
        run: git diff --name-only HEAD~1 || true
```

### n8n СЃС†РµРЅР°СЂРёР№ (РєРѕРЅС‚СѓСЂ)

- Webhook в†’ СЃРєР°С‡РёРІР°РЅРёРµ РїРѕСЃР»РµРґРЅРµРіРѕ СЌРєСЃРїРѕСЂС‚Р° Notion в†’ unzip в†’ rsync РІ docs/* в†’ `add_frontmatter.py` в†’ git commit/push

### Р§РµРєвЂ‘Р»РёСЃС‚ РїРµСЂРµРґ СЌРєСЃРїРѕСЂС‚РѕРј РёР· Notion

- РћС‚РєСЂРѕР№С‚Рµ РєРѕСЂРЅРµРІСѓСЋ СЃС‚СЂР°РЅРёС†Сѓ В«Р’РѕРІР° Рё РџРµС‚СЂРѕРІР°В» в†’ Export в†’ Markdown & CSV в†’ Include subpages
- РР·Р±РµРіР°Р№С‚Рµ СЃР»РѕР¶РЅС‹С… РєРѕР»РѕРЅРѕРє; РёСЃРїРѕР»СЊР·СѓР№С‚Рµ ## Рё ###
- РўР°Р±Р»РёС†С‹ СЌРєСЃРїРѕСЂС‚РёСЂСѓСЋС‚СЃСЏ СЂСЏРґРѕРј РєР°Рє .csv вЂ” С…СЂР°РЅРёС‚Рµ СЂСЏРґРѕРј СЃ .md

### README С€Р°Р±Р»РѕРЅ РґР»СЏ СЂРµРїРѕР·РёС‚РѕСЂРёСЏ

Р¤Р°Р№Р»: `README.md`

```markdown
# Vova & Petrova вЂ” Docs

РЎС‚СЂСѓРєС‚СѓСЂР° Р·РЅР°РЅРёР№, СЌРєСЃРїРѕСЂС‚РёСЂРѕРІР°РЅРЅР°СЏ РёР· Notion РІ Markdown.

- /docs/project вЂ” РєРѕРЅС†РµРїС†РёСЏ Рё Р°СЂС…РёС‚РµРєС‚СѓСЂР°
- /docs/think-tank вЂ” РєРѕРјРїР°РєС‚РЅРѕРµ СЏРґСЂРѕ (goals, org, agents, focus)
- /docs/kb вЂ” Р±Р°Р·Р° Р·РЅР°РЅРёР№ (СЃС‚Р°С‚СЊРё/РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹)
- /docs/portfolio вЂ” РєРµР№СЃС‹
- /docs/nav вЂ” РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєР°СЏ РЅР°РІРёРіР°С†РёСЏ

РџСЂР°РІРёР»Р° РґР»СЏ LLM:
- РљР°Р¶РґС‹Р№ С„Р°Р№Р» РЅР°С‡РёРЅР°РµС‚СЃСЏ СЃ YAML С„СЂРѕРЅС‚вЂ‘РјР°С‚С‚РµСЂР°
- РЎСЃС‹Р»РєРё РѕС‚РЅРѕСЃРёС‚РµР»СЊРЅС‹Рµ, Р±РµР· Р°Р±СЃРѕР»СЋС‚РЅС‹С… URL Notion
- РќР°Р·РІР°РЅРёСЏ РІ kebab-case, РїР°РїРєРё СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓСЋС‚ СЂР°Р·РґРµР»Р°Рј
```

### РЎРІСЏР·Р°РЅРѕ СЃвЂ¦

- [Spec вЂ” Normalize Рё РїРѕР»РёС‚РёРєР° РёРјС‘РЅ](spec-normalize-i-politika-imyon-c9023c.md)
- [РРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ Notion AI вЂ” vova_i_petrova](instrukcii-dlya-notion-ai-vovaipetrova.md)
- [Think Tank вЂ” РєРѕРјРїР°РєС‚РЅРѕРµ СЏРґСЂРѕ](think-tank-kompaktnoe-yadro.md)
