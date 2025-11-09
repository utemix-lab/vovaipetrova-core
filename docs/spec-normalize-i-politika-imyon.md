---
title: Spec — Normalize и политика имён
slug: spec-normalize-i-politika-imyon
summary: 'Правила нормализации экспорта Notion: фронт-маттер, slug и устойчивость путей.'
tags:
  - Автоматизация
  - Кодинг
  - Хэштегов
machine_tags:
  - theme/automation
  - theme/dev
status: review
---
# Spec — Normalize и политика имён

### Цель

Единообразие md‑файлов и маршрутов после импорта Notion.

### Политика

- Распаковка: bsdtar, поддержка «двойного ZIP»
- Нормализация: scripts/normalize.mjs
    - перенос #Хэштегов из текста → tags[]
    - дополнение machine_tags по aliases из context-map.yaml
    - проставление title/slug/summary
    - переименование файла по slug → `kebab-case.md`
- Стабильность путей: не меняем slug без явной миграции (редиректы на уровне сборки)

### Проверки

- Отсутствуют дубликаты slug в одном разделе
- Нет «кракозябр» в названиях (Unicode → OK)

Связано: [Spec — Front matter и слуги](spec-front-matter-i-slugi.md), [Spec — Normalize и политика имён (актуальная версия)](spec-normalize-i-politika-imyon-c9023c.md), [README](../README.md)
