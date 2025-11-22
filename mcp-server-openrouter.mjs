#!/usr/bin/env node
/**
 * MCP сервер для работы с OpenRouter и локальными файлами
 * Использование: node mcp-server-openrouter.mjs
 */

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
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

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

// Список доступных инструментов
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
            description: "Путь к файлу относительно корня проекта (например, docs/README.md)",
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
            description: "Путь к директории относительно корня проекта (например, docs/)",
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
            description: "Модель через OpenRouter (например, anthropic/claude-3.5-sonnet, openai/gpt-4-turbo)",
            enum: [
              "anthropic/claude-3.5-sonnet",
              "anthropic/claude-3-opus",
              "openai/gpt-4-turbo",
              "openai/gpt-4",
              "openai/gpt-3.5-turbo",
            ],
          },
          messages: {
            type: "array",
            description: "Массив сообщений для модели",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["system", "user", "assistant"] },
                content: { type: "string" },
              },
            },
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
    switch (name) {
      case "read_file": {
        const filePath = path.resolve(PROJECT_ROOT, args.filePath);
        // Безопасность: проверяем, что файл внутри проекта
        if (!filePath.startsWith(path.resolve(PROJECT_ROOT))) {
          throw new Error("Доступ запрещен: файл вне проекта");
        }
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
        const filePath = path.resolve(PROJECT_ROOT, args.filePath);
        // Безопасность: проверяем, что файл внутри проекта
        if (!filePath.startsWith(path.resolve(PROJECT_ROOT))) {
          throw new Error("Доступ запрещен: файл вне проекта");
        }
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
        const dirPath = path.resolve(PROJECT_ROOT, args.directory);
        // Безопасность: проверяем, что директория внутри проекта
        if (!dirPath.startsWith(path.resolve(PROJECT_ROOT))) {
          throw new Error("Доступ запрещен: директория вне проекта");
        }
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const fileList = files.map((file) => ({
          name: file.name,
          type: file.isDirectory() ? "directory" : "file",
          path: path.join(args.directory, file.name),
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
          throw new Error("OPENROUTER_API_KEY не установлен в переменных окружения");
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

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenRouter API ошибка: ${response.status} ${error}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: data.choices[0]?.message?.content || JSON.stringify(data, null, 2),
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
  console.error("MCP сервер openrouter-file-access запущен");
  console.error(`PROJECT_ROOT: ${PROJECT_ROOT}`);
}

main().catch((error) => {
  console.error("Ошибка запуска MCP сервера:", error);
  process.exit(1);
});

