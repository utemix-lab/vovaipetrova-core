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

### Автоматизация

**GitHub Actions** для безопасной работы с документами:

1. **Auto-normalize docs** — автоматическая нормализация при push в `docs/`:
   - Запускается при изменении `.md` файлов в `docs/` или `tags.yaml`
   - Выполняет `normalize` и `fix:links`
   - Автоматически коммитит изменения обратно (если есть что коммитить)

2. **Notion Import (Safe PR)** — безопасный импорт из Notion через PR:
   - Защита от перезаписи критических файлов (`deny_paths`)
   - Проверка безопасности перед нормализацией
   - Создаёт PR для ревью изменений
   - Запускается вручную: Actions → "Notion Import" → "Run workflow"

### Безопасный импорт из Notion

**Вариант 1: ZIP архив (рекомендуется)**

Пошаговая инструкция:

```powershell
# 1. Убедись, что папка uploads/ существует (создаётся автоматически)
# 2. Положи ZIP архив из Notion в папку uploads/

# 3. Создай ветку (замени дату на текущую)
git checkout -b notion-sync/2025-11-06

# 4. Добавь ZIP файл в git
git add uploads/*.zip

# 5. Закоммить
git commit -m "Notion export"

# 6. Отправь на GitHub
git push origin notion-sync/2025-11-06
```

После push:
- Workflow автоматически запустится
- Распакует ZIP из `uploads/`
- Применит маппинг путей из `docs/.import-map.yaml`
- Проверит безопасность
- Нормализует документы с таблицей действий
- Создаст PR с чек-листом и label (`auto:ready-for-review` или `auto:needs-fixes`)

Проверь PR в GitHub → Actions → "Notion Import" и merge, если всё ок.

**Вариант 2: Уже распакованные .md файлы**
1. Экспортируй из Notion → получи `.md` файлы
2. Создай ветку `notion-sync/YYYY-MM-DD` и закоммить файлы в `docs/`
3. Push в ветку `notion-sync/**`
4. Workflow проверит безопасность, нормализует и создаст PR
5. Проверь PR и merge, если всё ок

**Защита:**
- `docs/.import-map.yaml` — маппинг путей и список `deny_paths`
- `npm run check:import` — проверка безопасности перед импортом
- Критические файлы (`scripts/`, `.github/`, `package.json`) защищены от перезаписи

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
