---
title: 'TEMPLATE — Task spec Example 1: Документация'
slug: template-task-spec-example-1-docs
summary: Пример спецификации задачи для добавления новой страницы документации
tags: []
machine_tags: []
status: review
service: true
---

# TEMPLATE — Task spec Example 1: Документация

**Тип задачи**: Добавление новой страницы документации
**Для**: Composer (Cursor AI Agent)
**Дата**: 2025-11-20

---

## Обязательные поля

### Что нужно сделать (результат)

**Краткое описание**: Добавить страницу "Руководство по работе с тегами" в раздел `docs/nav/`, связать с существующими страницами про таксономию и включить в навигацию.

### Где менять

**Разрешённые пути**:
- `docs/nav/tags-guide.md` — новая страница документации
- `docs/nav/routes.yml` — добавить ссылку в навигацию

**Запрещённые пути** (safety rails):
- ❌ `docs/nav/tags.yaml` — конфигурация тегов, не менять без явного указания
- ❌ `scripts/**` — скрипты нормализации, не трогать

### Требования

**Front matter** (обязательно):
```yaml
---
title: Руководство по работе с тегами
slug: tags-guide
summary: Подробное руководство по использованию тегов и machine_tags в документации проекта
tags:
  - Документация
  - Теги
machine_tags:
  - action/build
  - product/kb
status: ready
---
```

**Стиль и формат**:
- Слоги: `tags-guide` (kebab-case)
- Ссылки: относительные на `taksonomiya-i-tegi.md`, `spec-front-matter-i-slugi.md`
- Структура: разделы "Что такое теги", "Как добавлять теги", "Примеры использования"
- Проверка `normalize.mjs` проходит без диффов

### Safety Rails

**Запрещённые действия**:
- ❌ Не добавлять PII (имена, email, пути)
- ❌ Не изменять существующие файлы без явного указания
- ❌ Не создавать файлы без front matter

**Проверки перед PR**:
1. ✅ `npm run normalize:dry` — проверить изменения
2. ✅ `npm run lint:docs` — проверить качество контента
3. ✅ `npm run check:pr-size` — проверить размер PR
4. ✅ `npm run check:lanes` — проверить lanes policy (должен быть `lane:docs`)

### Чек‑лист приёмки

- [x]  Файл `docs/nav/tags-guide.md` создан с корректным front matter
- [x]  Добавлена ссылка в `docs/nav/routes.yml` в раздел "Навигация"
- [x]  Локально прошёл `normalize` без диффов
- [x]  Нет «кракозябр», slug корректный (`tags-guide`)
- [x]  Добавлены ссылки на связанные страницы (`taksonomiya-i-tegi.md`, `spec-front-matter-i-slugi.md`)
- [x]  PR содержит предпросмотр (Pages)
- [x]  CI зелёный (`Docs CI` прошёл)
- [x]  Deliverables соответствуют Brief

### Ссылки на контекст

- **Spec**: `docs/spec-front-matter-i-slugi.md` — спецификация front matter
- **Spec**: `docs/taksonomiya-i-tegi.md` — таксономия и теги
- **PROTOCOL**: `docs/single-source-playbook.md` — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов
- **Примеры**: `docs/nav/routes-yml-how-to.md` — похожая документация

