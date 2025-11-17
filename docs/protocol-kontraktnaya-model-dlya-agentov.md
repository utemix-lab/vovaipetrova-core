---
title: Protocol — Контрактная модель для агентов
slug: protocol-kontraktnaya-model-dlya-agentov
summary: '# Protocol — Контрактная модель для агентов'
tags: []
machine_tags: []
---
# Protocol — Контрактная модель для агентов

Контрактная модель определяет правила взаимодействия агентов с репозиторием, входные/выходные данные, запреты и QA-ворота.

## Вход агента

### Источник задачи
- **Notion Briefs**: карточка в статусе `Ready` с полями `Brief`, `Scope`, `Deliverables`
- **GitHub Issues**: опционально, для трекинга и связи с PR

### Контекст проекта
- `/.codegpt/context.md` — общий контекст (источник истины, ветви, линтеры, CI, lanes)
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — этот документ (правила работы)
- `CONTRIBUTING.md` — процесс работы с репозиторием
- `README.md` — структура и команды

## Выход агента

### Обязательные артефакты
1. **Ветка**: `{type}/{short-description}` (например, `chore/stories-pause-note`)
2. **Коммиты**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
3. **Pull Request**: с описанием изменений, ссылкой на задачу в Briefs и секцией Deliverables
4. **Deliverables**: соответствие списку из Briefs, оформленное по стандартному шаблону

### Формат Deliverables в PR

Каждый PR должен содержать секцию `## Deliverables` со следующей структурой:

```markdown
## Deliverables

**Executor**: {Имя агента или исполнителя}  
**Status**: ✅ Completed | ⏳ In Progress | ❌ Blocked  
**Task**: {Ссылка на задачу в Notion Briefs или Issue}

### Completed
- [x] {Пункт 1 из списка Deliverables}
- [x] {Пункт 2 из списка Deliverables}

### Changes
- {Описание изменений 1}
- {Описание изменений 2}

### Files Changed
- `path/to/file1.md` — {описание изменений}
- `path/to/file2.js` — {описание изменений}

### PRs Created
- #{номер} — {название PR} (если создавались связанные PR)

### Metrics
- {Метрика 1, если применимо}
- {Метрика 2, если применимо}

### Problems Encountered
- {Проблема 1, если была}
- {Проблема 2, если была}

### Proposals
- {Предложение по улучшению, если есть}
```

**Обязательные поля**: Executor, Status, Task, Completed  
**Опциональные поля**: Changes, Files Changed, PRs Created, Metrics, Problems Encountered, Proposals

### Формат коммитов
```
{type}: {краткое описание}

- Деталь 1
- Деталь 2
- Деталь 3
```

Типы: `feat`, `fix`, `chore`, `docs`, `refactor`

## Запреты

### Структурные запреты
- ❌ Не менять файлы в `scripts/`, `.github/workflows/` без явного указания в Briefs
- ❌ Не создавать файлы вне `docs/`, `prototype/`, `templates/` без согласования
- ❌ Не удалять файлы с `notion_page_id` без `git mv` (см. `check-import-safety.mjs`)

### Процессные запреты
- ❌ Не мерджить PR без зелёного CI (`Docs CI` должен быть успешным)
- ❌ Не создавать несколько PR из одной ветки (см. Lanes policy)
- ❌ Не коммитить напрямую в `main` (только через PR)

### Контентные запреты
- ❌ Не добавлять PII (пути пользователей, имена, email, телефоны) — см. `scripts/pii-scan.mjs`
- ❌ Не использовать первое лицо в Stories (`я`, `мы` разрешены, но не личные имена)
- ❌ Не создавать файлы без front matter (title, slug, summary)

## QA-ворота

### Перед созданием PR
1. ✅ Запустить `npm run normalize:dry` — проверить изменения
2. ✅ Запустить `npm run lint:docs` — проверить качество контента
3. ✅ Проверить соответствие Deliverables из Briefs
4. ✅ Убедиться, что ветка соответствует Lanes policy (один PR на lane)

### В PR
1. ✅ Описание изменений соответствует Brief
2. ✅ Ссылка на задачу в Notion Briefs (если есть)
3. ✅ CI зелёный (`Docs CI` должен пройти)

### После мерджа
1. ✅ Обновить статус задачи в Notion Briefs (если доступен API)
2. ✅ Удалить ветку (если не `notion-sync/*`)

## Lanes Policy

**Один PR на lane** — правило предотвращает конфликты и упрощает ревью.

### Lanes (типы веток)
- `chore/*` — инфраструктура, документация, процессы
- `feat/*` — новые возможности, разделы
- `fix/*` — исправления, багфиксы
- `docs/*` — текстовые правки без изменения логики
- `refactor/*` — структурные изменения без фич
- `notion-sync/*` — импорт из Notion (автоматика)

### Правила
- Одна ветка = один PR = одна задача из Briefs
- Если нужно сделать несколько связанных изменений — объединить в одну задачу или создать последовательные PR
- После мерджа PR ветку можно удалить (кроме `notion-sync/*`)

## Процесс работы агента

1. **Чтение задачи**: получить Brief из Notion или Issue
2. **Подготовка**: прочитать контекст (`/.codegpt/context.md`, `docs/protocol-kontraktnaya-model-dlya-agentov.md`)
3. **Выполнение**: создать ветку, внести изменения, проверить локально
4. **Проверка**: `normalize:dry`, `lint:docs`, соответствие Deliverables
5. **PR**: создать Pull Request с описанием
6. **Ожидание**: дождаться зелёного CI
7. **Мердж**: после одобрения смерджить PR
8. **Завершение**: обновить статус в Briefs, удалить ветку

## Связано с

- `CONTRIBUTING.md` — процесс работы с репозиторием
- `/.codegpt/context.md` — контекст проекта
- `docs/rfcs/rfc-xxxx-nazvanie-rfc.md` — шаблон для RFC (для крупных изменений)

