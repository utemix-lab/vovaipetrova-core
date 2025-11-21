---
title: Link-map
slug: link-map
summary: >-
  Карта маппинга проблемных ссылок на канонические страницы. Используется для
  разрешения broken links и нормализации ссылок.
status: ready
tags:
  - Автоматизация
  - База_знаний
  - Навигация
machine_tags:
  - action/build
  - product/kb
  - product/site
  - theme/automation
  - theme/ux
---

# Link-map

## TL;DR

Link-map — это карта соответствий между проблемными ссылками и каноническими страницами. Используется для автоматического разрешения broken links и нормализации ссылок в документации.

## Что это

Link-map хранится в `prototype/link-map.json` и содержит:
- **Exact mappings**: точные соответствия проблемных ссылок каноническим slug
- **Patterns**: регулярные выражения для групповой обработки ссылок

## Структура

```json
{
  "exact": {
    "problematic-link.md": "canonical-slug",
    "../CONTRIBUTING.md": "vova-i-petrova"
  },
  "patterns": [
    {
      "pattern": "\\.csv$",
      "target": "vova-i-petrova"
    }
  ]
}
```

## Использование

### Автоматическое разрешение

Скрипт `scripts/report-broken-internal-links.mjs` использует link-map для:
- Поиска соответствий проблемных ссылок
- Категоризации ссылок (internal, service, external, unknown)
- Генерации отчётов о broken links

### Обновление

Link-map обновляется вручную при обнаружении новых проблемных ссылок или изменении структуры документации.

## Правила

1. **Exact mappings**: Используются для конкретных проблемных ссылок
2. **Patterns**: Используются для групповой обработки (например, все CSV файлы)
3. **Canonical target**: Всегда указывается канонический slug страницы

## Примеры

- CSV файлы с Notion-хешами → `vova-i-petrova`
- Относительные пути вне `docs/` → соответствующие страницы
- Service файлы → игнорируются в broken links

## Связано с…

- [Snapshot](snapshot.md) — diagnostics snapshot
- [Routes](routes.md) — маршруты навигации
- [Canonical slug](canonical-slug.md) — канонические идентификаторы

