---
title: Machine Tags
slug: machine-tags
summary: >-
  Машиночитаемые теги для автоматической категоризации и фильтрации контента.
  Используются в фасетной модели навигации.
status: ready
tags:
  - База_знаний
  - Навигация
machine_tags:
  - product/kb
  - product/site
  - theme/ux
---

# Machine Tags

## TL;DR

Machine tags (машинотеги) — это машиночитаемые теги для автоматической категоризации и фильтрации контента. Используются в фасетной модели навигации и отличаются от видимых тегов форматом и назначением.

## Что это

Machine tags:
- Используют формат `category/value` (например, `theme/automation`)
- Автоматически нормализуются через `tags.yaml`
- Используются для фильтрации и поиска в Explorer

## Отличие от видимых тегов

### Видимые теги (`tags`)
- Формат: TitleCase с подчёркиваниями (`#Проектирование`, `#Видео`)
- Отображаются пользователю
- Используются для визуальной категоризации

### Machine tags (`machine_tags`)
- Формат: `category/value` (`theme/automation`, `action/build`)
- Не отображаются напрямую
- Используются для автоматической фильтрации

## Структура фасетов

- **Темы (`theme/*`)**: `theme/automation`, `theme/graphics`, `theme/ux`
- **Действия (`action/*`)**: `action/build`, `action/learn`, `action/edit`
- **Продукты (`product/*`)**: `product/kb`, `product/site`, `product/services`
- **Технологии (`tool/*`, `producer/*`)**: `tool/stable-diffusion`, `producer/openai`
- **Роли (`role/*`)**: `role/client`, `role/dev`, `role/novice`

## Использование

### В front matter

```yaml
tags:
  - Проектирование
  - Видео
machine_tags:
  - theme/automation
  - action/build
  - product/kb
```

### Нормализация

Скрипт `scripts/normalize.mjs` проверяет:
- Корректность формата machine tags
- Наличие соответствующих aliases в `tags.yaml`
- Отсутствие дубликатов

## Связано с…

- [Facets](facets.md) — фасетная модель
- [Tags](tags.md) — система тегов
- [Aliases](aliases.md) — синонимы
- [Таксономия и теги](../taksonomiya-i-tegi.md)

