---
title: UNIVERSE_SPEC v0.1 — спецификация графа экосистемы
slug: universe-spec-v0-1
summary: Короткая спецификация property-graph для связи артефактов, терминов и решений.
tags: [Universe_Graph, Graph_Spec, Ecosystem]
machine_tags: [theme/architecture, action/spec, product/graph]
status: draft
---
# UNIVERSE_SPEC v0.1 — спецификация графа экосистемы

## TL;DR
Единый property-graph для связывания артефактов (Docs/KB/Stories), решений и паттернов. Экспорт — `graph.jsonl`, строка = узел/ребро. Схема в `docs/graph/universe.schema.json`.

## Цели
- Зафиксировать минимальный набор типов узлов и ребер.
- Обозначить поля идентификации и провананса.
- Дать формат экспорта и минимальный пример.

## Не цели (v0.1)
- Расширенная семантика доменов (финансы, метрики, персоны).
- Временные графы и потоковые обновления.

## Типы узлов (Nodes)
Минимальный набор:
- `Project`
- `Repository`
- `Concept`
- `Pattern`
- `Decision`
- `Rule`
- `Term`
- `Doc`
- `Chunk`

## Типы ребер (Edges)
### SYMBOLIC (логические)
- `governs`
- `implements`
- `constrains`
- `see_also`
- `mentions`
- `has_tag`
- `in_facet`

### VECTOR (семантические)
- `semantic_near`
- `similar_to`

## Идентификаторы и провананс
Обязательные поля для узлов и ребер:
- `stable_id` — стабильный идентификатор (детерминированный).
- `project_id` — идентификатор проекта (например, `vovaipetrova`).
- `source` — источник данных (`docs`, `kb`, `stories`, `prototype`, `notion`).
- `version` — версия схемы/экспорта (например, `0.1`).
- `updated_at` — ISO-8601 timestamp.
- `provenance` — объект с метаданными источника (например, `path`, `url`, `commit`).

## Формат экспорта
`graph.jsonl` — построчный JSON:
- каждая строка — либо `node`, либо `edge`.
- ссылка на schema — в документации (эта страница).

## Пример
Файл `docs/graph/graph.jsonl` показывает минимальный пример формата.

## Экспорт локального подграфа
Скрипт: `scripts/graph/map_local_to_universe.mjs`

Выход:
- `data/graph/graph.jsonl`

## Валидация
Скрипт: `scripts/graph/validate_universe.mjs`

### Пути
- Schema: `docs/graph/universe.schema.json`
- Пример: `docs/graph/graph.jsonl`

## Версионирование
- `0.x` — допускаются несовместимые изменения.
- `1.0` — стабильная схема и контракты экспорта.
