---
title: Stories — Инструкции для GitHub и агентов
slug: stories-github-instructions
summary: Инструкции для работы со Stories на GitHub и для AI-агентов
tags:
  - Story
  - Автоматизация
machine_tags:
  - content/story
  - theme/automation
status: ready
---

# Stories — Инструкции для GitHub и агентов

## Для AI-агентов (Copilot, CodeGPT, Cursor)

### Быстрый старт

1. **Прочитайте контекст**:
   - `docs/stories/CONCEPT.md` — концепция Stories
   - `docs/stories/SHARED_CONTEXT.md` — общий контекст проекта
   - `docs/stories/OPUS4_ROLE.md` — роль и инструкции для агента

2. **Используйте шаблон**: `templates/story.md`

3. **Создайте эпизод** по структуре:
   - TL;DR (3–5 пунктов)
   - Что произошло
   - Зачем это делали
   - Что получилось
   - Тех-вставка (2–3 предложения)
   - Что дальше

4. **Проверьте перед PR**:
   ```bash
   npm run pii:scan          # Обязательно для Stories
   npm run lint:docs
   npm run normalize:dry
   npm run check:pr-size
   npm run check:lanes
   ```

### Формат работы

#### Создание нового эпизода

1. **Чтение контекста**:
   - Изучить `CONCEPT.md` для понимания концепции
   - Изучить `SHARED_CONTEXT.md` для общего контекста
   - Прочитать существующие эпизоды для понимания стиля

2. **Сбор информации**:
   - Прочитать `CHANGELOG.md` для фактов
   - Изучить ADR (`docs/adr-*.md`) для архитектурных решений
   - Проверить Briefs (Notion) для задач и результатов
   - Посмотреть `prototype/data/stats.json` для метрик

3. **Создание эпизода**:
   - Использовать шаблон `templates/story.md`
   - Заполнить структуру: TL;DR, что произошло, зачем, что получилось, тех-вставка, что дальше
   - Проверить объём (700–1200 знаков)
   - Установить статус `draft`

4. **Проверки**:
   ```bash
   npm run pii:scan          # Проверка PII (обязательно)
   npm run lint:docs         # Проверка линтинга
   npm run normalize:dry     # Проверка нормализации
   ```

5. **Создание PR**:
   - Ветка: `chore/stories-{описание}` или `feat/stories-{описание}`
   - Коммит: `docs: story {номер}-{описание}`
   - PR с меткой `content/story`
   - Секция Deliverables в описании PR

#### Формат PR

```markdown
## Deliverables

**Executor**: {Имя агента}  
**Status**: ✅ Completed  
**Task**: {Ссылка на задачу в Notion Briefs или Issue}

### Completed
- [x] Создан эпизод Stories по шаблону
- [x] Проверка PII пройдена
- [x] Проверка линтинга пройдена
- [x] Соответствие формату (700–1200 знаков)

### Changes
- Создан файл `docs/stories/XXX-{описание}.md`
- Добавлен front matter с правильными тегами
- Заполнена структура эпизода

### Files Changed
- `docs/stories/XXX-{описание}.md` — новый эпизод Stories
```

## Для людей (разработчиков)

### Создание эпизода вручную

1. **Откройте шаблон**: `templates/story.md`

2. **Скопируйте структуру** и заполните:
   ```yaml
   ---
   title: "Название эпизода"
   slug: "XXX-краткое-описание"
   summary: "Краткая аннотация (1–2 предложения)"
   tags: [Story]
   machine_tags: [content/story]
   status: draft
   last_edited_time: null
   ---
   ```

3. **Заполните структуру**:
   - TL;DR (3–5 пунктов)
   - Что произошло
   - Зачем это делали
   - Что получилось
   - Тех-вставка (2–3 предложения)
   - Что дальше

4. **Сохраните** в `docs/stories/` с именем `XXX-краткое-описание.md`

5. **Проверьте**:
   ```bash
   npm run pii:scan          # Обязательно для Stories
   npm run lint:docs
   npm run normalize:dry
   ```

6. **Создайте PR** с меткой `content/story`

### Редактирование существующего эпизода

1. Откройте файл в `docs/stories/`
2. Внесите изменения с сохранением структуры
3. Проверьте формат и объём
4. Запустите проверки
5. Создайте PR с описанием изменений

## Правила работы

### Safety Rails

