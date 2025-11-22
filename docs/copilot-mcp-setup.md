---
title: Настройка GitHub Copilot с MCP для Notion
slug: copilot-mcp-setup
summary: Как настроить GitHub Copilot для работы с Notion через MCP протокол
status: draft
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - theme/automation
  - theme/dev
---

# Настройка GitHub Copilot с MCP для Notion

## Что такое MCP сервер?

**MCP (Model Context Protocol) сервер — это программа/процесс, а не документ.**

- **MCP сервер** = запущенная программа, которая работает как сервис
- **MCP конфигурация** = файл настроек (JSON), который говорит IDE, как запустить сервер
- **MCP протокол** = стандарт обмена данными между AI и инструментами

### Аналогия:
- **MCP сервер** = веб-сервер (например, Apache или Nginx)
- **MCP конфигурация** = файл конфигурации сервера (например, `nginx.conf`)
- **MCP протокол** = HTTP протокол

## Поддержка MCP в GitHub Copilot

✅ **GitHub Copilot поддерживает MCP** начиная с VS Code 1.102 (июль 2024)

- Copilot может использовать те же MCP серверы, что и Cursor/Claude Desktop
- MCP серверы работают локально на вашем компьютере
- Copilot подключается к MCP серверам через стандартный протокол

## Настройка MCP для Notion с Copilot

### Шаг 1: Установка Notion MCP сервера

Есть готовый официальный MCP сервер для Notion:

```bash
# Установка через npm (если есть готовый пакет)
npm install -g @modelcontextprotocol/server-notion

# Или используйте готовый сервер из репозитория
# https://github.com/modelcontextprotocol/servers/tree/main/src/notion
```

### Шаг 2: Создание Notion интеграции

1. Перейдите на https://www.notion.so/my-integrations
2. Создайте новую интеграцию (Internal Integration)
3. Скопируйте токен (начинается с `secret_` или `ntn_`)
4. Предоставьте интеграции доступ к нужным страницам/базам данных

### Шаг 3: Настройка MCP в VS Code/Copilot

**Вариант A: Через настройки VS Code**

1. Откройте Command Palette (Ctrl+Shift+P)
2. Введите: `MCP: Add Server`
3. Следуйте инструкциям для добавления сервера

**Вариант B: Через файл конфигурации**

Создайте/отредактируйте файл конфигурации MCP:

**Windows:** `%APPDATA%\Code\User\globalStorage\github.copilot\mcp.json`  
**macOS:** `~/Library/Application Support/Code/User/globalStorage/github.copilot/mcp.json`  
**Linux:** `~/.config/Code/User/globalStorage/github.copilot/mcp.json`

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": [
        "path/to/notion-mcp-server.mjs"
      ],
      "env": {
        "NOTION_API_KEY": "secret_ваш_токен"
      }
    }
  }
}
```

### Шаг 4: Включение Agent Mode в Copilot

1. Откройте настройки VS Code (Ctrl+,)
2. Найдите "GitHub Copilot"
3. Включите "Agent Mode" или "Enable MCP"
4. Перезапустите VS Code

### Шаг 5: Проверка работы

1. Откройте чат Copilot (Ctrl+L или через панель)
2. Попробуйте: "Прочитай страницу из Notion с ID [page-id]"
3. Или: "Найди в Notion документы про [тема]"

## Использование того же MCP сервера, что и Cursor

**Да, можно использовать один и тот же MCP сервер для разных IDE!**

MCP сервер — это отдельный процесс, который может обслуживать несколько клиентов:

```
┌─────────────┐      ┌──────────────┐
│   Cursor    │──────┤              │
└─────────────┘      │  MCP Server  │
                     │   (Notion)  │
┌─────────────┐      │              │
│   Copilot   │──────┤              │
└─────────────┘      └──────────────┘
```

### Настройка общего MCP сервера

1. **Запустите MCP сервер один раз** (как отдельный процесс или через IDE)
2. **Настройте оба IDE** (Cursor и VS Code/Copilot) на один и тот же сервер
3. **Используйте один токен Notion** для обоих

### Пример конфигурации для обоих IDE

**Cursor (`%APPDATA%\Cursor\mcp.json`):**
```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["R:\\vovaipetrova-core\\mcp-server-notion.mjs"],
      "env": {
        "NOTION_API_KEY": "secret_ваш_токен"
      }
    }
  }
}
```

**VS Code/Copilot (`%APPDATA%\Code\User\globalStorage\github.copilot\mcp.json`):**
```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["R:\\vovaipetrova-core\\mcp-server-notion.mjs"],
      "env": {
        "NOTION_API_KEY": "secret_ваш_токен"
      }
    }
  }
}
```

## Создание собственного MCP сервера для Notion

Если готового сервера нет, можно создать свой (как мы делали для OpenRouter):

См. пример: `mcp-server-openrouter.mjs` в корне проекта

Адаптируйте его для Notion API вместо OpenRouter API.

## Преимущества MCP для Copilot

✅ **Локальный доступ** к файлам и данным  
✅ **Интеграция с Notion** для работы с базой знаний  
✅ **Единый протокол** для разных IDE  
✅ **Расширяемость** — можно добавить любые инструменты

## Troubleshooting

### Copilot не видит MCP сервер

1. Проверьте версию VS Code (должна быть ≥ 1.102)
2. Проверьте версию расширения Copilot (обновите до последней)
3. Убедитесь, что Agent Mode включен
4. Перезапустите VS Code

### MCP сервер не запускается

1. Проверьте путь к скрипту в конфигурации
2. Проверьте переменные окружения (NOTION_API_KEY)
3. Запустите сервер вручную для проверки:
   ```bash
   node mcp-server-notion.mjs
   ```

### Ошибки подключения к Notion

1. Проверьте токен Notion API
2. Убедитесь, что интеграция имеет доступ к нужным страницам
3. Проверьте баланс/лимиты Notion API

## Альтернативы

Если MCP кажется сложным, можно использовать:

1. **GitHub Copilot Chat** с прямыми запросами к Notion API через скрипты
2. **GitHub Actions** для автоматизации синхронизации Notion → GitHub
3. **Notion API напрямую** через ваши скрипты (см. `scripts/codegpt/notion-*.mjs`)

## Связанные документы

- [Cursor MCP Setup](cursor-mcp-openrouter-setup.md)
- [CodeGPT Setup](codegpt-setup.md)
- [Notion Export Guide](backup-export-routine-notion-github.md)

