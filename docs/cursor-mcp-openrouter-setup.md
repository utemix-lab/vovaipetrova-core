---
title: Настройка MCP сервера с OpenRouter для Cursor
slug: cursor-mcp-openrouter-setup
summary: Инструкция по настройке MCP сервера с OpenRouter для работы с локальными файлами в Cursor
status: draft
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - theme/automation
  - theme/dev
---

# Настройка MCP сервера с OpenRouter для Cursor

## Обзор

Model Context Protocol (MCP) позволяет создать сервер, который:
- Подключается к OpenRouter API
- Предоставляет доступ к локальным файлам
- Интегрируется с Cursor как дополнительный ассистент

## Вариант 1: Использование готового MCP сервера

### Шаг 1: Установка MCP SDK

```bash
npm install -g @modelcontextprotocol/server
```

### Шаг 2: Создание MCP сервера

Создайте файл `mcp-server-openrouter.mjs`:

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = new Server(
  {
    name: "openrouter-file-access",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Инструмент для чтения файлов
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read_file",
      description: "Читает содержимое файла из локального репозитория",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Путь к файлу относительно корня проекта",
          },
        },
        required: ["filePath"],
      },
    },
    {
      name: "write_file",
      description: "Записывает содержимое в файл",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Путь к файлу относительно корня проекта",
          },
          content: {
            type: "string",
            description: "Содержимое файла",
          },
        },
        required: ["filePath", "content"],
      },
    },
    {
      name: "list_files",
      description: "Списывает файлы в директории",
      inputSchema: {
        type: "object",
        properties: {
          directory: {
            type: "string",
            description: "Путь к директории относительно корня проекта",
          },
        },
        required: ["directory"],
      },
    },
    {
      name: "call_openrouter",
      description: "Вызывает модель через OpenRouter API",
      inputSchema: {
        type: "object",
        properties: {
          model: {
            type: "string",
            description: "Модель через OpenRouter (например, anthropic/claude-3.5-sonnet)",
          },
          messages: {
            type: "array",
            description: "Массив сообщений для модели",
          },
        },
        required: ["model", "messages"],
      },
    },
  ],
}));

// Обработчик вызовов инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const projectRoot = process.env.PROJECT_ROOT || process.cwd();

    switch (name) {
      case "read_file": {
        const filePath = path.join(projectRoot, args.filePath);
        const content = await fs.readFile(filePath, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      }

      case "write_file": {
        const filePath = path.join(projectRoot, args.filePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content, "utf-8");
        return {
          content: [
            {
              type: "text",
              text: `Файл ${args.filePath} успешно записан`,
            },
          ],
        };
      }

      case "list_files": {
        const dirPath = path.join(projectRoot, args.directory);
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const fileList = files.map((file) => ({
          name: file.name,
          type: file.isDirectory() ? "directory" : "file",
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(fileList, null, 2),
            },
          ],
        };
      }

      case "call_openrouter": {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error("OPENROUTER_API_KEY не установлен");
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://github.com/utemix-lab/vovaipetrova-core",
            "X-Title": "vovaipetrova-core MCP",
          },
          body: JSON.stringify({
            model: args.model,
            messages: args.messages,
          }),
        });

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: data.choices[0]?.message?.content || JSON.stringify(data),
            },
          ],
        };
      }

      default:
        throw new Error(`Неизвестный инструмент: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Ошибка: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Запуск сервера
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP сервер запущен");
}

main().catch(console.error);
```

### Шаг 3: Настройка Cursor

Создайте файл `~/.cursor/mcp.json` (или `%APPDATA%\Cursor\mcp.json` на Windows):

```json
{
  "mcpServers": {
    "openrouter-file-access": {
      "command": "node",
      "args": [
        "R:\\vovaipetrova-core\\mcp-server-openrouter.mjs"
      ],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-ваш-ключ",
        "PROJECT_ROOT": "R:\\vovaipetrova-core"
      }
    }
  }
}
```

### Шаг 4: Перезапуск Cursor

Перезапустите Cursor, чтобы загрузить MCP сервер.

## Вариант 2: Использование разных моделей в Composer

В Cursor можно переключать модели для Composer через настройки:

1. Откройте настройки Cursor (Ctrl+,)
2. Найдите "Cursor: Model"
3. Выберите модель или настройте кастомный endpoint

Для OpenRouter создайте кастомный endpoint:
- Base URL: `https://openrouter.ai/api/v1`
- Model: `anthropic/claude-3.5-sonnet` (или другая модель)
- API Key: ваш ключ OpenRouter

## Вариант 3: Разделение задач

### Стратегия разделения:

**Composer (основной ассистент):**
- Работа с локальными файлами
- Редактирование кода
- Запуск скриптов
- Использование основной модели (Claude Sonnet через Cursor)

**MCP сервер (второй поток):**
- Дополнительные запросы через OpenRouter
- Параллельная обработка задач
- Использование других моделей (GPT-4, Claude Opus)

### Пример использования:

1. **Composer**: "Прочитай файл docs/README.md и создай summary"
2. **MCP**: "Используя OpenRouter, проанализируй структуру проекта"

## Альтернативные решения

### Voideditor
Открытый аналог Cursor с поддержкой:
- Разных провайдеров через OpenRouter
- Локальных моделей (Ollama)
- Плагинов на JavaScript/TypeScript

Сайт: https://github.com/voideditor/voideditor

## Troubleshooting

### MCP сервер не запускается
- Проверьте, что Node.js установлен и доступен в PATH
- Убедитесь, что путь к скрипту правильный
- Проверьте переменные окружения

### OpenRouter API ошибки
- Проверьте API ключ
- Убедитесь, что модель доступна на OpenRouter
- Проверьте баланс на OpenRouter

### Cursor не видит MCP сервер
- Перезапустите Cursor
- Проверьте путь к конфигурационному файлу
- Проверьте логи Cursor (Help → Toggle Developer Tools)

## Рекомендации

1. **Для начала**: Используйте разные модели в самом Composer через настройки
2. **Для продвинутого использования**: Настройте MCP сервер для полного контроля
3. **Для экспериментов**: Попробуйте Voideditor как альтернативу

## Связанные документы

- [CodeGPT Setup](codegpt-setup.md)
- [Технический стек](tehnicheskij-stek-i-infrastruktura.md)