**Запрещено**:
- ❌ Использовать первое лицо с именами реальных людей
- ❌ Указывать пути пользователей (`C:\Users\...`)
- ❌ Указывать email, телефоны, адреса реальных людей
- ❌ Создавать файлы без front matter
- ❌ Менять slug существующих файлов без миграции

**Разрешено**:
- ✅ Использовать анонимные плейсхолдеры: `[Имя]`, `[Email]`
- ✅ Использовать вымышленные данные для примеров
- ✅ Писать от нейтрального автора
- ✅ Фиксировать факты и решения

### QA-ворота

Перед созданием PR:

1. ✅ Проверка формата (700–1200 знаков)
2. ✅ Проверка структуры (TL;DR, что произошло, зачем, что получилось, тех-вставка, что дальше)
3. ✅ Проверка PII (`npm run pii:scan`) — **обязательно**
4. ✅ Проверка линтинга (`npm run lint:docs`)
5. ✅ Проверка нормализации (`npm run normalize:dry`)
6. ✅ Проверка размера PR (`npm run check:pr-size`)
7. ✅ Проверка lanes policy (`npm run check:lanes`)

## Автоматическая генерация

Генератор `scripts/generate-stories.mjs` создаёт эпизоды автоматически:

- Запускается ежедневно через workflow `.github/workflows/stories.yml`
- Читает CHANGELOG.md, ADR, stats.json и Briefs
- Извлекает факты и события
- Создаёт эпизод по шаблону
- Создаёт PR с меткой `auto:story`

### Формат автоматически созданных эпизодов

- Имя файла: `YYYY-MM-DD-{slug}.md`
- Статус: `draft`
- Заголовок PR: `chore: story auto-YYYY-MM-DD (draft)`
- Метка: `auto:story`

## Интеграция

### Explorer

Stories интегрированы в Explorer:
- Лента Stories: https://utemix-lab.github.io/vovaipetrova-core/#stories-panel
- Поле `collection: "stories"` в front matter
- Поле `story_order` из slug для сортировки
- Фильтрация через функцию `isStoryPage()`

### GitHub

- Эпизоды хранятся в `docs/stories/`
- Формат имени: `XXX-краткое-описание.md`
- Статусы: `draft`, `review`, `ready`
- PR с меткой `content/story` или `auto:story`

## Команды

```bash
# Проверки
npm run pii:scan              # Проверка PII (обязательно для Stories)
npm run lint:docs             # Проверка линтинга
npm run normalize:dry         # Просмотр изменений нормализации

# Генерация
npm run story:generate         # Генерация Stories

# QA
npm run check:pr-size         # Проверка размера PR
npm run check:lanes            # Проверка lanes policy
```

## Примеры

### Пример создания эпизода

```markdown
---
title: "Stories: новый эпизод"
slug: "021-stories-novyj-epizod"
summary: "Создание нового эпизода Stories для фиксации ключевого события проекта"
tags: [Story]
machine_tags: [content/story]
status: draft
last_edited_time: null
---

# Stories: новый эпизод

TL;DR

- Создан новый эпизод Stories для фиксации ключевого события
- Эпизод следует структуре: что произошло → зачем → что получилось → тех-вставка → что дальше
- Эпизод готов к ревью после проверки PII и линтинга

**Что произошло.** После анализа развития проекта было решено зафиксировать ключевое событие в формате Stories. Создан новый эпизод с описанием события, его мотивации и результатов.

**Зачем это делали.** Нужно было сохранить контекст решения для будущих участников проекта. Stories позволяют быстро понять историю проекта и причины тех или иных решений.

**Что получилось.** Создан эпизод Stories, который фиксирует событие, его мотивацию и результаты. Эпизод следует единому формату и готов к интеграции в Explorer.

**Тех-вставка.** Эпизод создан по шаблону `templates/story.md` с front matter и структурой. Файл сохранён в `docs/stories/021-stories-novyj-epizod.md` со статусом `draft`.

**Что дальше.** После проверки PII и линтинга эпизод будет переведён в статус `review` и создан PR для ревью.
```

## Связанные документы

- [CONCEPT.md](CONCEPT.md) — концепция Stories
- [SHARED_CONTEXT.md](SHARED_CONTEXT.md) — общий контекст
- [OPUS4_ROLE.md](OPUS4_ROLE.md) — роль агента
- [README.md](README.md) — быстрый старт
- [Protocol — Контрактная модель для агентов](../protocol-kontraktnaya-model-dlya-agentov.md)
- [Шаблон story.md](../../templates/story.md)

