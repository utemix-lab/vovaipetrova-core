---
title: "Seed: Dual Story 001"
slug: "seed-dual-story-001"
summary: "Первые заготовки: авторский блок и машинный отчёт в одном файле."
tags: [Story, Seed]
machine_tags: [content/story, pipeline/seed]
status: draft
notion_page_id: ""
last_edited_time: ""
author_block: |
  автор: Черновая заготовка — напишите короткий абзац, который задаёт тон истории.
  Текст — заполнитель, без PII, для дальнейшей ручной доработки.

machine_report: |
  {
    "executor": "author-gateway (PoC)",
    "generated_at": "2025-11-23T00:00:00Z",
    "notes": "Машинный отчёт: метаданные и рекомендованные тэги. Без PII.",
    "sources": ["repo:CHANGELOG.md", "repo:templates/story.md"]
  }
---


## Черновик

Этот файл содержит два логических блока: авторский (AUTHOR_BLOCK) и машинный отчёт (MACHINE_REPORT).

Цель: создать минимальный draft для ручного просмотра и дальнейшего наполнения.

Инструкция для ревьюера:

- Проверьте, что в тексте нет PII (email, реальные имена, пути).
- Если всё ок — мержите PR; после этого можно запустить генератор/далее этапы.

