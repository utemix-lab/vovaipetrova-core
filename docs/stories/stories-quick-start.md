---
title: Stories — Быстрый старт
slug: stories-quick-start
summary: Быстрый старт для работы со Stories эпизодами
tags:
  - Story
machine_tags:
  - content/story
status: ready
---

# Stories — Быстрый старт

## Что создано

В папке `docs/stories/` созданы следующие файлы для работы со Stories:

1. **CONCEPT.md** — концепция и принципы Stories
2. **SHARED_CONTEXT.md** — общий контекст проекта для работы
3. **OPUS4_ROLE.md** — роль и инструкции для агента OPUS4
4. **README.md** — инструкции для работы
5. **GITHUB_INSTRUCTIONS.md** — инструкции для GitHub и агентов

## Для Copilot и других агентов

### Шаг 1: Прочитайте контекст

Начните с чтения этих файлов в указанном порядке:

1. `CONCEPT.md` — понимание концепции Stories
2. `SHARED_CONTEXT.md` — общий контекст проекта
3. `OPUS4_ROLE.md` — роль и инструкции для работы

### Шаг 2: Используйте шаблон

Используйте шаблон `templates/story.md` для создания новых эпизодов.

### Шаг 3: Создайте эпизод

Следуйте структуре:
- TL;DR (3–5 пунктов)
- Что произошло
- Зачем это делали
- Что получилось
- Тех-вставка (2–3 предложения)
- Что дальше

### Шаг 4: Проверьте перед PR

```bash
npm run pii:scan          # Обязательно для Stories
npm run lint:docs
npm run normalize:dry
npm run check:pr-size
npm run check:lanes
```

## Для людей

1. Откройте `templates/story.md`
2. Скопируйте шаблон
3. Заполните структуру эпизода
4. Сохраните в `docs/stories/` с именем `XXX-краткое-описание.md`
5. Запустите проверки и создайте PR

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

## Safety Rails

### Запрещено

- ❌ Использовать первое лицо с именами реальных людей
- ❌ Указывать пути пользователей (`C:\Users\...`)
- ❌ Указывать email, телефоны, адреса реальных людей

### Разрешено

- ✅ Использовать анонимные плейсхолдеры: `[Имя]`, `[Email]`
- ✅ Использовать вымышленные данные для примеров
- ✅ Писать от нейтрального автора

## Команды

```bash
# Проверки
npm run pii:scan              # Проверка PII (обязательно для Stories)
npm run lint:docs             # Проверка линтинга
npm run normalize:dry         # Просмотр изменений нормализации

# Генерация
npm run story:generate         # Генерация Stories
```

## Связанные документы

- [CONCEPT.md](CONCEPT.md) — концепция Stories
- [SHARED_CONTEXT.md](SHARED_CONTEXT.md) — общий контекст
- [OPUS4_ROLE.md](OPUS4_ROLE.md) — роль агента
- [GITHUB_INSTRUCTIONS.md](GITHUB_INSTRUCTIONS.md) — инструкции для GitHub
- [README.md](README.md) — полная документация

