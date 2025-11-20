---
title: MCP Notion API Compatibility Tracker
slug: mcp-notion-api-compatibility-tracker
summary: |
  Отслеживание совместимости MCP серверов с Notion API версии 2025-09-03
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - action/monitor
  - product/services
  - theme/automation
  - theme/dev
status: draft
---

# MCP Notion API Compatibility Tracker

## Проблема

После обновления Notion API до версии `2025-09-03` (сентябрь 2025) возникли проблемы совместимости с MCP серверами:

- MCP серверы используют устаревшие схемы/эндпоинты
- Не поддерживают multi-source databases
- Ошибки валидации JSON и аргументов
- Невозможность обновления/создания страниц и баз данных

## Репозитории для отслеживания

### Model Context Protocol Servers
- **Репозиторий**: [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **Issues**: Поиск по тегам `notion`, `2025-09-03`, `compatibility`, `api-version`
- **Статус**: ⏳ Требует проверки

### Cursor MCP
- **Репозиторий**: [anysphere/cursor-mcp](https://github.com/anysphere/cursor-mcp)
- **Issues**: Поиск по тегам `notion`, `mcp`, `api-compatibility`
- **Статус**: ⏳ Требует проверки

### Cursor
- **Репозиторий**: [getcursor/cursor](https://github.com/getcursor/cursor)
- **Issues**: Поиск по тегам `mcp`, `notion`, `api-compatibility`
- **Статус**: ⏳ Требует проверки

## Автоматический мониторинг

Используйте скрипт для автоматической проверки issues:

```bash
npm run monitor:mcp-compatibility
```

Скрипт проверяет:
- Открытые issues с ключевыми словами (`notion`, `2025-09-03`, `data_source_id`, `multi-source`)
- Последние обновленные issues в репозиториях
- Группирует результаты по репозиториям

## Ключевые Issues для мониторинга

### Критерии поиска:
- `notion api 2025-09-03`
- `notion mcp compatibility`
- `notion mcp broken`
- `notion data_source_id`
- `notion multi-source`

### Что отслеживать:
1. ✅ Открытые issues с проблемами совместимости
2. ✅ Pull requests с исправлениями
3. ✅ Релизы с поддержкой новой версии API
4. ✅ Workarounds и временные решения

## Текущее решение

### Временный workaround
Используем прямые API запросы через `scripts/codegpt/notion-api.mjs`:
- ✅ Обновлено до версии `2025-09-03`
- ✅ Поддержка `data_source_id`
- ✅ Работает без MCP

### Скрипты
- `notion-find-and-update.mjs` - поиск и обновление страниц по названию
- `notion-api.mjs` - базовые функции API с поддержкой новой версии

## План действий

1. **Еженедельная проверка** репозиториев на новые issues
   ```bash
   npm run monitor:mcp-compatibility
   ```
2. **Мониторинг релизов** MCP и Cursor
   - Подпишитесь на релизы в репозиториях
   - Проверяйте changelog на упоминания Notion API
3. **Документирование** найденных проблем и решений
   - Обновляйте этот документ при обнаружении новых issues
   - Фиксируйте workarounds и временные решения
4. **Обновление скриптов** при появлении исправлений
   - Обновляйте `scripts/codegpt/notion-api.mjs` при изменениях API
   - Тестируйте совместимость после обновлений MCP

## Настройка мониторинга

### Требования
- `GITHUB_TOKEN` в `.env` или переменных окружения
- Токен должен иметь доступ к чтению публичных репозиториев

### Добавление новых репозиториев

Отредактируйте `scripts/monitor-mcp-compatibility.mjs`:

```javascript
const REPOSITORIES = [
  {
    name: 'Название репозитория',
    owner: 'owner',
    repo: 'repo-name',
    searchTerms: ['notion', '2025-09-03'],
    enabled: true,
  },
];
```

## Связано с…

- [Notion API Upgrade Guide](https://developers.notion.com/docs/upgrade-guide-2025-09-03)
- [Технический стек и инфраструктура](tehnicheskij-stek-i-infrastruktura.md)

