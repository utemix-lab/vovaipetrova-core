---
title: Facets
slug: facets
summary: "Фасетная модель навигации: темы, действия, продукты, технологии и роли. Используется для фильтрации и категоризации контента."
status: ready
tags:
  - Навигация
  - База_знаний
machine_tags:
  - action/build
  - product/kb
  - theme/ux
---

# Facets

## TL;DR

Facets (фасеты) — это многомерная система категоризации контента через machine_tags. Позволяет фильтровать и находить материалы по темам, действиям, продуктам, технологиям и ролям.

## Что это

Фасетная модель состоит из нескольких измерений:

### Типы фасетов

- **Темы (`theme/*`)**: `theme/automation`, `theme/graphics`, `theme/ux`
- **Действия (`action/*`)**: `action/build`, `action/learn`, `action/edit`
- **Продукты (`product/*`)**: `product/kb`, `product/site`, `product/services`
- **Технологии (`tool/*`, `producer/*`)**: `tool/stable-diffusion`, `producer/openai`
- **Роли (`role/*`)**: `role/client`, `role/dev`, `role/novice`

## Использование

### В front matter

```yaml
machine_tags:
  - theme/automation
  - action/build
  - product/kb
```

### В фильтрации

Explorer использует фасеты для:
- Фильтрации по темам
- Поиска по действиям
- Группировки по продуктам

## Правила

1. **Минимум 3 фасета**: Каждая страница должна иметь минимум по одному фасету из трёх групп (тема, действие, технология)
2. **Канонические значения**: Используются значения из `tags.yaml` через aliases
3. **Нормализация**: Скрипт `normalize.mjs` проверяет корректность фасетов

## Связано с…

- [Tags](tags.md) — система тегов
- [Aliases](aliases.md) — синонимы
- [Таксономия и теги](../taksonomiya-i-tegi.md)

