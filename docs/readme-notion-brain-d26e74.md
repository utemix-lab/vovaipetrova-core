---
title: README (notion-brain)
slug: readme-notion-brain-d26e74
service: true
summary: >-
  Контекстный пакет для исполнителей и CI. Архитектура и правила без контента.
  ADR — ключевые решения Specs — форматы и требования
tags: []
machine_tags: []
status: draft
---
# README (notion-brain)

### Что это

Контекстный пакет для исполнителей и CI. Архитектура и правила без контента.

### Состав

- ADR — ключевые решения
- Specs — форматы и требования
- Instructions — как править и деплоить
- context-map.yaml — словари и маппинги

### Поток

- Источник истины: Notion → экспорт только notion-brain
- Исполнители: читают notion-brain → правят docs/prototype → PR/commit
- Actions: импорт Notion (контент) и деплой Pages (прототип)

Связано: [Think Tank — компактное ядро](think-tank-kompaktnoe-yadro-1d36dd.md), [UI макет — шапка и первый экран (Static First)](ui-maket-shapka-i-pervyj-ekran-static-first.md)
