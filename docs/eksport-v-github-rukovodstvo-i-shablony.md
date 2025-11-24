---
title: Экспорт в GitHub — руководство и шаблоны
slug: eksport-v-github-rukovodstvo-i-shablony
summary: >-
  Как выгружать контент из Notion в GitHub: структура репозитория, скрипты и
  чек-лист экспорта.
tags:
  - Автоматизация
  - Кодинг
  - Проектирование
machine_tags:
  - action/build
  - product/services
  - theme/automation
  - theme/dev
  - theme/graphics
status: review
---
# Экспорт в GitHub — руководство и шаблоны

<aside>
🔗

Экспорт структуры в GitHub в формате Markdown, читаемом для LLM.

</aside>

### TL;DR

- Экспортируем ветку Notion → Markdown (.md + папки) → GitHub repo
- Единые правила имён/фронт‑маттера → лучшее индексирование LLM
- Скрипт‑рыба и структура репозитория ниже

---

### Требования

- Аккаунт GitHub и пустой репозиторий, например: vovaipetrova-core
- Git установлен локально
- (Опционально) n8n/Make/Zapier для автоматизации по расписанию

### Рекомендуемая структура репозитория

```
/README.md
/docs/                # публичная документация
  /project/           # описание проекта (этот раздел)
  /think-tank/        # ядро (goals, org, agents, focus)
  /kb/                # база знаний (статьи, инструменты)
  /portfolio/         # кейсы
  /nav/               # пользовательская навигация и гайды
/scripts/             # утилиты экспорта/синхронизации
/.github/workflows/   # автосборки/проверки (опционально)
```

### Именование файлов и папок

- kebab-case для файлов: `suts-proekta-one-liner.md`
- Папки соответствуют разделам в Notion
- Внутренние ссылки — относительные Markdown‑ссылки

### YAML фронт‑маттер для LLM

В начало каждого .md:

```yaml
---
title: "Суть проекта — One-liner"
slug: suts-proekta-one-liner
section: project
tags: [concept, overview]
updated: 2025-11-02
source: Notion
---
```

### Скрипт‑рыба: экспорт Markdown в GitHub

Файл: `scripts/export_notion_to_github.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
# Параметры
REPO_DIR="${1:-$HOME/vovaipetrova-core}"
EXPORT_ZIP="${2:-/tmp/notion_export.zip}"
EXPORT_DIR="${3:-/tmp/notion_export}"
ROOT_PAGE="Вова и Петрова"

if [ ! -f "$EXPORT_ZIP" ]; then
  echo "Не найден ZIP экспорт Notion: $EXPORT_ZIP" >&2
  exit 1
fi

rm -rf "$EXPORT_DIR" && mkdir -p "$EXPORT_DIR"
unzip -q "$EXPORT_ZIP" -d "$EXPORT_DIR"

mkdir -p "$REPO_DIR/docs/project" "$REPO_DIR/docs/think-tank" "$REPO_DIR/docs/kb" "$REPO_DIR/docs/portfolio" "$REPO_DIR/docs/nav" "$REPO_DIR/scripts"

rsync -a "$EXPORT_DIR/$ROOT_PAGE/Описание — литературная версия"/ "$REPO_DIR/docs/project/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/Think Tank — компактное ядро"/ "$REPO_DIR/docs/think-tank/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/База знаний"/ "$REPO_DIR/docs/kb/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/Портфолио — корень"/ "$REPO_DIR/docs/portfolio/" || true
rsync -a "$EXPORT_DIR/$ROOT_PAGE/Навигация (пользовательская)"/ "$REPO_DIR/docs/nav/" || true

# Преобразования можно добавить здесь (front‑matter, ссылки)

cd "$REPO_DIR"
if git rev-parse --git-dir > /dev/null 2>&1; then
  git add .
  git diff --cached --quiet || git commit -m "chore: sync from Notion export $(date +%F-%T)"
else
  echo "Репозиторий не инициализирован: $REPO_DIR" >&2
fi
```

### Скрипт‑рыба: добавление фронт‑маттера

Файл: `scripts/add_frontmatter.py`

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
    if text.lstrip().startswith("---\n"):  # уже есть фронт‑маттер
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

### GitHub Actions (проверка ссылок, опционально)

Файл: .github/workflows/docs.yml

```yaml
name: Docs checks
on: [push]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check front‑matter exists
        run: |
          echo "Проверка наличия фронт‑маттера (пример)"
          # Здесь можно добавить скрипт проверки
      - name: List changed files
        run: git diff --name-only HEAD~1 || true
```

### n8n сценарий (контур)

- Webhook → скачивание последнего экспорта Notion → unzip → rsync в docs/* → `add_frontmatter.py` → git commit/push

### Чек‑лист перед экспортом из Notion

- Откройте корневую страницу «Вова и Петрова» → Export → Markdown & CSV → Include subpages
- Избегайте сложных колонок; используйте ## и ###
- Таблицы экспортируются рядом как .csv — храните рядом с .md

### README шаблон для репозитория

Файл: `README.md`

```markdown
# Vova & Petrova — Docs

Структура знаний, экспортированная из Notion в Markdown.

- /docs/project — концепция и архитектура
- /docs/think-tank — компактное ядро (goals, org, agents, focus)
- /docs/kb — база знаний (статьи/инструменты)
- /docs/portfolio — кейсы
- /docs/nav — пользовательская навигация

Правила для LLM:
- Каждый файл начинается с YAML фронт‑маттера
- Ссылки относительные, без абсолютных URL Notion
- Названия в kebab-case, папки соответствуют разделам
```

### Связано с…

- [Single Source Playbook — «священный документ» (Notion↔Repo)](SINGLE-SOURCE-PLAYBOOK.md) — единый источник истины для синхронизации между Notion и GitHub
- [Spec — Normalize и политика имён](spec-normalize-i-politika-imyon-c9023c.md)
- [Инструкции для Notion AI — vova_i_petrova](instrukcii-dlya-notion-ai-vovaipetrova.md)
- [Think Tank — компактное ядро](think-tank-kompaktnoe-yadro.md)
