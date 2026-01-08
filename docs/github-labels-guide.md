---
title: GitHub Labels — Руководство по использованию
slug: github-labels-guide
summary: >-
  Руководство по использованию GitHub labels для организации работы и
  автоматической проверки
tags:
  - Автоматизация
machine_tags:
  - theme/automation
status: ready
---

# GitHub Labels — Руководство по использованию

## Обзор

GitHub labels используются для организации работы, автоматической проверки политики "один PR на lane" и отслеживания последовательных задач.

## Lane Labels

Lane labels определяют дорожку разработки и используются для автоматической проверки конфликтов между PR.

### Standard Lanes

- `lane:docs` — работа с документацией (`docs/*`)
- `lane:infra` — инфраструктура (`chore/*`, workflows, scripts)
- `lane:stories` — эпизоды Stories (`docs/stories/**`)
- `lane:characters` — работа с персонажами и контентом
- `lane:qa` — проверки качества, линтинг, тесты
- `lane:refactor` — рефакторинг кода и структуры
- `lane:fix` — исправления и багфиксы
- `lane:feat` — новые возможности
- `lane:composer` — задачи, выполняемые через Composer (изолированная дорожка)

### CodeGPT Lanes

- `lane:codegpt:orchestrator` — задачи для CodeGPT Orchestrator
- `lane:codegpt:docs` — задачи для CodeGPT Docs Agent
- `lane:codegpt:refactor` — задачи для CodeGPT Refactor Agent
- `lane:codegpt:creative` — задачи для CodeGPT Creative Agent

### Copilot Lanes

- `lane:copilot` — задачи GitHub Copilot (общие)
- `lane:copilot:docs` — задачи Copilot по документации
- `lane:copilot:infra` — задачи Copilot по инфраструктуре
- `lane:copilot:stories` — задачи Copilot по Stories
- `lane:copilot:refactor` — задачи Copilot по рефакторингу
- `lane:copilot:feat` — задачи Copilot по новым возможностям
- `lane:copilot:fix` — задачи Copilot по исправлениям

## Sequence Labels

Sequence labels используются для маркировки задач, которые являются частью последовательности и должны выполняться в определённом порядке.

- `seq:1`, `seq:2`, `seq:3`, ..., `seq:15` — шаги последовательности (до 15 шагов)

**Использование:**
- Комбинируются с lane labels (например, `lane:copilot:docs` + `seq:1`)
- Помогают отслеживать порядок выполнения связанных задач
- Используются для задач, которые зависят друг от друга

**Пример:**
- PR #1: `lane:copilot:docs` + `seq:1` — создание документации
- PR #2: `lane:copilot:docs` + `seq:2` — обновление шаблонов
- PR #3: `lane:copilot:docs` + `seq:3` — финальная проверка

## Status Labels

- `auto:ready-for-review` — автоматически созданный PR готов к ревью
- `auto:needs-fixes` — автоматически созданный PR требует исправлений
- `auto:story` — автоматически созданный эпизод Stories
- `urgent` — срочная задача (SLA: 12 часов)
- `content/story` — контент эпизода Stories

## Маппинг веток → Labels

### Стандартные ветки

- `chore/*` → `lane:infra` (или `lane:copilot:infra` для Copilot)
- `feat/*` → `lane:feat` (или `lane:copilot:feat` для Copilot)
- `fix/*` → `lane:fix` (или `lane:copilot:fix` для Copilot)
- `docs/*` → `lane:docs` (или `lane:copilot:docs` для Copilot)
- `refactor/*` → `lane:refactor` (или `lane:copilot:refactor` для Copilot)
- `composer/*` → `lane:composer`
- `codegpt/*` → `lane:codegpt:*` (определяется по типу агента)
- `copilot/*` → `lane:copilot:*` (определяется по типу задачи)
- `notion-sync/*` → обычно без label (автоматика)

### Примеры

