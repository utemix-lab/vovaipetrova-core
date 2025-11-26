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
- `docs/SINGLE-SOURCE-PLAYBOOK.md` — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов
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
- ❌ Указывать пути пользователей (например: `<user-path>`)
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
- `scripts/author-gateway.mjs` — `author-gateway` (PoC; modes: auto / hitl / human-first) to orchestrate generation and optionally forward a minimal report to Notion.
- `scripts/add-image-to-episode.mjs` — helper to update `author_image` or `machine_image` front matter for a story by file or slug (sets url, status, uploaded_by, uploaded_at).

These additions are intended to avoid duplicated work: the generator and Notion reporter handle minimal reporting, while the gateway and image helper support human workflows (HitL and manual illustration).

## Контекст для агентов

### Вход агента

- **Источник задачи**: Notion (Briefs) с полями `Brief`, `Scope`, `Deliverables`, `Executor`, `Lane`
- **Контекст проекта**: `docs/SINGLE-SOURCE-PLAYBOOK.md`
- **Шаблон**: `templates/story.md`

### Выход агента

- **Ветка**: `{type}/{short-description}` (например, `chore/stories-concept`)
- **Коммиты**: conventional commits style (`feat:`, `fix:`, `chore:`, `docs:`)
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

- **[Single Source Playbook — «священный документ» (Notion↔Repo)](../SINGLE-SOURCE-PLAYBOOK.md)** — единый источник истины для синхронизации между Notion и GitHub
- [CONCEPT.md](CONCEPT.md) — концепция Stories
- [Single Source Playbook — «священный документ» (Notion↔Repo)](../SINGLE-SOURCE-PLAYBOOK.md)
- [Шаблон story.md](../../templates/story.md)
- [README](../../README.md)

## Концепция, значимость и план (фиксируем для истории и восстановления контекста)

### Краткая концепция

Stories — это репозиторный канал публикации кратких эпизодов о прогрессе проекта. Цель — перевести необработанные deliverables и технические заметки в читабельные, проверяемые и индексируемые эпизоды, которые можно ревьювить через Pull Request и отображать в витрине Explorer.

Ключевые принципы:

- единый источник правды — GitHub (с синхронизацией из Notion при необходимости);
- нейтральный автор — ничего персонального (анонимизация);
- минимальная автоматическая телеметрия и отчётность (Notion minimal report) для мониторинга.

### Почему это важно

- Обеспечивает регулярную, асинхронную историю прогресса проекта;
- Делает достижения и проблемы видимыми для заинтересованных команд;
- Позволяет сочетать автоматический генератор (ежедневные черновики) и человеческое редактирование (HitL);
- Улучшает связность между ADR, CHANGELOG и практическими результатами.

### План действий (high-level)

1. Поддерживать шаблон `templates/story.md` и генератор `scripts/generate-stories.mjs`.
2. Поддерживать минимальный Notion‑репортер `scripts/notion-report.mjs` для заметок о генерации.
3. Использовать `scripts/author-gateway.mjs` как PoC для режимов auto / hitl / human-first.
4. Использовать `scripts/add-image-to-episode.mjs` для добавления иллюстраций в front matter пост‑факту.
5. PR workflow: draft PR → локальные проверки (normalize + lint + pii) → ревью → merge (manual by humans).

### Что зафиксировано в текущем PR

- Ветка/PR: feature work in `feat/author-gateway` — PR #130 ("feat(stories): author gateway + image helper (PoC)").
- Основные файлы: `scripts/notion-report.mjs`, `scripts/generate-stories.mjs`, `scripts/author-gateway.mjs`, `scripts/add-image-to-episode.mjs`, `templates/story.md`, `docs/stories/*`.

## Инструкции «тёплого старта» — как быстро войти в контекст, если сессия прервана

Ниже — компактный чеклист и команды, которые помогут быстро восстановить состояние и продолжить работу.

### Получить код и ветки

```powershell
cd <repo-root>
git fetch origin --prune
git checkout feat/author-gateway || git checkout -b feat/author-gateway origin/feat/author-gateway
git pull --rebase origin feat/author-gateway
```

### Быстрая проверка состояния PR

- Откройте [PR #130](https://github.com/utemix-lab/vovaipetrova-core/pull/130) и проверьте статус CI, комментарии ботов и последние коммиты.

### Среда и секреты

- Для работы с Notion нужен ключ в окружении: `NOTION_API_KEY` — хранится в локальном `.env` (корень репозитория) или в переменных CI.
- (Опционально) ID страницы отчётов: `NOTION_COPILOT_REPORTS_PAGE_ID`.

### Быстрые команды для локальной валидации

```powershell
npm run normalize:dry    # посмотреть что normalize бы сделал
npm run lint:docs        # линтер контента
npm run pii:scan         # проверка PII
npm run story:generate   # запустить генератор локально (создаст файл в docs/stories/)
node scripts/notion-report.mjs --file tmp/story-report.json --title "Smoke report"
```

### Где смотреть ключевые артефакты

- Логи и временные метаданные генератора: `tmp/story-meta.json`, `tmp/story-report.json`.
- Сгенерированные эпизоды: `docs/stories/YYYY-MM-DD-*.md`.
- Скрипты: `scripts/*.mjs` — ключевые: `generate-stories`, `notion-report`, `author-gateway`, `add-image-to-episode`.

### Восстановление состояния ветки / конфликтов

Если при мердже есть конфликты, выполните:

```powershell
git fetch origin
git checkout feat/author-gateway
git merge origin/main
# разрешите конфликты в указанных файлах (обычно: scripts/notion-report.mjs, scripts/generate-stories.mjs)
git add <resolved-files>
git commit
git push origin feat/author-gateway
```

### Короткий чеклист для ассистента при восстановлении сессии

- Проверить `CONTRIBUTING.md` и `docs/stories/SHARED_CONTEXT.md` на политику языка и правила.
- Проверить ветку и PR (#130), CI статусы и последние комментарии ботов.
- Запустить `npm run lint:docs` и `npm run normalize:dry`.
- Запустить `node scripts/generate-stories.mjs` локально и проверить, что `docs/stories/` получает файлы.
- При необходимости запустить `node scripts/notion-report.mjs --file tmp/story-report.json` (best-effort) и проверить Notion (если ключ доступен).

## Контактные заметки

Если что-то пошло не так с автоматикой или ботами (Cursor и пр.), сохраните лог и создайте issue в репозитории, указав: ветку, PR, шаг, где произошла ошибка и последние команды, которые вы запускали.

---

