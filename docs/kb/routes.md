---
title: Routes
slug: routes
summary: Маршруты навигации сайта, определённые в routes.yml. Связывают URL-пути с документами и определяют структуру сайта.
status: ready
tags:
  - Навигация
  - База_знаний
machine_tags:
  - action/build
  - product/kb
  - theme/ux
---

# Routes

## TL;DR

Routes (маршруты) — это определение структуры навигации сайта через файл `docs/nav/routes.yml`. Связывают URL-пути с документами и определяют порядок отображения контента.

## Что это

Routes определяют:
- **Пути**: URL-маршруты сайта (`/`, `/kb`, `/think-tank`, и т.д.)
- **Документы**: Какие файлы обслуживают каждый маршрут
- **Порядок**: Последовательность отображения страниц
- **Статус**: Состояние каждого документа (ok, missing, draft)

## Структура

```yaml
routes:
  - path: /kb
    title: Knowledge Base
    description: контентная модель, фасеты, правила импорта
    entries:
      - slug: term-slug
        doc: docs/kb/term.md
        status: ok
        notes: описание
```

## Использование

### Генерация routes.json

Скрипт `scripts/generate-routes-json.mjs` преобразует `routes.yml` в `prototype/data/routes.json` для использования в Explorer.

### Проверка консистентности

Скрипт `scripts/check-routes-consistency.mjs` проверяет:
- Все ли документы включены в routes
- Нет ли orphan страниц (без маршрутов)
- Корректность slug и путей

## Правила

1. **Один документ — один маршрут**: Каждый документ должен быть привязан к маршруту
2. **Service файлы**: Могут быть без маршрута, если помечены `service: true`
3. **Статус**: Документы должны иметь статус `ok`, `missing` или `draft`

## Команды

```bash
# Проверка консистентности routes
npm run routes:check

# Генерация routes.json
node scripts/generate-routes-json.mjs
```

## Связано с…

- [Orphans](../nav/orphans-how-to.md) — страницы без маршрутов
- [Snapshot](snapshot.md) — diagnostics snapshot
- [Link-map](link-map.md) — маппинг ссылок

