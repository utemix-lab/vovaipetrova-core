---
title: 'Seed: Dual Story 001'
slug: seed-dual-story-001
summary: 'Первые заготовки: авторский блок и машинный отчёт в одном файле.'
tags:
  - Seed
  - Story
machine_tags:
  - content/story
  - pipeline/seed
status: draft
story_type: dual
visuals:
  author_prompt: >-
    minimalist sketch: a blank page with faint pencil lines, soft shadows,
    contemplative atmosphere, monochrome
  report_prompt: >-
    technical diagram: file structure with seed template, metadata fields, draft
    status indicator, clean lines
notion_page_id: ''
last_edited_time: ''
---

# TL;DR

- Авторская заготовка: черновая рефлексия для дальнейшей доработки
- Машинный отчёт: метаданные и рекомендованные теги от author-gateway
- Цель: создать минимальный draft для ручного просмотра и дальнейшего наполнения

<!-- AUTHOR_BLOCK START -->
Черновая заготовка — напишите короткий абзац, который задаёт тон истории.
Текст — заполнитель, без PII, для дальнейшей ручной доработки.
<!-- AUTHOR_BLOCK END -->

<!-- MACHINE_REPORT START -->
Что произошло: Создан seed-файл для dual-story эпизода через author-gateway (PoC).

Зачем это делали: Создать минимальный draft для ручного просмотра и дальнейшего наполнения авторской и машинной частей.

Что получилось: Файл с базовой структурой dual-story, готовый для доработки.

Тех-вставка: Файл создан через `author-gateway.mjs` в режиме seed, использует шаблон из `templates/story.md` и метаданные из CHANGELOG.md.

Что дальше: Ручная доработка авторской части и проверка на отсутствие PII перед мерджем PR.
<!-- MACHINE_REPORT END -->
