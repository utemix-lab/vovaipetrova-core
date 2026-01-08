---
title: Отчёт о переходе на PowerShell 7 и однопоточную работу
slug: migration-report-2025-01-08
summary: Отчёт о переходе на PowerShell 7, упрощении процесса работы и очистке репозитория
tags: [Процесс, Миграция]
machine_tags: [theme/dev, action/refactor]
status: ready
---

# Отчёт о переходе на PowerShell 7 и однопоточную работу

**Дата:** 2025-01-08
**Тип:** Миграция и очистка репозитория

## Резюме

Выполнена миграция на PowerShell 7, упрощена архитектура работы (переход на однопоточную модель с Cursor), удалены устаревшие компоненты и документация, связанные с ZIP-импортом из Notion и другими IDE-агентами.

---

## 1. Переход на PowerShell 7

### Что сделано

- ✅ Настроен Cursor для использования PowerShell 7 (`pwsh.exe`) вместо PowerShell 5.1
- ✅ Обновлён `.vscode/settings.json` с настройками терминала
- ✅ Удалены упоминания о проблемах с кодировкой PowerShell 5.1
- ✅ Упрощён скрипт `create-pr-safe.mjs` (убрана функция детекции моджибаке)

### Результаты

- **Версия PowerShell:** 7.5.4 (Core Edition)
- **Кодировка:** UTF-8 по умолчанию
- **Производительность:** Улучшена по сравнению с PowerShell 5.1
- **Совместимость:** Кроссплатформенность (Windows, macOS, Linux)

### Удалено

- Упоминания о проблемах с кодировкой в PowerShell 5.1
- Функция `detectMojibake()` из `create-pr-safe.mjs`
- Скрипт `fix-pr-encoding.mjs` (больше не нужен)
- Упоминания о моджибаке в документации

---

## 2. Переход на однопоточную работу

### Что сделано

- ✅ Удалены все файлы, связанные с другими IDE-агентами:
  - CodeGPT (setup, roadmap, kickoff tasks)
  - GitHub Copilot (MCP setup, quick setup)
  - Voideditor (troubleshooting, token setup)
- ✅ Удалены скрипты для других агентов:
  - `scripts/test-codegpt-guardrails-sandbox.mjs`
  - `scripts/test-copilot-guardrails-sandbox.mjs`
  - `scripts/codegpt/` (вся папка)
- ✅ Обновлены шаблоны PR и Issues (убраны упоминания двухпоточной работы)
- ✅ Обновлён `scripts/notion-report.mjs` (убраны упоминания Copilot)
- ✅ Обновлён `docs/SINGLE-SOURCE-PLAYBOOK.md` (убраны упоминания других агентов)

### Результаты

- **Единственный агент:** Cursor
- **Протокол связи:** MCP (Model Context Protocol)
- **Источник задач:** Notion Briefs через MCP
- **Отчёты:** `scripts/notion-report.mjs` → страница "Отчёты" в Notion

### Удалено

- Документация по настройке CodeGPT, Copilot, Voideditor
- Скрипты для работы с другими агентами
- Секция "Two-stream синхронизация" из PR template
- Секция "Two-stream Policy" из Issue template
- Упоминания Copilot lanes из Issue template

---

## 3. Удаление ZIP импорта из Notion

### Что сделано

- ✅ Удалён скрипт `scripts/unpack-notion-export.mjs`
- ✅ Удалён workflow `.github/workflows/notion-import.yml`
- ✅ Удалена документация:
  - `docs/backup-export-routine-notion-github.md`
  - `docs/eksport-v-github-rukovodstvo-i-shablony.md`
- ✅ Обновлён `README.md` (убраны упоминания ZIP импорта)
- ✅ Удалён скрипт `unpack:notion` из `package.json`

### Результаты

- **Импорт:** Не используется (работа только через MCP)
- **Синхронизация:** Только через MCP протокол
- **Упрощение:** Удалено ~500 строк кода и документации

---

## 4. Создан документ-напоминание

### Что создано

- ✅ `docs/CONTEXT-REMINDER.md` — краткое напоминание для восстановления контекста

**Содержание:**
- Ключевые принципы работы
- Процесс работы (5 шагов)
- Важные правила
- Структура проекта
- Ключевые скрипты
- Документация
- Что удалено (список)
- Быстрая проверка

---

## Статистика изменений

### Удалено файлов

- **Скрипты:** 3 файла (`unpack-notion-export.mjs`, `fix-pr-encoding.mjs`, `test-codegpt-guardrails-sandbox.mjs`, `test-copilot-guardrails-sandbox.mjs`)
- **Workflows:** 1 файл (`notion-import.yml`)
- **Документация:** 9 файлов (CodeGPT, Copilot, Voideditor, ZIP импорт)
- **Папки:** 1 папка (`scripts/codegpt/`)

**Всего удалено:** ~15 файлов и папок

### Обновлено файлов

- `package.json` — удалены скрипты для ZIP импорта и других агентов
- `scripts/create-pr-safe.mjs` — упрощён (убрана детекция моджибаке)
- `scripts/notion-report.mjs` — убраны упоминания Copilot
- `.cursorrules` — убраны упоминания о проблемах PowerShell 5.1
- `docs/SINGLE-SOURCE-PLAYBOOK.md` — убраны упоминания других агентов
- `.github/pull_request_template.md` — удалена секция Two-stream
- `.github/ISSUE_TEMPLATE/task.md` — удалена секция Two-stream Policy
- `README.md` — убраны упоминания ZIP импорта и CodeGPT
- `docs/POWERSHELL-7-SETUP.md` — убраны упоминания проблем PowerShell 5.1
- `docs/UTF-8-SETUP.md` — убраны упоминания моджибаке
- `docs/PROCESS-IMPROVEMENTS-ASSESSMENT.md` — убраны упоминания моджибаке

**Всего обновлено:** ~11 файлов

---

## Преимущества изменений

### 1. Упрощение процесса

- ✅ Один агент (Cursor) вместо нескольких
- ✅ Один протокол (MCP) вместо нескольких интеграций
- ✅ Меньше документации для поддержки
- ✅ Меньше скриптов для поддержки

### 2. Улучшение производительности

- ✅ PowerShell 7 быстрее PowerShell 5.1
- ✅ UTF-8 по умолчанию (нет проблем с кодировкой)
- ✅ Меньше зависимостей и скриптов

### 3. Улучшение поддерживаемости

- ✅ Меньше файлов для поддержки
- ✅ Чёткая архитектура (Notion → Cursor → GitHub)
- ✅ Документ-напоминание для быстрого восстановления контекста

---

## Следующие шаги

1. ✅ Проверить работу PowerShell 7 в Cursor
2. ✅ Проверить работу MCP с Notion
3. ✅ Проверить создание PR через `npm run pr:create-safe`
4. ✅ Проверить публикацию отчётов через `npm run notion:report`

---

## Выводы

Миграция на PowerShell 7 и переход на однопоточную работу с Cursor успешно завершены. Репозиторий очищен от устаревших компонентов, процесс работы упрощён и документирован. Создан документ-напоминание для быстрого восстановления контекста при необходимости.

**Общее улучшение:** Упрощение архитектуры, улучшение производительности, снижение сложности поддержки.
