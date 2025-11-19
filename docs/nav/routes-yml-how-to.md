---
title: Как работать с routes.yml
slug: routes-yml-how-to
summary: >-
  Краткая инструкция по добавлению разделов и страниц в routes.yml для
  отображения в Explorer
tags:
  - Документация
  - Навигация
machine_tags:
  - action/build
  - product/kb
  - product/site
  - theme/ux
status: ready
---

# Как работать с routes.yml

## TL;DR

`docs/nav/routes.yml` — это карта маршрутов сайта, которая определяет структуру навигации и отображение страниц в Explorer. При изменении routes.yml нужно обновить `routes.json` и проверить отображение в Explorer.

## Структура файла

```yaml
version: 1
updated: 2025-11-15
routes:
  - path: /section-name
    title: Название раздела
    description: Описание раздела
    entries:
      - slug: page-slug
        doc: docs/path/to/page.md
        status: ok | missing
        notes: Краткое описание страницы
```

## Как добавить новый раздел

1. Откройте `docs/nav/routes.yml`
2. Добавьте новый раздел в массив `routes`:

```yaml
routes:
  - path: /new-section
    title: Новый раздел
    description: Описание нового раздела
    entries: []
```

3. Обновите `routes.json`:
   ```bash
   npm run routes:check  # Проверка консистентности
   # или вручную:
   node scripts/generate-routes-json.mjs
   ```

4. Проверьте отображение в Explorer: https://utemix-lab.github.io/vovaipetrova-core/

## Как добавить страницу в раздел

1. Найдите нужный раздел в `routes.yml` (по `path`)
2. Добавьте запись в массив `entries`:

```yaml
entries:
  - slug: page-slug
    doc: docs/path/to/page.md
    status: ok
    notes: Краткое описание страницы
```

**Важно:**
- `slug` должен соответствовать `slug` из front matter страницы
- `doc` — относительный путь от корня репозитория
- `status`: `ok` — файл существует, `missing` — файл отсутствует
- `notes` — краткое описание для навигации

## Примеры

### Пример 1: Добавление страницы в существующий раздел

```yaml
- path: /kb
  title: Knowledge Base
  description: контентная модель, фасеты, правила импорта
  entries:
    - slug: new-article
      doc: docs/new-article.md
      status: ok
      notes: Новая статья о работе с контентом
```

### Пример 2: Создание нового раздела

```yaml
- path: /blog
  title: Блог
  description: Статьи и новости проекта
  entries:
    - slug: first-post
      doc: docs/blog/first-post.md
      status: ok
      notes: Первая запись в блоге
```

## Обновление routes.json

После изменения `routes.yml` нужно обновить `prototype/data/routes.json`:

**Автоматически:**
- При merge в `main` автоматически генерируется через `diagnostics-snapshot.yml`
- При создании PR генерируется в CI (неблокирующая проверка)

**Вручную:**
```bash
node scripts/generate-routes-json.mjs
```

## Проверка консистентности

Используйте скрипт проверки для поиска страниц без маршрутов (orphan pages):

```bash
npm run routes:check
```

Скрипт:
- Находит страницы в `docs/`, которые не упомянуты в `routes.yml`
- Исключает страницы с `service: true`
- Генерирует `prototype/data/orphans.json`
- Отображает список "сирот" в Explorer на вкладке "Orphans"

**Подробнее:** см. [orphans-how-to.md](./orphans-how-to.md) — инструкция по работе с orphan страницами.

## Отображение в Explorer

После обновления `routes.json`:

1. Страницы отображаются в Explorer с сортировкой "By route"
2. Порядок отображения соответствует порядку в `routes.yml`
3. Страницы без маршрутов попадают в Orphans view
4. Статус `missing` отображается в карточках страниц

## Связанные файлы

- `docs/nav/routes.yml` — исходный файл с маршрутами
- `prototype/data/routes.json` — сгенерированный JSON для Explorer
- `scripts/generate-routes-json.mjs` — скрипт генерации routes.json
- `scripts/check-routes-consistency.mjs` — проверка консистентности
- `prototype/data/orphans.json` — список страниц без маршрутов

## Частые вопросы

**Q: Что делать, если страница не отображается в Explorer?**  
A: Проверьте, что страница добавлена в `routes.yml` и `routes.json` обновлён. Также убедитесь, что у страницы нет `service: true` в front matter.

**Q: Можно ли добавить страницу без обновления routes.yml?**  
A: Да, но она не будет отображаться в навигации и попадёт в Orphans view. Рекомендуется добавлять все публичные страницы в routes.yml.

**Q: Как удалить раздел или страницу?**  
A: Удалите соответствующую запись из `routes.yml` и обновите `routes.json`. Страница останется в `docs/`, но перестанет отображаться в навигации.

**Q: Что означает статус `missing`?**  
A: Статус `missing` означает, что файл, указанный в `doc`, отсутствует. Это помогает отслеживать планируемые, но ещё не созданные страницы.

