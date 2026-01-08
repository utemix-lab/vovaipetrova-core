---
title: Stories — Инструкции для работы
slug: stories-readme
summary: Инструкции для работы со Stories эпизодами для агентов и людей
tags: []
machine_tags: []
status: ready
service: true
---

# Stories — Инструкции для работы

## Быстрый старт

### Для агентов (OPUS4, Copilot, CodeGPT)

1. **Прочитайте контекст**:
   - `CONCEPT.md` — концепция Stories
   - `stories-shared-context.md` — общий контекст проекта
   - `OPUS4_ROLE.md` — роль и инструкции для агента

2. **Используйте шаблон**: `../../templates/story.md`

3. **Создайте эпизод** по структуре:
   - TL;DR
   - Что произошло
   - Зачем это делали
   - Что получилось
   - Тех-вставка
   - Что дальше

4. **Проверьте перед PR**:
   ```bash
   npm run pii:scan          # Обязательно для Stories
   npm run lint:docs
   npm run normalize:dry
   npm run check:pr-size
   npm run check:lanes
   ```

### Для людей

1. Откройте `templates/story.md`
2. Скопируйте шаблон
3. Заполните структуру эпизода
4. Сохраните в `docs/stories/` с именем `XXX-краткое-описание.md`
5. Запустите проверки и создайте PR

## Структура

- `CONCEPT.md` — концепция и принципы Stories
- `stories-shared-context.md` — общий контекст для работы
- `OPUS4_ROLE.md` — роль и инструкции для агента OPUS4
- `README.md` — этот файл (быстрый старт)

## Формат эпизода

### Front matter

```yaml
---
title: "Название эпизода"
slug: "XXX-краткое-описание"
summary: "Краткая аннотация (1–2 предложения)"
tags: [Story]
machine_tags: [content/story]
status: draft  # draft | review | ready
last_edited_time: null
---
```

### Структура контента

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

## Процесс работы

### Ручное создание

1. Используйте шаблон `templates/story.md`
2. Заполните структуру эпизода
3. Проверьте формат и объём
4. Запустите проверки
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
# Проверки
npm run pii:scan              # Проверка PII (обязательно для Stories)
npm run lint:docs            # Проверка линтинга
npm run normalize:dry        # Просмотр изменений нормализации

# Генерация
npm run story:generate        # Генерация Stories

# QA
npm run check:pr-size         # Проверка размера PR
npm run check:lanes            # Проверка lanes policy
```

## Интеграция

### Explorer

Stories интегрированы в Explorer:
- Лента Stories: https://utemix-lab.github.io/vovaipetrova-core/#stories-panel
- Поле `collection: "stories"` в front matter
- Поле `story_order` из slug для сортировки

### GitHub

- Эпизоды хранятся в `docs/stories/`
- Формат имени: `XXX-краткое-описание.md`
- Статусы: `draft`, `review`, `ready`
- PR с меткой `content/story` или `auto:story`

## Связанные документы

- [CONCEPT.md](CONCEPT.md) — концепция Stories
- [stories-shared-context.md](stories-shared-context.md) — общий контекст
- [OPUS4_ROLE.md](OPUS4_ROLE.md) — роль агента
- [Single Source Playbook — «священный документ» (Notion↔Repo)](../single-source-playbook.md) — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов
- [Шаблон story.md](../../templates/story.md)
- [README проекта](../../README.md)

