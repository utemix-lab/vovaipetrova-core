---
title: CONCEPT — Author Gateway
slug: concept-author-gateway
summary: >-
  Концепция Author Gateway: система управления очередью идей и автоматической генерации Stories через единую точку входа
tags:
  - Story
  - Автоматизация
  - Проектирование
machine_tags:
  - content/story
  - theme/automation
  - theme/design
status: ready
---

# CONCEPT — Author Gateway

## TL;DR

- **Author Gateway** — единая точка входа для управления очередью идей и генерации Stories
- Три режима работы: `auto` (автоматическая генерация и PR), `hitl` (human-in-the-loop, остановка для ревью), `human-first` (создание пустого stub)
- Очередь идей хранится в `tmp/ideas.json`, поддерживает статусы `pending`, `approved`, `rejected`
- Gateway передаёт approved идеи в `generate-stories.mjs` через переменную окружения `GATEWAY_IDEA_PATH`
- Интеграция с Notion через `notion-report.mjs` для автоматической отправки отчётов о генерации

## Философия Author Gateway

### Зачем нужен Author Gateway

1. **Единая точка входа**: вместо множества скриптов и ручных вызовов — один интерфейс для всех сценариев генерации Stories
2. **Управление очередью**: централизованное хранение и обработка идей для Stories, поддержка workflow approval/rejection
3. **Гибкость режимов**: поддержка автоматической генерации, human-in-the-loop и ручного создания
4. **Интеграция с Notion**: автоматическая отправка отчётов о генерации в Notion для синхронизации статусов

### Принципы

- **Модульность**: Gateway не генерирует контент, а делегирует это `generate-stories.mjs`
- **Очередь идей**: идеи хранятся в JSON-файле с поддержкой статусов и метаданных
- **Best-effort интеграции**: интеграция с Notion не блокирует генерацию при ошибках
- **Режимы работы**: три режима покрывают все сценарии использования

## Спецификация

### Режимы работы

#### 1. Auto mode (`--mode=auto`)

**Назначение**: Полностью автоматическая генерация Stories с созданием PR.

**Процесс**:
1. Проверяет очередь `tmp/ideas.json` на наличие approved идей
2. Если есть approved идея — извлекает её и передаёт в `generate-stories.mjs` через `GATEWAY_IDEA_PATH`
3. Запускает `generate-stories.mjs` для генерации эпизода
4. Читает метаданные из `tmp/story-meta.json`
5. Отправляет отчёт в Notion через `notion-report.mjs` (если указан `--page-id` или `NOTION_COPILOT_REPORTS_PAGE_ID`)
6. Создаёт PR с меткой `auto:story` (через workflow или вручную)

**Использование**:
```bash
node scripts/author-gateway.mjs --mode=auto
node scripts/author-gateway.mjs --mode=auto --page-id=<notion-page-id>
```

#### 2. HITL mode (`--mode=hitl`)

**Назначение**: Human-in-the-loop — генерация с остановкой для ручного ревью.

**Процесс**:
1. Проверяет очередь на наличие approved идей
2. Если есть approved идея — передаёт её в генератор
3. Запускает `generate-stories.mjs` для создания draft
4. Останавливается и ждёт ручного ревью
5. Пользователь проверяет draft в `docs/stories/` и создаёт PR вручную

**Использование**:
```bash
node scripts/author-gateway.mjs --mode=hitl
```

#### 3. Human-first mode (`--mode=human-first`)

**Назначение**: Создание пустого stub для ручного заполнения.

**Процесс**:
1. Создаёт файл в `docs/stories/` с базовым front matter из `templates/story.md`
2. Оставляет контент пустым для ручного заполнения
3. Не запускает генератор

**Использование**:
```bash
node scripts/author-gateway.mjs --mode=human-first
```

### Очередь идей (`tmp/ideas.json`)

**Формат**:
```json
[
  {
    "id": "idea-1234567890",
    "status": "approved",
    "title": "Название идеи",
    "seed_text": "Короткое описание идеи для генератора",
    "created_at": "2025-11-23T12:00:00.000Z",
    "author": "автор"
  }
]
```

**Статусы**:
- `pending` — идея ожидает одобрения
- `approved` — идея одобрена, готова к обработке
- `rejected` — идея отклонена

**Обработка**:
- Gateway извлекает первую approved идею из очереди
- После обработки идея удаляется из очереди
- Если approved идей нет — генератор работает без seed

### Интеграция с generate-stories.mjs

**Передача идеи**:
- Gateway создаёт временный JSON-файл с идеей
- Путь к файлу передаётся через переменную окружения `GATEWAY_IDEA_PATH`
- `generate-stories.mjs` читает идею и использует `seed_text` для генерации контента

