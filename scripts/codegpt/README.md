# CodeGPT Integration Scripts

Скрипты для интеграции CodeGPT с Notion и GitHub через их API.

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и заполните API ключи
2. Установите зависимости (если нужны): `npm install`
3. Используйте скрипты напрямую или через CodeGPT

## Доступные скрипты

### GitHub API

- `github-api.mjs` — базовые функции GitHub API
- `github-create-pr.mjs` — создание Pull Request

### Notion API

- `notion-api.mjs` — базовые функции Notion API
- `notion-search.mjs` — поиск страниц в Notion
- `notion-fetch.mjs` — получение страницы по ID
- `notion-update.mjs` — обновление страницы

## Примеры использования

### Создать PR

```bash
node scripts/codegpt/github-create-pr.mjs \
  "chore: обновление статусов stories" \
  "Обновлены статусы эпизодов 007, 008, 009, 011 на ready" \
  "chore/stories-v0.5"
```

### Поиск в Notion

```bash
node scripts/codegpt/notion-search.mjs "Stories v0.5"
```

### Получить страницу Notion

```bash
node scripts/codegpt/notion-fetch.mjs abc123def456
```

### Обновить статус в Notion

```bash
node scripts/codegpt/notion-update.mjs abc123def456 \
  '{"Status":{"select":{"name":"Done"}}}'
```

## Переменные окружения

Все скрипты используют переменные из `.env`:

- `GITHUB_TOKEN` — токен GitHub API
- `NOTION_API_KEY` — ключ Notion API
- `GITHUB_REPO` — репозиторий (owner/repo)

## Документация

Полная инструкция по настройке: [`docs/codegpt-setup.md`](../../docs/codegpt-setup.md)

