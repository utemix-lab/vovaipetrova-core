---
title: Snapshot
slug: snapshot
summary: >-
  Моментальный снимок состояния данных (diagnostics snapshot) для отслеживания
  метрик и проверки регрессий.
status: ready
tags:
  - Автоматизация
  - База_знаний
machine_tags:
  - action/build
  - product/kb
  - theme/automation
---

# Snapshot

## TL;DR

Snapshot (снапшот) — это моментальный снимок состояния данных проекта в определённый момент времени. Используется для отслеживания метрик, проверки регрессий и быстрого восстановления контекста.

## Что это

Snapshots содержат:
- Статистику страниц (количество, статусы)
- Информацию о проблемных ссылках
- Метрики качества контента
- Индексы для быстрого поиска

## Типы snapshots

### Diagnostics Snapshot

Автоматически генерируется после каждого merge в `main`:
- `prototype/data/pages.json` — список всех страниц
- `prototype/data/broken-links.json` — проблемные ссылки
- `prototype/data/stats.json` — статистика и метрики
- `prototype/data/orphans.json` — страницы без маршрутов

### Context Snapshot

Генерируется через `npm run cache:warmup`:
- `.cache/context-snapshot.json` — полный снапшот контекста
- `.cache/quick-reference.json` — быстрые справки

## Использование

### Генерация

```bash
# Полный diagnostics snapshot
npm run diagnostics:snapshot

# Context snapshot для Composer
npm run cache:warmup
```

### Проверка регрессий

CI автоматически проверяет snapshots на наличие регрессий:
- Увеличение количества broken links
- Изменение метрик качества
- Появление новых orphan страниц

## Связано с…

- [Link-map](link-map.md) — маппинг ссылок
- [Routes](routes.md) — маршруты навигации
- [State snapshot](../state-snapshot-current-state.md) — текущее состояние проекта

