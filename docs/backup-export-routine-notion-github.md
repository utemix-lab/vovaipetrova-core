---
title: Backup/Export рутина — Notion → GitHub + sanity-check
slug: backup-export-routine-notion-github
summary: >-
  Чек-лист и процедура регулярного экспорта Notion в GitHub с базовыми
  проверками целостности
tags:
  - Документация
  - Процесс
  - Backup
  - XX
machine_tags:
  - action/backup
  - action/build
  - action/export
  - product/kb
status: ready
---

# Backup/Export рутина — Notion → GitHub + sanity-check

## Цель

Формализовать регулярный экспорт Notion в GitHub с базовыми проверками целостности для обеспечения воспроизводимости и надёжности процесса.

## Процедура экспорта

### Шаг 1: Экспорт из Notion

1. Открыть Notion workspace
2. Выбрать страницы для экспорта (или весь workspace)
3. Экспорт:
   - **Format**: `Markdown & CSV`
   - **Include subpages**: ✅ включено
   - Сохранить ZIP файл локально

**Важно:**
- Экспортируйте все ключевые узлы (Think Tank, Briefs, документация)
- Проверьте, что экспорт включает подстраницы
- Сохраните ZIP с понятным именем (например, `notion_export_YYYY-MM-DD.zip`)

### Шаг 2: Подготовка к импорту

1. Скопировать ZIP файл в `uploads/` директорию репозитория:
   ```bash
   cp ~/Downloads/notion_export_YYYY-MM-DD.zip uploads/notion_export.zip
   ```

2. Убедиться, что директория `uploads/` существует:
   ```bash
   mkdir -p uploads
   ```

### Шаг 3: Запуск импорта через GitHub Actions

**Вариант A: Через GitHub Actions UI (рекомендуется)**

1. Открыть https://github.com/utemix-lab/vovaipetrova-core/actions
2. Выбрать workflow "Notion Import (Safe PR)"
3. Нажать "Run workflow"
4. Заполнить параметры:
   - **zip_path**: `uploads/notion_export.zip` (или путь к вашему ZIP)
   - **branch_suffix**: `YYYY-MM-DD` или `manual` (для ручного запуска)
5. Нажать "Run workflow"

**Вариант B: Через локальный Git push**

1. Распаковать ZIP вручную:
   ```bash
   npm run unpack:notion
   ```

2. Скопировать файлы в `docs/`:
   ```bash
   # После распаковки файлы будут в uploads/notion_export/
   cp -r uploads/notion_export/* docs/
   ```

3. Создать ветку и запушить:
   ```bash
   git checkout -b notion-sync/YYYY-MM-DD
   git add docs/
   git commit -m "chore: import from Notion export"
   git push origin notion-sync/YYYY-MM-DD
   ```

4. Workflow автоматически запустится при push в `notion-sync/**`

### Шаг 4: Sanity-check проверки

После импорта выполнить sanity-check:

```bash
npm run sanity:check
```

**Проверки включают:**
- ✅ Наличие ключевых узлов (Think Tank, Briefs, документация)
- ✅ Валидный front matter во всех файлах
- ✅ Обновлённые индексы (`docs/nav/routes.yml`, `docs/nav/tags.yaml`)
- ✅ Отсутствие критических ошибок линтинга
- ✅ Целостность ссылок (нет broken internal links)

**Если sanity-check не проходит:**
- Проверить логи ошибок
- Исправить проблемы вручную
- Повторить проверку

### Шаг 5: Проверка PR

1. Дождаться завершения workflow "Notion Import (Safe PR)"
2. Проверить созданный PR:
   - ✅ Все проверки CI зелёные
   - ✅ Sanity-check прошёл успешно
   - ✅ Нет критических ошибок
   - ✅ Import diff корректен

3. Если всё в порядке — мержить PR в `main`

## Sanity-check проверки

### 1. Наличие ключевых узлов

Проверка наличия критически важных файлов:

- ✅ `docs/think-tank-kompaktnoe-yadro.md` — компактное ядро
- ✅ `docs/adr-source-of-truth-mirroring.md` — ADR о зеркалировании
- ✅ `docs/SINGLE-SOURCE-PLAYBOOK.md` — единый источник истины для синхронизации между Notion и GitHub
- ✅ `docs/nav/routes.yml` — карта маршрутов
- ✅ `docs/nav/tags.yaml` — маппинг тегов

**Проверка:**
```bash
npm run sanity:check -- --check-key-nodes
```

### 2. Валидный front matter

Проверка, что все `.md` файлы имеют корректный front matter:

- ✅ `title` присутствует и не пустой
- ✅ `slug` присутствует и соответствует имени файла
- ✅ `summary` присутствует (может быть пустым для draft)
- ✅ `status` присутствует (`draft`, `review`, или `ready`)
- ✅ `notion_page_id` присутствует (для файлов из Notion)
- ✅ `last_edited_time` присутствует (для файлов из Notion)

**Проверка:**
```bash
npm run lint:docs
```

### 3. Обновлённые индексы

