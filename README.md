# Vova & Petrova — Docs

База знаний, экспортированная из Notion в Markdown.

## Структура

- `docs/` — все документы в Markdown с front matter (title, slug, tags, machine_tags)
- `docs/nav/tags.yaml` — маппинг видимых тегов → машинотегов (фасеты)
- `scripts/` — инструменты нормализации и линтинга

## Команды

```bash
# Нормализация: перенос хэштегов в front matter, генерация slug, machine_tags
npm run normalize

# Просмотр изменений без применения
npm run normalize:dry

# Исправление percent-encoded ссылок из Notion → нормализованные по slug
npm run fix:links

# Проверка качества (нестрогий режим: missing tags — предупреждения)
npm run lint:docs

# Строгий режим: missing tags = ошибки
npm run lint:docs:strict
```

## Процесс работы

1. **Экспорт из Notion** → получаешь .md файлы в `docs/`
2. **Нормализация**: `npm run normalize` — добавляет front matter, переименовывает по slug
3. **Исправление ссылок**: `npm run fix:links` — заменяет Notion-ссылки на нормализованные
4. **Проверка**: `npm run lint:docs` — показывает предупреждения (не валит сборку)

## Front matter

Каждый .md файл имеет:

```yaml
---
title: Название документа
slug: kebab-case-slug
summary: Краткое описание
tags: [UX, Видео, Adobe_Photoshop]  # видимые теги
machine_tags: [theme/ux, product/services]  # скрытые фасеты
---
```

## Теги и фасеты

- **Видимые теги** (`tags[]`): `#Title_Case` в тексте → попадают в front matter
- **Машинотеги** (`machine_tags[]`): генерируются автоматически через `docs/nav/tags.yaml`
- **Фасеты**: `theme/*`, `action/*`, `product/*`, `tool/*`, `role/*`, `country/*`

## Добавление новых тегов

1. Добавь видимый тег в текст: `#Новый_Тег`
2. При необходимости добавь алиас в `docs/nav/tags.yaml`:
   ```yaml
   "Новый_Тег":
     - product/services
     - theme/graphics
   ```
3. Запусти `npm run normalize`

## Источник истины

- **Notion** → думает, структурирует идеи
- **GitHub** → хранит машиночитаемую версию
- **Cursor/LLM** → читает и работает с документами
