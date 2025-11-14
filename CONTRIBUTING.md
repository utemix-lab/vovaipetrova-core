# Contributing

Эти правила помогают сохранять единый процесс между Notion и GitHub.

## Базовый цикл (Notion → GitHub)

1. В Notion готовим структуру и контент, переводим карточку в Briefs → `Ready`.
2. Экспортируем (`Markdown & CSV`, с подстраницами) и кладём ZIP в `uploads/`.
3. Запускаем workflow **Notion Import (Safe PR)** (Actions → Run) или пушим ветку `notion-sync/...`.
4. Проверяем созданный PR: ждём зелёный `Docs CI`, затем мержим в `main`.

## Ответственность за фронт-маттер

Каждый `.md` содержит:

```yaml
---
title: ...
slug: ...
summary: ...
tags: []
machine_tags: []
status: draft | review | ready
notion_page_id: "..."
last_edited_time: "..."
service: true # только для служебных файлов
---
```

- `status=draft` допустим, но его видно в отчётах.
- `service: true` освобождает от линтинга и индекса Think Tank/Labs.

## Ветвление и коммиты

- `feature/*` — новое содержимое или крупные дополнения.
- `fix/*` — исправления, багфиксы, точечные правки.
- `chore/*` — инфраструктура, скрипты, документация о процессах.
- `notion-sync/*` — загрузки из Notion (создаются автоматикой или вручную).

Коммиты пишем в стиле **Conventional Commits**:

- `feat: …` — новые возможности/разделы.
- `fix: …` — исправления.
- `chore: …` — поддержка, инфраструктура.
- `docs: …` — текстовые правки без изменения логики.
- `refactor: …` — структурные изменения без фич.

Это облегчает автогенерацию релизов и ретроспектив.

## Локальные команды

Перед PR хватает следующего мини-скрипта:

```bash
npm run normalize:dry   # посмотреть, что поменяет normalize
npm run normalize       # применить нормализацию + slug/tag sync
npm run lint:docs       # контент-линт, предупреждения не валят CI
npm run check:links     # (если доступен) локальная проверка ссылок
npm run report:*        # вспомогательные отчёты (stats, pages, issues)
```

Команды `normalize`, `lint:docs`, `report:*` используют общие скрипты из `scripts/`.

## Как создать новый материал

Шаблоны лежат в `templates/`. CLI-примеры:

- Статья: `npm run scaffold:article -- --title="Название" --out=docs/kb/`
- ADR: `npm run scaffold:adr -- --title="ADR: Решение" --out=docs/adr/`

Параметры `--title`, `--out`, `--slug`, `--summary` настраивают фронт-маттер. Файл создаётся со статусом `draft`.

## Проверки и CI

- Любые изменения проходят через PR (авто или ручной).
- Workflow `Docs CI` (normalize dry-run + lint) должен быть зелёным перед merge.
- После merge ветку можно удалять (`feature/*`, `chore/*`, `fix/*`). Ветки `notion-sync/*` удаляются автоматически скриптом.

## Branch protection

Main защищён требованием `Docs CI` (Required status checks), количество обязательных аппрувов — 0. Это позволяет автопилоту мержить PR сразу после зелёного CI, фиксируя результат в Briefs.