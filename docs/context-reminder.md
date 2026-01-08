---
title: Контекст-напоминание для Cursor
slug: context-reminder
summary: Краткое напоминание о ключевых принципах работы для восстановления контекста
tags:
  - Документация
  - Процесс
machine_tags:
  - action/build
  - product/kb
  - theme/dev
status: ready
---

# Контекст-напоминание для Cursor

**Дата создания:** 2025-01-08
**Цель:** Быстрое восстановление контекста при сбоях или потере истории чата

## Ключевые принципы

### 1. Архитектура работы

- **Notion** — источник истины (Source of Truth)
- **GitHub** — зеркало для выполнения, CI/CD, публикации
- **Cursor** — единственный IDE-агент для работы
- **MCP** — протокол для связи Cursor ↔ Notion

### 2. Процесс работы

1. Задачи берутся из Notion Briefs через MCP
2. Работа выполняется в Cursor
3. Создаётся PR в GitHub
4. После мерджа — отчёт в Notion через `scripts/notion-report.mjs`
5. Берётся новая задача из Notion

### 3. Важные правила

- **Все файлы:** UTF-8 без BOM
- **Коммиты:** на русском языке, Conventional Commits
- **PR:** описание на русском, UTF-8
- **PowerShell:** используется PowerShell 7 (pwsh.exe)
- **Создание PR:** всегда через `npm run pr:create-safe`

### 4. Структура проекта

- `docs/` — документация
- `scripts/` — утилиты и скрипты
- `.github/workflows/` — CI/CD
- `docs/stories/` — Stories эпизоды

### 5. Ключевые скрипты

- `npm run pr:create-safe` — безопасное создание PR
- `npm run notion:report` — публикация отчёта в Notion
- `npm run sync:playbook` — синхронизация Playbook из Notion

### 6. Документация

- `docs/single-source-playbook.md` — основной документ процесса
- `docs/POWERSHELL-7-SETUP.md` — настройка PowerShell 7
- `docs/utf-8-setup.md` — настройка кодировки

### 7. Что удалено (не использовать)

- ❌ ZIP импорт из Notion (удалён)
- ❌ CodeGPT, Copilot, Voideditor (удалены)
- ❌ Двухпоточная работа (удалена)
- ❌ PowerShell 5.1 (заменён на PowerShell 7)

## Быстрая проверка

Если что-то не работает:

1. Проверь версию PowerShell: `$PSVersionTable` (должна быть 7.x.x)
2. Проверь кодировку файла в статус-баре Cursor (должна быть UTF-8)
3. Проверь, что задача взята из Notion через MCP
4. Проверь, что используется `npm run pr:create-safe` для создания PR

## Связь с Notion

- **MCP сервер:** `mcp-server-notion.mjs`
- **Отчёты:** `scripts/notion-report.mjs` → страница "Отчёты" в Notion
- **Синхронизация:** через MCP протокол

---

**Примечание:** Этот документ создан для быстрого восстановления контекста. Подробная документация — в `docs/SINGLE-SOURCE-PLAYBOOK.md`.