**Метаданные**:
- После генерации `generate-stories.mjs` создаёт `tmp/story-meta.json`:
```json
{
  "created": true,
  "date": "2025-11-23",
  "file": "docs/stories/2025-11-23-slug.md",
  "filename": "2025-11-23-slug.md",
  "title": "Stories · Название",
  "sources": ["CHANGELOG.md", "prototype/data/stats.json"]
}
```

### Интеграция с Notion

**Отправка отчёта**:
- Gateway формирует payload для `notion-report.mjs`:
```json
{
  "title": "Author Gateway: 2025-11-23-slug.md",
  "message": "Автогенерация через Author Gateway, файл: 2025-11-23-slug.md",
  "filename": "2025-11-23-slug.md",
  "sources": ["CHANGELOG.md"],
  "timestamp": "2025-11-23T12:00:00.000Z",
  "executor": "author-gateway"
}
```

- Отчёт отправляется в Notion через `notion-report.mjs --file <path> --page-id <id>`
- Ошибки отправки не блокируют генерацию (best-effort)

## Workflow использования

### Сценарий 1: Автоматическая генерация с идеей

1. Добавить approved идею в `tmp/ideas.json`:
```json
[
  {
    "id": "idea-123",
    "status": "approved",
    "title": "Новая идея",
    "seed_text": "Описание идеи",
    "created_at": "2025-11-23T12:00:00.000Z",
    "author": "автор"
  }
]
```

2. Запустить Gateway в auto mode:
```bash
node scripts/author-gateway.mjs --mode=auto
```

3. Gateway извлечёт идею, передаст в генератор, создаст эпизод и отправит отчёт в Notion

### Сценарий 2: Human-in-the-loop с seed

1. Добавить approved идею в очередь
2. Запустить Gateway в HITL mode:
```bash
node scripts/author-gateway.mjs --mode=hitl
```

3. Проверить сгенерированный draft в `docs/stories/`
4. Создать PR вручную после ревью

### Сценарий 3: Ручное создание stub

1. Запустить Gateway в human-first mode:
```bash
node scripts/author-gateway.mjs --mode=human-first
```

2. Заполнить stub вручную в `docs/stories/`

## Структура файлов

```
scripts/
  author-gateway.mjs          # Главный скрипт Gateway
  generate-stories.mjs        # Генератор Stories (вызывается Gateway)
  notion-report.mjs           # Отправка отчётов в Notion
  poc/
    gateway-poc-hitl.mjs      # PoC для HITL режима
    gateway-poc-auto.mjs      # PoC для auto режима

tmp/
  ideas.json                  # Очередь идей
  story-meta.json             # Метаданные сгенерированного эпизода
  idea-<timestamp>.json       # Временный файл с идеей для генератора
  author-gateway-report.json  # Payload для Notion

docs/
  stories/                    # Сгенерированные эпизоды
  CONCEPT.author-gateway.md   # Этот документ

templates/
  story.md                    # Шаблон front matter для Stories
```

## Правила работы

### Safety Rails

- ✅ Gateway не изменяет существующие файлы Stories
- ✅ Gateway проверяет наличие эпизода за день перед генерацией
- ✅ Ошибки интеграции с Notion не блокируют генерацию
- ✅ Gateway создаёт директории автоматически (`mkdirSync` с `recursive: true`)
- ❌ Gateway не должен напрямую генерировать контент (делегирует `generate-stories.mjs`)

### QA-ворота

Перед использованием Gateway:
1. ✅ Проверить наличие `tmp/ideas.json` (если используется очередь)
2. ✅ Убедиться, что `generate-stories.mjs` доступен и работает
3. ✅ Проверить доступ к Notion API (если используется интеграция)
4. ✅ Убедиться, что `docs/stories/` существует и доступен для записи

## Интеграция в проект

### CI/CD

Gateway может быть интегрирован в GitHub Actions workflow:
- Ежедневный запуск в auto mode для автоматической генерации
- Запуск по событию (например, при merge PR) для генерации на основе изменений
- Запуск в HITL mode для ручного ревью перед PR

### Notion Briefs

Gateway может быть вызван из Notion Briefs через workflow:
- Создание задачи в Briefs → добавление идеи в очередь → запуск Gateway
- Обновление статуса задачи в Notion после генерации через `notion-report.mjs`

## Связанные документы

- [CONCEPT.stories-dual.md](./stories/CONCEPT.stories-dual.md) — формат dual-story
- [CONCEPT.md](./stories/CONCEPT.md) — общая концепция Stories
- [JSON Schema для Story](../stories/models/story.schema.json) — схема для валидации front matter
- [JSON Schema для Gateway Payload](../stories/models/gateway-payload.schema.json) — схема для валидации payload