Проверка актуальности индексов:

- ✅ `docs/nav/routes.yml` содержит все не-служебные страницы
- ✅ `docs/nav/tags.yaml` содержит актуальные теги
- ✅ Нет orphan страниц (или они помечены как `service: true`)

**Проверка:**
```bash
npm run routes:check
npm run normalize  # Обновит индексы при необходимости
```

### 4. Целостность ссылок

Проверка отсутствия broken links:

- ✅ `internal-missing = 0` (нет битых внутренних ссылок)
- ✅ Все ссылки разрешаются корректно
- ✅ `link-map.json` актуален

**Проверка:**
```bash
npm run diagnostics:check-regression
npm run diagnostics:snapshot  # Обновит broken-links.json
```

### 5. Линтинг без критических ошибок

Проверка качества контента:

- ✅ Нет критических ошибок линтинга
- ✅ Предупреждения допустимы (не блокируют импорт)
- ✅ Нет PII в контенте

**Проверка:**
```bash
npm run lint:docs
npm run guardrails:v2  # Дополнительные проверки безопасности
```

## Скрипт sanity-check

Создан скрипт `scripts/sanity-check.mjs` для автоматизации проверок:

```bash
npm run sanity:check
```

**Что проверяет:**
1. Наличие ключевых узлов
2. Валидность front matter
3. Актуальность индексов
4. Целостность ссылок
5. Отсутствие критических ошибок линтинга

**Выход:**
- ✅ Все проверки пройдены — экспорт готов к мержу
- ⚠️ Есть предупреждения — можно мержить, но стоит исправить
- ❌ Есть ошибки — нужно исправить перед мержем

## Отметка в ops-log/State snapshot

После успешного экспорта и мержа:

1. Обновить `docs/state-snapshot-current-state.md` (если существует):
   - Дата последнего экспорта
   - Количество файлов
   - Статус sanity-check

2. Или создать запись в ops-log (если используется):
   ```markdown
   ## 2025-11-20 — Notion Export

   - Экспорт выполнен успешно
   - Sanity-check: ✅ пройден
   - Файлов импортировано: N
   - PR: #XX
   ```

## Troubleshooting

### Проблема: ZIP не распаковывается

**Решение:**
- Проверить формат ZIP (должен быть стандартный ZIP, не двойной архив)
- Попробовать распаковать вручную и проверить структуру
- Убедиться, что используется правильный скрипт `unpack:notion`

### Проблема: Sanity-check не проходит

**Решение:**
1. Проверить логи ошибок
2. Исправить проблемы вручную:
   - Добавить недостающие файлы
   - Исправить front matter
   - Обновить индексы
3. Повторить проверку

### Проблема: Ключевые узлы отсутствуют

**Решение:**
- Проверить, что экспорт из Notion включает все нужные страницы
- Убедиться, что файлы не были случайно удалены
- Проверить `docs/.import-map.yaml` на наличие deny_paths

### Проблема: Broken links после импорта

**Решение:**
1. Запустить `npm run fix:links` для автоматического исправления
2. Проверить `prototype/link-map.json` и добавить недостающие маппинги
3. Запустить `npm run diagnostics:snapshot` для обновления статистики

## Время выполнения

- **Экспорт из Notion**: 2-5 минут (зависит от размера workspace)
- **Подготовка ZIP**: 1-2 минуты
- **Импорт через GitHub Actions**: 5-10 минут
- **Sanity-check**: 1-2 минуты
- **Проверка PR**: 2-3 минуты
- **Общее время**: 15-25 минут

## Автоматизация (будущее)

**Планируется:**
- Автоматический экспорт из Notion по расписанию (через n8n/Make/Zapier)
- Автоматический запуск импорта при появлении нового ZIP
- Автоматический sanity-check в CI
- Уведомления о статусе экспорта

## Связанные документы

- **[Single Source Playbook — «священный документ» (Notion↔Repo)](SINGLE-SOURCE-PLAYBOOK.md)** — единый источник истины для синхронизации между Notion и GitHub
- [CONTRIBUTING.md](../CONTRIBUTING.md) — базовый цикл Notion → GitHub
- [Single Source Playbook — «священный документ» (Notion↔Repo)](SINGLE-SOURCE-PLAYBOOK.md) — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов
- [Экспорт в GitHub — руководство и шаблоны](./eksport-v-github-rukovodstvo-i-shablony.md) — детальное руководство
- [GitHub Actions workflow](../.github/workflows/notion-import.yml) — конфигурация импорта

## Чек-лист быстрого экспорта

**Минимальный набор для быстрого экспорта (< 20 минут):**

- [ ] Экспорт из Notion (Markdown & CSV, include subpages)
- [ ] ZIP скопирован в `uploads/notion_export.zip`
- [ ] Запущен workflow "Notion Import (Safe PR)" через GitHub Actions
- [ ] Sanity-check выполнен (`npm run sanity:check`)
- [ ] PR проверен и готов к мержу

**Полный чек-лист:** см. разделы выше.

