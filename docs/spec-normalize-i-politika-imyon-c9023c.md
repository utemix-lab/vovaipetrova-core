---
title: Spec — Normalize и политика имён
slug: spec-normalize-i-politika-imyon-c9023c
summary: >-
  Актуальные правила нормализации экспорта Notion: что делает скрипт и какие
  ограничения на slug.
tags:
  - Автоматизация
  - Кодинг
  - UX
  - Генерация_Видео
machine_tags:
  - theme/automation
  - theme/dev
  - theme/ux
  - theme/graphics
status: review
---
# Spec — Normalize и политика имён

### Цель

Единообразие md‑файлов и маршрутов после импорта Notion.

### Политика

- Распаковка: bsdtar, поддержка «двойного ZIP»
- Нормализация: scripts/normalize.mjs
    - перенос #UX, #Генерация_Видео из текста → tags[]
    - дополнение machine_tags по aliases из context-map.yaml
    - проставление title/slug/summary
    - переименование файла по slug → `kebab-case.md`
- Стабильность путей: не меняем slug без явной миграции (редиректы на уровне сборки)

### Проверки

- Отсутствуют дубликаты slug в одном разделе
- Нет «кракозябр» в названиях (Unicode → OK)

Связано: [Spec — Front matter и слуги](spec-front-matter-i-slugi-91237c.md), [Spec — Normalize и политика имён](spec-normalize-i-politika-imyon.md), [README](../README.md)
