---
title: Two-stream Policy — Правила отчётов
slug: two-stream-reporting-rules
summary: Правила оформления отчётов и Deliverables с учётом two-stream policy
tags:
  - Автоматизация
  - Проектирование
machine_tags:
  - theme/automation
  - theme/design
status: ready
---

# Two-stream Policy — Правила отчётов

## Общие принципы

Все отчёты (PR описания, Deliverables, Issues) должны явно указывать тип two-stream потока и статус синхронизации с Notion.

## Формат отчёта в PR

### Обязательные секции

1. **Two-stream Policy** — тип потока:
   - Stream 1 (Notion → GitHub): Импорт из Notion
   - Stream 2 (GitHub → Notion): Работа агента с синхронизацией

2. **Two-stream Sync Status** — статус синхронизации:
   - Статус в Notion обновлён на `In Progress` (при создании ветки)
   - Статус в Notion обновлён на `Review` (при создании PR)
   - Статус в Notion будет обновлён на `Done` (после мерджа)

3. **Two-stream Notes** — детали синхронизации (если применимо):
   - Notion Page ID
   - Sync Method (MCP / Scripts / Manual)
   - Status Updated (Да/Нет)
   - Issues (проблемы с синхронизацией)

### Примеры отчётов

#### Пример 1: Stream 2 (GitHub → Notion)

```markdown
## Two-stream Policy
- [x] Stream 2 (GitHub → Notion): Работа агента с синхронизацией статусов в Notion

## Deliverables

**Executor**: GitHub Copilot  
**Status**: ✅ Completed  
**Task**: [Notion Brief: Task Name](https://notion.so/page-id)

**Two-stream Sync Status**:
- [x] Статус в Notion обновлён на `In Progress` (при создании ветки)
- [x] Статус в Notion обновлён на `Review` (при создании PR)
- [x] Статус в Notion будет обновлён на `Done` (после мерджа)

### Two-stream Notes
- **Notion Page ID**: `12345678-90ab-cdef-1234-567890abcdef`
- **Sync Method**: MCP (через `mcp-server-notion.mjs`)
- **Status Updated**: Да (все этапы синхронизированы)
- **Issues**: Нет проблем
```

#### Пример 2: Stream 1 (Notion → GitHub)

```markdown
## Two-stream Policy
- [x] Stream 1 (Notion → GitHub): Импорт из Notion через workflow `notion-import.yml`

## Deliverables

**Executor**: GitHub Actions (notion-import workflow)  
**Status**: ✅ Completed  
**Task**: Notion Export (автоматический импорт)

**Two-stream Sync Status**:
- [x] Задача не из Notion (только GitHub Issue) — синхронизация не требуется
- [x] Ветка `notion-sync/*` — односторонний импорт (не синхронизируется обратно)

### Two-stream Notes
- **Notion Page ID**: N/A (импорт контента)
- **Sync Method**: Workflow (автоматический)
- **Status Updated**: N/A (односторонний поток)
- **Issues**: Нет проблем
```

#### Важно: Все задачи из Notion Briefs

**ОБЯЗАТЕЛЬНО**: Все задачи должны быть из Notion Briefs через MCP. Если не удаётся получить задачу из Notion (сбой связи, MCP, Wi-Fi и т.д.) — уведомить автора (пользователя) о проблеме с связью и не начинать работу. Сценарий должен быть один — всегда из Notion Briefs. Если связь не работает, автор починит её.

## Правила для агентов

### GitHub Copilot

**Использование MCP:**
- Использовать MCP инструменты для работы с Notion
- Проверять доступ к страницам перед использованием
- Указывать `Sync Method: MCP` в отчёте

**Пример использования:**
```javascript
// Поиск задачи
notion_search({ query: "Task Name" })

// Обновление статуса
notion_update_page({ 
  pageId: "page-id", 
  properties: { 
    Status: { select: { name: "In Progress" } } 
  } 
})
```

**Настройка MCP:**
- См. [COPILOT-NOTION-SETUP.md](../COPILOT-NOTION-SETUP.md) для настройки MCP сервера
- См. [NOTION-ACCESS-SETUP.md](NOTION-ACCESS-SETUP.md) для настройки доступа к страницам Notion

## Проверка перед PR

Перед созданием PR убедитесь:

1. ✅ Тип two-stream потока указан в описании PR
2. ✅ Статус синхронизации заполнен в секции Deliverables
3. ✅ Two-stream Notes заполнены (если применимо)
4. ✅ Статус в Notion обновлён (если Stream 2)
5. ✅ Файлы с `notion_page_id` не изменены (если Stream 1)

## Troubleshooting

### Проблема: Не могу обновить статус в Notion

**Причины:**
- Нет доступа к странице в Notion (см. [NOTION-ACCESS-SETUP.md](NOTION-ACCESS-SETUP.md))
- Неправильный токен API
- Страница не существует

**Решение:**
1. Проверить доступ к странице в Notion (Add connections)
2. Проверить токен в `.env`
3. Проверить ID страницы

### Проблема: Не понимаю, какой поток использовать

**Правило:**
- Если задача из Notion Briefs → Stream 2 (GitHub → Notion)
- Если импорт контента из Notion → Stream 1 (Notion → GitHub)
- Если задача только в GitHub Issue → Нет связи с Notion

## Связанные документы

- **[Single Source Playbook — «священный документ» (Notion↔Repo)](SINGLE-SOURCE-PLAYBOOK.md)** — единый источник истины для синхронизации между Notion и GitHub
- [Protocol — Контрактная модель для агентов](protocol-kontraktnaya-model-dlya-agentov.md)
- [NOTION-ACCESS-SETUP.md](NOTION-ACCESS-SETUP.md) — настройка доступа к Notion
- [COPILOT-NOTION-SETUP.md](../COPILOT-NOTION-SETUP.md) — настройка MCP для Copilot

