#!/usr/bin/env node
/**
 * MCP сервер для работы с Notion API
 * Использование: node mcp-server-notion.mjs
 * 
 * Этот сервер предоставляет доступ к Notion через MCP протокол,
 * аналогично тому, как Cursor/Composer подключается к Notion.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка переменных окружения из .env
function loadEnv() {
  try {
    const envPath = join(__dirname, ".env");
    const envContent = readFileSync(envPath, "utf-8");
    const env = {};
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        env[key] = value;
      }
    });
    Object.assign(process.env, env);
  } catch (err) {
    // .env не обязателен, если переменные заданы в системе
  }
}

loadEnv();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_API_BASE = "https://api.notion.com/v1";

if (!NOTION_API_KEY) {
  console.error(
    "❌ NOTION_API_KEY не установлен. Установите в .env или переменных окружения."
  );
  process.exit(1);
}

/**
 * Базовый запрос к Notion API
 */
async function notionRequest(endpoint, options = {}) {
  const url = `${NOTION_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} ${error}`);
  }

  return response.json();
}

const server = new Server(
  {
    name: "notion-api",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Список доступных инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "notion_search",
      description:
        "Поиск страниц и баз данных в Notion по текстовому запросу",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Текстовый запрос для поиска (например, 'проект автоматизация')",
          },
          filter: {
            type: "object",
            description: "Опциональный фильтр для поиска",
            properties: {
              value: {
                type: "string",
                enum: ["page", "database"],
              },
              property: {
                type: "string",
              },
            },
          },
        },
        required: ["query"],
      },
    },
    {
      name: "notion_fetch",
      description: "Получить страницу или базу данных из Notion по ID или URL",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "ID страницы/базы данных или URL (например, 'https://notion.so/page-123' или '12345678-1234-1234-1234-123456789abc')",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "notion_get_blocks",
      description: "Получить блоки (содержимое) страницы из Notion",
      inputSchema: {
        type: "object",
        properties: {
          pageId: {
            type: "string",
            description: "ID страницы в Notion",
          },
        },
        required: ["pageId"],
      },
    },
    {
      name: "notion_create_page",
      description: "Создать новую страницу в Notion",
      inputSchema: {
        type: "object",
        properties: {
          parentId: {
            type: "string",
            description: "ID родительской страницы или базы данных",
          },
          title: {
            type: "string",
            description: "Заголовок страницы",
          },
          properties: {
            type: "object",
            description: "Свойства страницы (для страниц в базе данных)",
          },
        },
        required: ["parentId", "title"],
      },
    },
    {
      name: "notion_update_page",
      description: "Обновить свойства страницы в Notion",
      inputSchema: {
        type: "object",
        properties: {
          pageId: {
            type: "string",
            description: "ID страницы для обновления",
          },
          properties: {
            type: "object",
            description: "Свойства для обновления",
          },
        },
        required: ["pageId", "properties"],
      },
    },
    {
      name: "notion_query_database",
      description: "Запросить записи из базы данных Notion",
      inputSchema: {
        type: "object",
        properties: {
          databaseId: {
            type: "string",
            description: "ID базы данных",
          },
          filter: {
            type: "object",
            description: "Фильтр для запроса",
          },
          sorts: {
            type: "array",
            description: "Сортировка результатов",
          },
        },
        required: ["databaseId"],
      },
    },
  ],
}));

// Извлечение ID из URL или ID
function extractNotionId(input) {
  // Если это URL, извлекаем ID
  const urlMatch = input.match(/notion\.so\/(?:[^\/]+\/)?([a-f0-9]{32})/i);
  if (urlMatch) {
    const id = urlMatch[1];
    // Форматируем как UUID
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  // Если уже UUID формат
  if (input.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
    return input;
  }
  // Если просто ID без дефисов
  if (input.match(/^[a-f0-9]{32}$/i)) {
    const id = input;
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  return input;
}

// Обработчик вызовов инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "notion_search": {
        const response = await notionRequest("/search", {
          method: "POST",
          body: JSON.stringify({
            query: args.query,
            filter: args.filter || undefined,
            sort: {
              direction: "descending",
              timestamp: "last_edited_time",
            },
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case "notion_fetch": {
        const pageId = extractNotionId(args.id);
        const response = await notionRequest(`/pages/${pageId}`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case "notion_get_blocks": {
        const pageId = extractNotionId(args.pageId);
        const response = await notionRequest(`/blocks/${pageId}/children`);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case "notion_create_page": {
        const parentId = extractNotionId(args.parentId);
        const properties = {
          title: {
            title: [
              {
                text: {
                  content: args.title,
                },
              },
            ],
          },
          ...args.properties,
        };

        const response = await notionRequest("/pages", {
          method: "POST",
          body: JSON.stringify({
            parent: { page_id: parentId },
            properties,
            children: args.children || [],
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case "notion_update_page": {
        const pageId = extractNotionId(args.pageId);
        const response = await notionRequest(`/pages/${pageId}`, {
          method: "PATCH",
          body: JSON.stringify({
            properties: args.properties,
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      case "notion_query_database": {
        const databaseId = extractNotionId(args.databaseId);
        const response = await notionRequest(`/databases/${databaseId}/query`, {
          method: "POST",
          body: JSON.stringify({
            filter: args.filter || {},
            sorts: args.sorts || [],
          }),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
          text: `Ошибка: ${error.message}\n\nДетали: ${error.stack || ""}`,
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
  console.error("MCP сервер Notion запущен");
  console.error(`Notion API Base: ${NOTION_API_BASE}`);
  console.error(`API Key: ${NOTION_API_KEY ? "✅ установлен" : "❌ не установлен"}`);
}

main().catch((error) => {
  console.error("Ошибка запуска MCP сервера:", error);
  process.exit(1);
});