**Для Copilot:**
- `copilot/docs-update-templates` → `lane:copilot:docs`
- `copilot/infra-add-mcp-server` → `lane:copilot:infra`
- `copilot/stories-concept-guide` → `lane:copilot:stories`

**Для CodeGPT:**
- `codegpt/orchestrator-setup` → `lane:codegpt:orchestrator`
- `codegpt/docs-normalize` → `lane:codegpt:docs`

**Для стандартных задач:**
- `docs/add-guide` → `lane:docs`
- `chore/update-workflows` → `lane:infra`
- `feat/new-feature` → `lane:feat`

## Правила использования

### Один PR на lane

- Каждая lane может иметь только один активный PR в любой момент времени
- CI автоматически проверяет наличие других открытых PR с тем же `lane:*` label
- При конфликте PR блокируется до закрытия предыдущего PR в той же lane

### Исключения

- Ветки `notion-sync/*` автоматически пропускают проверку lanes
- Задачи Composer (`lane:composer`) изолированы — только один активный PR на этой lane

### Sequence labels

- Можно использовать несколько sequence labels для разных последовательностей
- Например: `lane:copilot:docs` + `seq:1` и `lane:copilot:infra` + `seq:1` — разные последовательности
- Sequence labels помогают отслеживать порядок, но не блокируют параллельную работу в разных lanes

## Создание labels

### Автоматическое создание

Используйте скрипт для создания всех labels:

```bash
npm run labels:create
```

Или напрямую:

```bash
node scripts/create-github-labels.mjs
```

### Требования

- `GITHUB_TOKEN` в `.env` или переменных окружения
- `GITHUB_REPO` (по умолчанию: `utemix-lab/vovaipetrova-core`)
- Установленный `gh` CLI (GitHub CLI)

### Проверка labels

После создания labels проверьте их в GitHub:
- Settings → Labels → должны быть все созданные labels

## Использование в PR

### При создании PR

1. Выберите соответствующий `lane:*` label на основе типа ветки
2. Если задача часть последовательности, добавьте `seq:*` label
3. Если задача срочная, добавьте `urgent` label

### В шаблоне PR

Шаблон PR автоматически включает секцию для выбора lane label:

```markdown
**Lane Label**: {Выберите соответствующий label}

**Standard lanes**: `lane:docs`, `lane:infra`, `lane:stories`, ...
**CodeGPT lanes**: `lane:codegpt:orchestrator`, `lane:codegpt:docs`, ...
**Copilot lanes**: `lane:copilot`, `lane:copilot:docs`, `lane:copilot:infra`, ...

**Sequence Label**: {Если задача часть последовательности, добавьте `seq:1`, `seq:2`, и т.д.}
```

## Использование в Issues

### При создании Issue

1. Выберите соответствующий `lane:*` label
2. Если задача часть последовательности, добавьте `seq:*` label
3. Укажите Executor (GitHub Copilot, CodeGPT, Cursor, Manual)

### В шаблоне Issue

Шаблон Issue включает секции для выбора lane и sequence labels.

## Troubleshooting

### Label не создаётся

1. Проверьте `GITHUB_TOKEN` в `.env`
2. Проверьте права токена (должен иметь доступ к репозиторию)
3. Проверьте установку `gh` CLI: `gh --version`

### PR блокируется из-за lane конфликта

1. Проверьте, есть ли другие открытые PR с тем же `lane:*` label
2. Закройте или смерджите предыдущий PR в той же lane
3. Или используйте другую lane, если задача может быть выполнена в другой категории

### Не понимаю, какой label использовать

**Правило:**
- Если задача для Copilot → используйте `lane:copilot:*`
- Если задача для CodeGPT → используйте `lane:codegpt:*`
- Если задача стандартная → используйте стандартные `lane:*`
- Если задача часть последовательности → добавьте `seq:*`

## Связанные документы

- [Single Source Playbook — «священный документ» (Notion↔Repo)](SINGLE-SOURCE-PLAYBOOK.md) — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов (включая Lanes Policy)

