---
title: 'TEMPLATE — Task spec Example 2: Скрипты'
slug: template-task-spec-example-2-scripts
summary: Пример спецификации задачи для создания нового скрипта утилиты
tags: []
machine_tags: []
status: review
service: true
---

# TEMPLATE — Task spec Example 2: Скрипты

**Тип задачи**: Создание нового скрипта утилиты
**Для**: Composer (Cursor AI Agent)
**Дата**: 2025-11-20

---

## Обязательные поля

### Что нужно сделать (результат)

**Краткое описание**: Создать скрипт `scripts/check-front-matter.mjs` для проверки наличия обязательных полей front matter во всех `.md` файлах в `docs/`.

### Где менять

**Разрешённые пути**:
- `scripts/check-front-matter.mjs` — новый скрипт (явно разрешено в Brief)
- `package.json` — добавить npm script `check:front-matter` (явно разрешено в Brief)

**Запрещённые пути** (safety rails):
- ❌ `scripts/normalize.mjs` — существующий скрипт, не менять
- ❌ `docs/**` — документация, не трогать (скрипт только читает)

### Требования

**Функциональность скрипта**:
- Читает все `.md` файлы в `docs/`
- Проверяет наличие обязательных полей: `title`, `slug`, `summary`
- Выводит список файлов с отсутствующими полями
- Возвращает код выхода 0 (успех) или 1 (ошибка)

**Формат вывода**:
- Успех: `✅ All files have required front matter fields`
- Ошибка: список файлов с проблемами, одна проблема на строку

**Интеграция**:
- Добавить в `package.json`: `"check:front-matter": "node scripts/check-front-matter.mjs"`
- Использовать в CI (опционально, не блокирует)

### Safety Rails

**Запрещённые действия**:
- ❌ Не изменять существующие скрипты без явного указания
- ❌ Не добавлять зависимости в `package.json` без согласования
- ❌ Не создавать файлы вне `scripts/` без явного указания

**Проверки перед PR**:
1. ✅ `npm run normalize:dry` — проверить изменения (если есть изменения в `docs/`)
2. ✅ `npm run lint:docs` — проверить качество (если есть изменения в `docs/`)
3. ✅ `npm run check:pr-size` — проверить размер PR
4. ✅ `npm run check:lanes` — проверить lanes policy (должен быть `lane:infra`)
5. ✅ Локально протестировать скрипт на нескольких файлах

### Чек‑лист приёмки

- [x]  Скрипт `scripts/check-front-matter.mjs` создан и работает
- [x]  Добавлен npm script в `package.json`
- [x]  Скрипт корректно обрабатывает файлы с front matter и без
- [x]  Скрипт возвращает правильные коды выхода (0/1)
- [x]  Добавлена документация в комментариях скрипта
- [x]  CI зелёный (`Docs CI` прошёл)
- [x]  Deliverables соответствуют Brief

### Ссылки на контекст

- **Spec**: `docs/spec-front-matter-i-slugi.md` — спецификация front matter
- **Примеры**: `scripts/check-import-safety.mjs` — похожий скрипт проверки
- **PROTOCOL**: `docs/single-source-playbook.md` — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов

