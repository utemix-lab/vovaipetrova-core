---
title: CONCEPT — Opus4 notes (draft)
slug: concept-opus4-notes
summary: "Наброски концепции Stories v2 от OPUS4: двойная линия (author + machine), front matter spec и предложения по автоматизации."
tags:
  - Story
  - Проектирование
machine_tags:
  - content/story
  - theme/design
status: draft
---

# CONCEPT — Opus4 notes (draft)

Это рабочие заметки OPUS4 по развитию формата Stories v2: идея dual-line (авторская линия + машинный отчёт), front matter, JSON schemas и пример эпизода.

Ключевая идея
- Каждая история состоит из двух параллельных слоёв: живой авторской рефлексии и фактического, машинного отчёта. Эти слои публикуются вместе в одном Markdown-файле и визуально различаются.
- Авторская линия — художественная, нейтральный/ненаправленный голос, избегает личных имён; иллюстрируется фантазийными сценами.
- Машинная линия — методичная, привязана к PR/commit/ADR и иллюстрируется «рабочими» кадрами.

Front matter — рекомендуемая спецификация (YAML)
```yaml
---
title: string
slug: string
summary: string
tags: [Story]
machine_tags: [content/story]
status: draft | review | ready
story_type: dual | linear
author_block:
  teaser: string        # короткая аннотация авторской части для индексирования
machine_report_refs:
  prs: [number]
  commits: [string]
  issues: [number]
visuals:
  author_prompt: string
  report_prompt: string
  assets: [string]      # пути к сохранённым изображениям
links:
  related_adr: [string]
  related_brief: [string]
metrics:
  impact_estimate: string
  time_saved: number
  files_changed: number
---
```

JSON schemas
- Схемы JSON для `Story`, `Scene`, `Character` находятся в `docs/stories/models/` (черновые). Они нужны для тех частей, где мы хотим индексировать и публиковать через API.

Author-line automation (overview)
- human-first: автор пишет; агент предлагает варианты редакции.
- human-in-the-loop: агент генерирует 2–3 варианта авторского блока по ключевым событиям; автор выбирает и дорабатывает.
- auto-assisted: агент генерирует черновик автоматически на триггере (merge, milestone) — рискованно для качества, требует сильной валидации.

Примерный workflow
1. Машинный скрипт (generate-stories.mjs) формирует machine_report на основе GitHub/CHANGELOG.
2. OPUS4 (или агент) получает summary и создаёт авторскую версию вручную или полуавтоматически.
3. Визуальные prompts сохраняются в front matter и через MCP->OpenRouter генерируются изображения.
4. Проверки: pii:scan, lint:docs, normalize:dry, check:lanes.

Файлы, созданные в рамках этого наброска:
- `docs/stories/models/story.schema.json`
- `docs/stories/models/scene.schema.json`
- `docs/stories/models/character.schema.json`
- `docs/stories/001-opus4-example-dual.md` (draft)

---
