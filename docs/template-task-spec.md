---
title: "TEMPLATE — Task spec"
slug: template-task-spec
summary: >-
  Шаблон постановки технической задачи с путями правок, требованиями и
  чек-листом приёмки.
tags: []
machine_tags: []
status: review
service: true
---
# TEMPLATE — Task spec (для Composer)

**Версия**: 1.0  
**Для**: Composer (Cursor AI Agent)  
**Дата**: 2025-11-20

---

## Обязательные поля

### Что нужно сделать (результат)

**Краткое описание**: 1–2 предложения о желаемом выходе.  
**Пример**: «Добавить страницу услуги X по шаблону, связать с фасетами и включить в индексы».

### Где менять

**Разрешённые пути**:
- `docs/**` — документация и контент
- `prototype/**` — UI прототип (HTML, CSS, JS)
- `.github/workflows/**` — CI/CD workflows (только если явно указано в Brief)
- `scripts/**` — утилиты и скрипты (только если явно указано в Brief)

**Запрещённые пути** (safety rails):
- ❌ `notion-brain/**` — источник истины, не менять
- ❌ `package.json`, `package-lock.json` — зависимости (только если явно указано)
- ❌ `README.md`, `.gitignore` — корневые файлы (только если явно указано)
- ❌ `.env`, `.env.*` — секреты и конфигурация окружения
- ❌ `node_modules/`, `vendor/` — зависимости
- ❌ Файлы с `notion_page_id` без явного указания в Brief

### Требования

**Front matter** (обязательно для всех `.md` файлов):
- `title` — заголовок страницы
- `slug` — kebab-case идентификатор (стабильный маршрут)
- `summary` — краткое описание (до 240 символов)
- `tags` — видимые теги (TitleCase_с_подчёркиваниями, 1–5 штук)
- `machine_tags` — скрытые фасеты (`theme/*`, `action/*`, `product/*`, `tool/*`, `role/*`)
- `status` — `draft` | `review` | `ready` (опционально)

**Стиль и формат**:
- Слоги: kebab-case, стабильные маршруты (не менять без миграции)
- Ссылки: относительные (`/kb/...`) или WikiLinks (`[[название]]`)
- Кодировка: UTF-8, без BOM
- Проверка `normalize.mjs` проходит без диффов

### Safety Rails

**Запрещённые действия**:
- ❌ Добавление PII (пути пользователей, имена, email, телефоны) — проверка через `npm run pii:scan`
- ❌ Использование первое лицо в Stories (`я`, `мы` разрешены, но не личные имена)
- ❌ Создание файлов без front matter
- ❌ Изменение файлов вне разрешённых путей без явного указания в Brief
- ❌ Удаление файлов с `notion_page_id` без `git mv` (см. `check-import-safety.mjs`)

**Проверки перед PR**:
1. ✅ `npm run normalize:dry` — проверить изменения нормализации
2. ✅ `npm run lint:docs` — проверить качество контента
3. ✅ `npm run check:pr-size` — проверить размер PR
4. ✅ `npm run check:lanes` — проверить соответствие Lanes policy
5. ✅ `npm run pii:scan` — проверить отсутствие PII (для Stories обязательно)

### Чек‑лист приёмки

- [ ]  Файл(ы) созданы/обновлены в нужных путях
- [ ]  Front matter присутствует и корректен
- [ ]  Локально прошёл `normalize` без диффов
- [ ]  Нет «кракозябр», slug корректный
- [ ]  Добавлены ссылки в оглавления/индексы при необходимости
- [ ]  PR содержит предпросмотр (Pages/Vercel/Netlify)
- [ ]  CI зелёный (`Docs CI` должен пройти)
- [ ]  Deliverables соответствуют Brief

### Ссылки на контекст

- **ADR**: {ссылка на архитектурное решение, если применимо}
- **Spec**: {ссылка на спецификацию, если применимо}
- **PROTOCOL**: `docs/protocol-kontraktnaya-model-dlya-agentov.md`
- **Примеры**: {ссылки на похожие задачи или «до/после»}

---

## Примеры готовых спецификаций

Для типовых задач созданы примеры спецификаций:

1. **Документация**: [`template-task-spec-example-1-docs.md`](template-task-spec-example-1-docs.md)
   - Добавление новой страницы документации
   - Работа с `docs/` и навигацией

2. **Скрипты**: [`template-task-spec-example-2-scripts.md`](template-task-spec-example-2-scripts.md)
   - Создание нового скрипта утилиты
   - Работа с `scripts/` и `package.json`

3. **Прототип UI**: [`template-task-spec-example-3-prototype.md`](template-task-spec-example-3-prototype.md)
   - Улучшение UI прототипа
   - Работа с `prototype/` (HTML, CSS, JS)
