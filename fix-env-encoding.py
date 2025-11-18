#!/usr/bin/env python3
# -*- coding: utf-8 -*-

content = """# GitHub API
# Получить токен: https://github.com/settings/tokens
# Нужны права: repo, workflow
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Notion API
# Получить токен: https://www.notion.so/my-integrations
# Создать интеграцию → Internal Integration → Copy token
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub Repository (owner/repo)
GITHUB_REPO=utemix-lab/vovaipetrova-core

# Notion Database ID (опционально, для работы с конкретной БД)
# Найти в URL страницы Notion: notion.so/workspace/DATABASE_ID?v=...
NOTION_DATABASE_ID=

# CodeGPT Provider (openrouter, ollama, openai)
CODEGPT_PROVIDER=openrouter

# CodeGPT API Key (если используется OpenRouter или OpenAI)
CODEGPT_API_KEY=

# CodeGPT Model (зависит от провайдера)
CODEGPT_MODEL=anthropic/claude-3.5-sonnet

# Ollama Base URL (если используется локальный Ollama)
OLLAMA_BASE_URL=http://localhost:11434
"""

with open('.env', 'w', encoding='utf-8') as f:
    f.write(content)

print("Файл .env исправлен с правильной UTF-8 кодировкой")

