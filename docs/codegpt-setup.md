---
title: Настройка CodeGPT для работы с Notion и GitHub
slug: codegpt-setup
summary: Инструкция по настройке CodeGPT для интеграции с Notion и GitHub через API
status: draft
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - theme/automation
  - theme/dev
---

# Настройка CodeGPT для работы с Notion и GitHub

## Обзор

CodeGPT — расширение VS Code/Cursor для работы с AI-ассистентами. Эта инструкция описывает настройку CodeGPT для работы с Notion и GitHub через их API, аналогично тому, как работают MCP серверы.

## Предварительные требования

1. **CodeGPT расширение** установлено в VS Code/Cursor
2. **Node.js** версии 18+ установлен
3. **API ключи** для GitHub и Notion

## Шаг 1: Получение API ключей

### GitHub Token

1. Перейдите в [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Нажмите "Generate new token (classic)"
3. Выберите права:
   - `repo` (полный доступ к репозиториям)
   - `workflow` (для работы с GitHub Actions)
4. Скопируйте токен (начинается с `ghp_`)

### Notion API Key

1. Перейдите в [Notion Integrations](https://www.notion.so/my-integrations)
2. Нажмите "+ New integration"
3. Выберите "Internal Integration"
4. Задайте название (например, "CodeGPT Integration")
5. Скопируйте "Internal Integration Token" (начинается с `secret_`)
6. **Важно**: Предоставьте интеграции доступ к нужным страницам/базам данных в Notion

## Шаг 2: Настройка переменных окружения

**Важно**: Файлы с настройками (`.env`, `codegpt.config.json`, `vscode-settings.example.json`) не включены в репозиторий и остаются только на вашем ПК для безопасности.

1. Создайте файл `.env` в корне проекта:
   ```bash
   # Windows PowerShell
   New-Item -Path .env -ItemType File
   ```

2. Добавьте в `.env` следующие переменные:
   ```env
   GITHUB_TOKEN=ghp_ваш_токен
   NOTION_API_KEY=secret_ваш_ключ
   GITHUB_REPO=utemix-lab/vovaipetrova-core
   ```

3. **Безопасность**: `.env` в `.gitignore`, токены не попадут в репозиторий

## Шаг 3: Настройка CodeGPT

### Вариант A: OpenRouter (рекомендуется для России)

1. Зарегистрируйтесь на [OpenRouter.ai](https://openrouter.ai)
2. Получите API ключ (начинается с `sk-or-v1-`)
3. В VS Code/Cursor откройте настройки (Ctrl+,)
4. Найдите "CodeGPT" в настройках
5. Установите:
   - **Provider**: `openrouter` (или выберите из списка)
   - **API Key**: ваш ключ OpenRouter
   - **Model**: `anthropic/claude-3.5-sonnet` (или другая модель)

### Вариант B: Локальный Ollama (бесплатно, без API)

1. Установите [Ollama](https://ollama.ai)
2. Скачайте модель:
   ```bash
   ollama pull codellama
   # или
   ollama pull mistral
   ```
3. В настройках CodeGPT:
   - **Provider**: `ollama`
   - **Base URL**: `http://localhost:11434`
   - **Model**: `codellama` (или другая установленная модель)

### Вариант C: Использование файла настроек

**Примечание**: `vscode-settings.example.json` не включен в репозиторий. Создайте файл `.vscode/settings.json` локально (создайте папку `.vscode/`, если нужно) и заполните значения:

```json
{
  "codegpt.apiKey": "ваш_ключ",
  "codegpt.model": "anthropic/claude-3.5-sonnet",
  "codegpt.provider": "openrouter"
}
```

## Шаг 4: Проверка работы

### Проверка GitHub API

```bash
node scripts/codegpt/github-api.mjs list-prs
```

Должен вернуть список открытых PR.

### Проверка Notion API

```bash
node scripts/codegpt/notion-search.mjs "test"
```

Должен вернуть результаты поиска в Notion.

## Использование скриптов

### GitHub операции

```bash
# Создать PR
node scripts/codegpt/github-create-pr.mjs "Заголовок" "Описание" "branch-name"

# Получить список PR
node scripts/codegpt/github-api.mjs list-prs

# Получить информацию о PR
node scripts/codegpt/github-api.mjs get-pr 123
```

### Notion операции

```bash
# Поиск страниц
node scripts/codegpt/notion-search.mjs "запрос"

# Получить страницу
node scripts/codegpt/notion-fetch.mjs <page-id>

# Обновить страницу
node scripts/codegpt/notion-update.mjs <page-id> '{"Status":{"select":{"name":"Done"}}}'
```

## Использование в CodeGPT

После настройки вы можете использовать скрипты в диалогах с CodeGPT:

```
Создай PR с заголовком "Новая функция" и описанием "Добавлена поддержка X"
```

CodeGPT сможет вызвать соответствующий скрипт через терминал.

## Структура файлов

```
.
├── .env                    # Ваши API ключи (не в git)
├── .env.example           # Пример конфигурации
├── codegpt.config.json     # Конфигурация CodeGPT
├── .vscode/
│   └── settings.json.example  # Пример настроек VS Code
└── scripts/
    └── codegpt/
        ├── github-api.mjs      # Базовые функции GitHub API
        ├── notion-api.mjs      # Базовые функции Notion API
        ├── github-create-pr.mjs
        ├── notion-search.mjs
        ├── notion-fetch.mjs
        └── notion-update.mjs
```

## Troubleshooting

### Ошибка "GITHUB_TOKEN не установлен"

- Проверьте, что `.env` существует и содержит `GITHUB_TOKEN=...`
- Убедитесь, что токен начинается с `ghp_`

### Ошибка "Notion API error: 401"

- Проверьте правильность `NOTION_API_KEY`
- Убедитесь, что интеграция имеет доступ к нужным страницам в Notion

### CodeGPT не видит скрипты

- Убедитесь, что Node.js установлен и доступен в PATH
- Проверьте права на выполнение файлов

## Дополнительные ресурсы

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Notion API Documentation](https://developers.notion.com)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Ollama Documentation](https://ollama.ai/docs)

