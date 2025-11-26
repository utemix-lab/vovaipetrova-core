---
title: Cache warmup — контекст и словари
slug: cache-warmup-how-to
summary: >-
  Инструкция по регенерации снапшотов контекста и словарей для ускорения работы
  Composer
tags: []
machine_tags: []
status: ready
---

# Cache warmup — контекст и словари

## TL;DR

Снапшоты контекста и словарей ускоряют первые ответы Composer за счёт предзагрузки данных. Регенерируются при изменении исходных файлов.

## Что генерируется

**Полный снапшот** (`.cache/context-snapshot.json`):
- Теги и алиасы из `docs/nav/tags.yaml`
- Маршруты из `docs/nav/routes.yml`
- Link-map из `prototype/link-map.json`
- Глоссарий из `docs/glossarij-terminov.md`
- Context-map из `docs/context-map-yaml.md`

**Быстрые справки** (`.cache/quick-reference.json`):
- Топ-20 алиасов тегов
- Компактная карта маршрутов (path → slugs)
- Топ-10 exact mappings из link-map
- Топ-10 терминов и сокращений из глоссария

## Регенерация снапшотов

**Автоматическая регенерация:**
- При изменении `docs/nav/tags.yaml` → запустить `npm run cache:warmup`
- При изменении `docs/nav/routes.yml` → запустить `npm run cache:warmup`
- При изменении `prototype/link-map.json` → запустить `npm run cache:warmup`
- При изменении `docs/glossarij-terminov.md` → запустить `npm run cache:warmup`

**Ручная регенерация:**
```bash
npm run cache:warmup
```

**Когда регенерировать:**
- После обновления `tags.yaml` (добавление/изменение алиасов)
- После обновления `routes.yml` (добавление/изменение маршрутов)
- После обновления `link-map.json` (добавление/изменение маппингов)
- После обновления глоссария или context-map
- Перед началом работы Composer над новой задачей (опционально)

## Использование в скриптах

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

// Загрузка полного снапшота
const snapshot = JSON.parse(
  readFileSync('.cache/context-snapshot.json', 'utf8')
);

// Быстрый доступ к тегам
const tagAliases = snapshot.tags.aliases;
const machineTag = tagAliases['UX']; // ['theme/ux']

// Быстрый доступ к маршрутам
const routes = snapshot.routes.routes;
const slugsForPath = routes.find(r => r.path === '/')?.slugs || [];

// Быстрый доступ к link-map
const linkMap = snapshot.linkMap;
const canonicalSlug = linkMap.exact['notion-brain-108a7f']; // 'notion-brain'

// Загрузка быстрых справок (для ускорения)
const quickRef = JSON.parse(
  readFileSync('.cache/quick-reference.json', 'utf8')
);
```

## Структура снапшотов

### context-snapshot.json

```json
{
  "version": 1,
  "generated": "2025-11-20T08:00:00.000Z",
  "tags": {
    "aliases": { "UX": ["theme/ux"], ... },
    "canonical": {},
    "count": 40
  },
  "routes": {
    "version": 1,
    "updated": "2025-11-18",
    "paths": ["/", "/project", ...],
    "totalSlugs": 66,
    "routes": [...]
  },
  "linkMap": {
    "exactCount": 21,
    "patternsCount": 9,
    "exact": { ... },
    "patterns": [...]
  },
  "glossary": {
    "termsCount": 0,
    "abbreviationsCount": 0,
    "entitiesCount": 0,
    "terms": [],
    "abbreviations": [],
    "entities": []
  },
  "contextMap": {
    "facets": { ... },
    "aliases": { ... },
    "policies": { ... }
  }
}
```

### quick-reference.json

```json
{
  "tags": { "UX": ["theme/ux"], ... },
  "routes": { "/": ["vova-i-petrova", ...], ... },
  "linkMap": { "notion-brain-108a7f": "notion-brain", ... },
  "glossary": {
    "terms": [...],
    "abbreviations": [...]
  }
}
```

## Интеграция в процесс работы

**Для Composer:**
1. Перед началом работы над задачей (опционально): `npm run cache:warmup`
2. Использовать `.cache/quick-reference.json` для быстрого доступа к данным
3. Использовать `.cache/context-snapshot.json` для полного контекста

**В CI/CD:**
- Снапшоты можно генерировать автоматически при изменении исходных файлов
- Добавить шаг в workflow для регенерации при изменении `tags.yaml`, `routes.yml`, `link-map.json`

## Связано с

- `docs/nav/tags.yaml` — источник алиасов тегов
- `docs/nav/routes.yml` — источник маршрутов
- `prototype/link-map.json` — источник маппингов ссылок
- `docs/glossarij-terminov.md` — источник глоссария
- `docs/context-map-yaml.md` — источник context-map
- `docs/SINGLE-SOURCE-PLAYBOOK.md` — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов

