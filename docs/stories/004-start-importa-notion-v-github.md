---
title: 'Старт импорта: Notion → GitHub'
slug: 004-start-importa-notion-v-github
summary: Первые шаги автоматизации экспорта из Notion в репозиторий через ZIP-архивы.
tags:
  - Story
machine_tags:
  - content/story
status: draft
last_edited_time: null
---

# Старт импорта: Notion → GitHub

TL;DR

- Начата автоматизация экспорта из Notion в репозиторий через ZIP-архивы.
- Создан workflow для безопасного импорта с проверками путей и deny paths.
- Импорт запускается вручную через Actions, создаёт PR с отчётом изменений.
- Добавлены поля notion_page_id и last_edited_time для отслеживания синхронизации.
- Дальше — автоматизация нормализации и исправления ссылок.

**Что произошло.** После фиксации архитектуры Source of truth потребовался механизм переноса контента из Notion в GitHub. Создан workflow Notion Import, который принимает ZIP-архив из папки uploads или ветки notion-sync и безопасно распаковывает его в репозиторий.

**Зачем это делали.** Нужен был способ синхронизировать контент без ручного копирования и риска перезаписать критичные файлы. Workflow обеспечивает безопасность через проверки путей и deny paths, автоматизирует путь от ZIP до PR с отчётом изменений.

**Что получилось.** Workflow защищает контент и автоматизирует импорт. Action проверяет пути, запускает normalize и fix:links, создаёт PR с отчётом import-diff.md и метками. В файлы попали поля notion_page_id и last_edited_time для отслеживания синхронизации.

**Тех-вставка.** Скрипт `scripts/check-import-safety.mjs` проверяет deny paths из `.import-map.yaml`. Workflow использует `actions/checkout@v4.1.1` и `actions/setup-node@v4.0.2` с токеном `GITHUB_TOKEN`. Commit message фиксирован: `chore: normalize imported Notion docs [skip ci]`.

**Что дальше.** После базового импорта следующий шаг — автоматизация нормализации и исправления ссылок. Это позволит автоматически обрабатывать экспортированный контент и поддерживать его в актуальном состоянии.

