---
title: Stories — Общий контекст для работы
slug: stories-shared-context
summary: Общий контекст проекта для работы с Stories и агентами
tags:
  - Story
  - Проектирование
machine_tags:
  - content/story
  - theme/design
status: ready
---

# Stories — Общий контекст для работы

## О проекте

**Vova & Petrova — Docs** — база знаний, экспортированная из Notion в Markdown.

- **Репозиторий**: https://github.com/utemix-lab/vovaipetrova-core
- **Прототип**: https://utemix-lab.github.io/vovaipetrova-core/
- **Источник истины**: Notion (экспорт в GitHub)

## Структура проекта

### Зоны контента

| Зона | Описание | Путь |
| --- | --- | --- |
| **Think Tank** | Архитектурные решения, ADR, картина проекта | `docs/think-tank-*.md`, `docs/adr-*.md` |
| **Labs / Explorer** | Практические эксперименты, услуги, прототипы | `docs/artefakty-*.md`, `docs/kartochka-*.md` |
| **Stories** | Хроника проекта, эпизоды развития | `docs/stories/` |

### Ключевые файлы

- `README.md` — структура и команды проекта
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — правила работы агентов
- `docs/nav/tags.yaml` — маппинг тегов → машинотегов
- `docs/nav/routes.yml` — карта маршрутов сайта
- `templates/story.md` — шаблон для новых эпизодов Stories

## Формат Stories

### Структура эпизода

1. **TL;DR** — краткое резюме (3–5 пунктов)
2. **Что произошло** — описание события
3. **Зачем это делали** — мотивация
4. **Что получилось** — результаты
5. **Тех-вставка** — технические детали (2–3 предложения)
6. **Что дальше** — следующие шаги

### Требования

- **Объём**: 700–1200 знаков
- **Статус**: `draft` → `review` → `ready`
- **Теги**: `tags: [Story]`, `machine_tags: [content/story]`
- **Формат**: Markdown с front matter

## Процесс работы

### Создание эпизода

1. Используйте шаблон `templates/story.md`
2. Заполните структуру эпизода
3. Проверьте формат и объём
4. Запустите проверки:
   ```bash
   npm run pii:scan          # Проверка PII
   npm run lint:docs         # Проверка линтинга
   npm run normalize:dry     # Проверка нормализации
   ```
5. Создайте PR с меткой `content/story`

### Автоматическая генерация

Генератор `scripts/generate-stories.mjs`:
- Запускается ежедневно через workflow
- Читает CHANGELOG.md, ADR, stats.json, Briefs
- Создаёт эпизод по шаблону
- Создаёт PR с меткой `auto:story`

## Safety Rails

### Запрещено

- ❌ Использовать первое лицо с именами реальных людей
- ❌ Указывать пути пользователей (`C:\Users\...`)
- ❌ Указывать email, телефоны, адреса реальных людей
- ❌ Создавать файлы без front matter
- ❌ Менять slug существующих файлов без миграции

### Разрешено

- ✅ Использовать анонимные плейсхолдеры: `[Имя]`, `[Email]`
- ✅ Использовать вымышленные данные для примеров
- ✅ Писать от нейтрального автора
- ✅ Фиксировать факты и решения

## Команды

```bash
# Нормализация
npm run normalize              # Применить нормализацию
npm run normalize:dry          # Просмотр изменений без применения

# Проверки
npm run lint:docs              # Проверка качества контента
npm run pii:scan               # Проверка PII
npm run check:pr-size          # Проверка размера PR
npm run check:lanes            # Проверка lanes policy

# Генерация
npm run story:generate          # Генерация Stories
```

## Интеграция

### Explorer

Stories интегрированы в Explorer:
- Поле `collection: "stories"` в front matter
- Поле `story_order` из slug для сортировки
- Фильтрация через `isStoryPage()`
- Отображение в ленте Stories

### GitHub

- Эпизоды хранятся в `docs/stories/`
- Формат: `XXX-краткое-описание.md`
- Статусы: `draft`, `review`, `ready`
- PR с меткой `content/story` или `auto:story`

## Recent tool additions

The following helper scripts and Notion-report integration have been added to support the Stories pipeline:

- `scripts/notion-report.mjs` — minimal reporter to post JSON summaries to the "Copilot — Отчёты" Notion page (created/maintained by Cursor). Use it with `--file` or `--payload`.
- `scripts/generate-stories.mjs` — generator updated to include `author_image` and `machine_image` placeholders in front matter and to create a small `tmp/story-meta.json` after generation; it now attempts a best-effort call to `scripts/notion-report.mjs` to publish a minimal report.
- `scripts/author-gateway.mjs` — Author Gateway PoC (auto / hitl / human-first modes) to orchestrate generation and optionally forward a report to Notion.
- `scripts/add-image-to-episode.mjs` — helper to update `author_image` or `machine_image` front matter for a story by file or slug (sets url, status, uploaded_by, uploaded_at).

These additions are intended to avoid duplicated work: the generator and Notion reporter handle minimal reporting, while the gateway and image helper support human workflows (HitL and manual illustration).

## Контекст для агентов

### Вход агента

- **Источник задачи**: Notion (Briefs) с полями `Brief`, `Scope`, `Deliverables`, `Executor`, `Lane`
- **Контекст проекта**: `docs/protocol-kontraktnaya-model-dlya-agentov.md`
- **Шаблон**: `templates/story.md`

### Выход агента

- **Ветка**: `{type}/{short-description}` (например, `chore/stories-concept`)
- **Коммиты**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **PR**: с описанием изменений и секцией Deliverables
- **Файлы**: в `docs/stories/` с правильным front matter

### QA-ворота

Перед PR:
1. ✅ `npm run normalize:dry` — проверить изменения
2. ✅ `npm run lint:docs` — проверить качество
3. ✅ `npm run pii:scan` — проверить PII (обязательно для Stories)
4. ✅ `npm run check:pr-size` — проверить размер PR
5. ✅ `npm run check:lanes` — проверить lanes policy

## Связанные документы

- [CONCEPT.md](CONCEPT.md) — концепция Stories
- [Protocol — Контрактная модель для агентов](../protocol-kontraktnaya-model-dlya-agentov.md)
- [Шаблон story.md](../../templates/story.md)
- [README](../../README.md)

