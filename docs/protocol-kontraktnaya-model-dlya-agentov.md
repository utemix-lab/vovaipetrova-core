---
title: Protocol — Контрактная модель для агентов
slug: protocol-kontraktnaya-model-dlya-agentov
summary: '# Protocol — Контрактная модель для агентов'
tags: []
machine_tags: []
status: ready
---
# Protocol — Контрактная модель для агентов

Контрактная модель определяет правила взаимодействия агентов с репозиторием, входные/выходные данные, запреты и QA-ворота.

## Вход агента

### Источник задачи
- **Notion Briefs**: карточка в статусе `Ready` с полями `Brief`, `Scope`, `Deliverables`, `Executor`, `Lane`, `SLA`, `Requires Review`, `RFC Link`, `Upstream Source`
- **GitHub Issues**: опционально, для трекинга и связи с PR

#### Структура карточки Briefs

**Обязательные поля:**
- `Title` — название задачи
- `Brief` — описание цели и требований
- `Scope` — область изменений
- `Deliverables` — список ожидаемых результатов
- `Status` — статус задачи (`Ready`, `In Progress`, `Review`, `Done`, `Blocked`)
- `Assignee` — исполнитель (агент или человек)

**Новые поля (Briefs upgrade):**
- `Executor` — исполнитель задачи:
  - `Cursor` — задачи для Cursor AI
  - `CodeGPT:Orchestrator` — задачи для CodeGPT Orchestrator
  - `CodeGPT:Docs` — задачи для CodeGPT Docs Agent
  - `CodeGPT:Refactor` — задачи для CodeGPT Refactor Agent
  - `CodeGPT:Creative` — задачи для CodeGPT Creative Agent
  - `Manual` — ручные задачи
- `Lane` — дорожка разработки:
  - `Infra` — инфраструктура
  - `Docs` — документация
  - `IA` — информационная архитектура
  - `Content` — контент
  - `Stories` — эпизоды Stories
  - `Characters` — персонажи
  - `QA` — проверки качества
- `SLA` — дата и время, до которого должно быть завершено ревью PR
- `Requires Review` — требуется ли ручное ревью для этой задачи
- `RFC Link` — ссылка на RFC, связанный с этой задачей
- `Upstream Source` — источник задачи:
  - `Ideas & Proposals` — из идей и предложений
  - `RFC` — из RFC
  - `Incident` — из инцидента
  - `Metrics` — из метрик
- `Overdue` — формула, показывающая, просрочена ли задача (Yes/No)

**Представления Briefs:**
- `Ready for CodeGPT` — задачи со статусом `Ready` и `Executor`, начинающимся с `CodeGPT:`
- `Pending Review` — задачи со статусом `Review` и `Requires Review = Yes`
- `Overdue` — задачи с `Overdue = Yes`
- `By Lane` — доска задач, сгруппированная по `Lane`

**Подробнее:** см. [Briefs upgrade — инструкция по обновлению](./briefs-upgrade-how-to.md)

### Контекст проекта
- `/.codegpt/context.md` — общий контекст (источник истины, ветви, линтеры, CI, lanes)
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — этот документ (правила работы)
- `docs/state-snapshot-current-state.md` — текущее состояние проекта и Ops-log (журнал операционных событий)
- `CONTRIBUTING.md` — процесс работы с репозиторием
- `README.md` — структура и команды
- `.cache/context-snapshot.json` — снапшот контекста и словарей (генерируется через `npm run cache:warmup`)
- `.cache/quick-reference.json` — быстрые справки по тегам, маршрутам, link-map (для ускорения первых ответов)

## Выход агента

### Обязательные артефакты
1. **Ветка**: `{type}/{short-description}` (например, `chore/stories-pause-note`)
2. **Коммиты**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
3. **Pull Request**: с описанием изменений на **русском языке**, ссылкой на задачу в Briefs и секцией Deliverables
4. **Deliverables**: соответствие списку из Briefs, оформленное по стандартному шаблону

**Важно**: Описание PR должно быть на **русском языке**. Это правило проекта для единообразия и удобства команды. Заголовок PR может быть на английском (для совместимости с инструментами), но описание (body) — обязательно на русском.

### Формат Deliverables в PR

Каждый PR должен содержать секцию `## Deliverables` со следующей структурой:

```markdown
## Deliverables

**Executor**: {Имя агента или исполнителя, например: GitHub Copilot, CodeGPT Docs Agent, Cursor}  
**Status**: ✅ Completed | ⏳ In Progress | ❌ Blocked  
**Task**: {Ссылка на задачу в Notion Briefs или Issue}

**Two-stream Sync Status**:
- [ ] Статус в Notion обновлён на `In Progress` (при создании ветки)
- [ ] Статус в Notion обновлён на `Review` (при создании PR)
- [ ] Статус в Notion будет обновлён на `Done` (после мерджа)
- [ ] Задача не из Notion (только GitHub Issue) — синхронизация не требуется

### Completed
- [x] {Пункт 1 из списка Deliverables}
- [x] {Пункт 2 из списка Deliverables}

### Changes
- {Описание изменений 1}
- {Описание изменений 2}

### Files Changed
- `path/to/file1.md` — {описание изменений}
- `path/to/file2.js` — {описание изменений}

### PRs Created
- #{номер} — {название PR} (если создавались связанные PR)

### Metrics
- {Метрика 1, если применимо}
- {Метрика 2, если применимо}

### Problems Encountered
- {Проблема 1, если была}
- {Проблема 2, если была}

### Proposals
- {Предложение по улучшению, если есть}

### Two-stream Notes
{Если работа связана с Notion, укажите:}
- **Notion Page ID**: {ID страницы задачи в Notion, если применимо}
- **Sync Method**: {MCP / Scripts / Manual}
- **Status Updated**: {Да/Нет — обновлён ли статус в Notion}
- **Issues**: {Проблемы с синхронизацией, если были}
```

**Обязательные поля**: Executor, Status, Task, Completed, Two-stream Sync Status  
**Опциональные поля**: Changes, Files Changed, PRs Created, Metrics, Problems Encountered, Proposals, Two-stream Notes

### Формат коммитов
```
{type}: {краткое описание}

- Деталь 1
- Деталь 2
- Деталь 3
```

Типы: `feat`, `fix`, `chore`, `docs`, `refactor`

## Safety Rails (Безопасные рамки)

Safety Rails определяют жёсткие ограничения для предотвращения ошибок и защиты критических данных.

### Запрещённые пути

**Абсолютно запрещено изменять** (даже если указано в Brief):
- `notion-brain/**` — источник истины, Vision, ADR, Specs
- `.env`, `.env.*` — секреты и конфигурация окружения
- `node_modules/`, `vendor/` — зависимости
- `.git/` — метаданные Git

**Запрещено без явного указания в Brief**:
- `scripts/**` — утилиты и скрипты (требуется явное разрешение)
- `.github/workflows/**` — CI/CD workflows (требуется явное разрешение)
- `package.json`, `package-lock.json` — зависимости (требуется явное разрешение)
- `README.md`, `.gitignore` — корневые файлы (требуется явное разрешение)

**Разрешённые зоны записи** (по умолчанию):
- `docs/**` — документация и контент
- `prototype/**` — UI прототип
- `templates/**` — шаблоны файлов

### Защита приватных данных

**PII (Personally Identifiable Information)**:
- ❌ Пути пользователей (`C:\Users\...`, `/home/...`)
- ❌ Имена реальных людей (кроме публичных персонажей проекта)
- ❌ Email адреса (кроме публичных контактов)
- ❌ Телефонные номера
- ❌ Физические адреса

**Проверка PII**:
- Для Stories: `npm run pii:scan` — обязательная проверка перед PR
- Для остального контента: рекомендуется, но не блокирует PR
- Автоматическая проверка в CI для Stories (`docs/stories/**`)

**Стиль правок**:
- ❌ Не использовать первое лицо в Stories (`я`, `мы` разрешены, но не личные имена)
- ✅ Использовать анонимные плейсхолдеры: `[Имя]`, `[Email]`, `[Путь]`
- ✅ Для примеров использовать вымышленные данные

### Структурные запреты

- ❌ Не создавать файлы без front matter (title, slug, summary обязательны)
- ❌ Не удалять файлы с `notion_page_id` без `git mv` (см. `check-import-safety.mjs`)
- ❌ Не менять slug существующих файлов без миграции (стабильность маршрутов)
- ❌ Не создавать файлы вне разрешённых зон без согласования

### Процессные запреты

- ❌ Не мерджить PR без зелёного CI (`Docs CI` должен быть успешным)
- ❌ Не создавать несколько PR из одной ветки (см. Lanes policy)
- ❌ Не коммитить напрямую в `main` (только через PR)
- ❌ Не пропускать проверки перед PR (normalize, lint, size, lanes)

## QA-ворота

### Перед созданием PR
1. ✅ Запустить `npm run normalize:dry` — проверить изменения
2. ✅ Запустить `npm run lint:docs` — проверить качество контента
3. ✅ Запустить `npm run check:pr-size` — проверить размер PR
4. ✅ Запустить `npm run check:lanes` — проверить соответствие Lanes policy
5. ✅ Проверить соответствие Deliverables из Briefs
6. ✅ Убедиться, что ветка соответствует Lanes policy (один PR на lane)

### В PR
1. ✅ Описание изменений соответствует Brief
2. ✅ Ссылка на задачу в Notion Briefs (если есть)
3. ✅ CI зелёный (`Docs CI` должен пройти)

### После мерджа
1. ✅ Обновить статус задачи в Notion Briefs (если доступен API)
2. ✅ Удалить ветку (если не `notion-sync/*`)

## Lanes Policy

**Один PR на lane** — правило предотвращает конфликты и упрощает ревью.

### Lanes (типы веток)
- `chore/*` — инфраструктура, документация, процессы
- `feat/*` — новые возможности, разделы
- `fix/*` — исправления, багфиксы
- `docs/*` — текстовые правки без изменения логики
- `refactor/*` — структурные изменения без фич
- `notion-sync/*` — импорт из Notion (автоматика)

### Lane Labels (для группировки и проверки)

Для автоматической проверки политики "один PR на lane" используются GitHub labels формата `lane:*`:

**Standard lanes:**
- `lane:docs` — работа с документацией (`docs/*`, `docs/**`)
- `lane:infra` — инфраструктура (`chore/*`, workflows, scripts)
- `lane:stories` — эпизоды Stories (`docs/stories/**`)
- `lane:characters` — работа с персонажами и контентом
- `lane:qa` — проверки качества, линтинг, тесты
- `lane:refactor` — рефакторинг кода и структуры
- `lane:fix` — исправления и багфиксы
- `lane:feat` — новые возможности
- `lane:composer` — задачи, выполняемые через Composer (изолированная дорожка)

**CodeGPT lanes:**
- `lane:codegpt:orchestrator` — задачи для CodeGPT Orchestrator
- `lane:codegpt:docs` — задачи для CodeGPT Docs Agent
- `lane:codegpt:refactor` — задачи для CodeGPT Refactor Agent
- `lane:codegpt:creative` — задачи для CodeGPT Creative Agent

**Copilot lanes:**
- `lane:copilot` — задачи GitHub Copilot (общие)
- `lane:copilot:docs` — задачи Copilot по документации
- `lane:copilot:infra` — задачи Copilot по инфраструктуре
- `lane:copilot:stories` — задачи Copilot по Stories
- `lane:copilot:refactor` — задачи Copilot по рефакторингу
- `lane:copilot:feat` — задачи Copilot по новым возможностям
- `lane:copilot:fix` — задачи Copilot по исправлениям

**Маппинг префиксов веток → labels:**
- `chore/*` → `lane:infra` (или `lane:copilot:infra` для Copilot)
- `feat/*` → `lane:feat` (или `lane:copilot:feat` для Copilot)
- `fix/*` → `lane:fix` (или `lane:copilot:fix` для Copilot)
- `docs/*` → `lane:docs` (или `lane:copilot:docs` для Copilot)
- `refactor/*` → `lane:refactor` (или `lane:copilot:refactor` для Copilot)
- `composer/*` → `lane:composer` (задачи Composer)
- `codegpt/*` → `lane:codegpt:*` (задачи CodeGPT агентов, определяется по типу агента)
- `copilot/*` → `lane:copilot:*` (задачи Copilot, определяется по типу задачи)
- `notion-sync/*` → обычно без label (автоматика)

**Sequence labels (`seq:*`):**
- Используются для маркировки задач, которые являются частью последовательности
- Формат: `seq:1`, `seq:2`, `seq:3`, ..., `seq:15` (до 15 шагов)
- Помогают отслеживать порядок выполнения связанных задач
- Можно комбинировать с lane labels (например, `lane:copilot:docs` + `seq:1`)
- Используются для задач, которые должны выполняться в определённом порядке

### Правила
- Одна ветка = один PR = одна задача из Briefs
- Если нужно сделать несколько связанных изменений — объединить в одну задачу или создать последовательные PR
- После мерджа PR ветку можно удалить (кроме `notion-sync/*`)
- **При создании PR добавляйте соответствующий label `lane:*`** для автоматической проверки конфликтов
- CI автоматически проверяет наличие других открытых PR с тем же `lane:*` label и **блокирует PR при конфликтах**
- Ветки `notion-sync/*` автоматически пропускают проверку lanes
- **Задачи Composer (`lane:composer`) изолированы** — только один активный PR на этой lane в любой момент времени

### Guardrails v2: Size Guard, PII-scrub, Forbidden-paths

CI автоматически проверяет размер PR, наличие PII и запрещённые пути:

**Size Guard с порогами по типам задач:**
- **Composer задачи**: 20 файлов, 500 добавлений, 200 удалений
- **CodeGPT задачи**: 25 файлов, 800 добавлений, 300 удалений
- **Docs задачи**: 30 файлов, 1000 добавлений, 500 удалений
- **Scripts задачи**: 15 файлов, 800 добавлений, 300 удалений
- **Prototype задачи**: 25 файлов, 1200 добавлений, 600 удалений
- **По умолчанию**: 50 файлов, 2000 добавлений, 1000 удалений

**Поведение:**
- Превышение лимитов на 50%+ → ошибка (блокирует PR)
- Превышение лимитов менее 50% → предупреждение (не блокирует)

**PII-scrub (детекция персональных данных):**
- Пути пользователей (`C:\Users\...`, `/home/...`) → ошибка
- Пути пользователей с Documents/Desktop/Downloads → ошибка
- Email адреса → ошибка
- Телефонные номера → ошибка
- Компактные телефонные номера (10-15 цифр) → предупреждение (может быть ложным срабатыванием)
- Полные имена (русские и английские, только для stories) → предупреждение
- API ключи/секреты → ошибка
- GitHub токены (`ghp_...`) → ошибка
- Notion токены (`secret_...`, `ntn_...`) → ошибка
- AWS access keys (`AKIA...`) → ошибка
- Номера кредитных карт → ошибка
- IP адреса → предупреждение (может быть примером или версией)
- MAC адреса → предупреждение (может быть примером в документации)

**Forbidden-paths (запрещённые пути):**
- `.env`, `.env.*` → ошибка
- `codegpt.config.json`, `vscode-settings.example.json` → ошибка
- `.git/`, `node_modules/`, `vendor/` → ошибка
- `.cache/`, `.telemetry/`, `tmp/`, `temp/` → ошибка
- `.github/workflows/*.yml` (кроме `docs-ci.yml`) → ошибка
- `.github/PULL_REQUEST_TEMPLATE`, `.github/ISSUE_TEMPLATE` → ошибка
- `package-lock.json`, `composer.json`, `composer.lock`, `yarn.lock`, `pnpm-lock.yaml` → ошибка
- `README.md`, `CONTRIBUTING.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md` → ошибка
- `.gitignore`, `.gitattributes` → ошибка
- `docs/.import-map.yaml`, `scripts/codegpt/*.mjs` → ошибка
- `.codegpt/`, `notion-brain/` → ошибка
- `prototype/data/**`, `prototype/page/**` → ошибка (автогенерируемые файлы)
- `prototype/data/.build-cache.json` → ошибка (кэш сборки)
- `test-guardrails-v2/`, `lint.log`, `STRUCTURE-REPORT.md` → ошибка (тестовые/временные файлы)
- `package.json` → можно изменять (но проверяется через guardrails)
- `.github/pull_request_template.md` → можно обновлять
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` → можно обновлять

**Команды:**
- `npm run guardrails:v2` — проверка guardrails v2
- `npm run guardrails:v2:verbose` — подробный вывод
- `npm run check:pr-size` — проверка размера PR (legacy)
- `npm run check:lanes` — проверка lanes policy
- `npm run test:guardrails` — тестирование guardrails (эмуляция нарушений)
- `npm run test:security` — тестирование нарушений безопасности (PII, forbidden-paths)
- `npm run test:sandbox:forbidden-paths` — sandbox тест для forbidden-paths
- `npm run test:sandbox:codegpt-guardrails` — sandbox тест для CodeGPT guardrails

### Content Lint Thresholds

Линтер проверяет качество контента с настраиваемыми порогами:

**Пороги для summary:**
- Пустой summary → предупреждение (ошибка в строгом режиме `--strict`)
- Длина summary > 300 символов → предупреждение

**Пороги для контента:**
- Длина контента > 50,000 символов → предупреждение
- Длина контента > 100,000 символов → ошибка (блокирует)

**Проверки PII (персональные данные):**
- Пути пользователей (`C:\Users\...`, `/home/...`) → ошибка для stories, предупреждение для других
- Email адреса → ошибка для stories, предупреждение для других
- Телефонные номера → ошибка для stories, предупреждение для других
- API ключи/секреты → ошибка
- GitHub токены (`ghp_...`) → ошибка
- Notion токены (`secret_...`, `ntn_...`) → ошибка

**Команды:**
- `npm run lint:docs` — стандартная проверка (предупреждения не блокируют)
- `npm run lint:docs:strict` — строгая проверка (предупреждения блокируют)

### Очереди ревью и SLA

Для обеспечения предсказуемости процесса ревью и управления нагрузкой используются очереди ревью с фиксированными SLA.

#### Очереди ревью

**Composer Queue (`lane:composer`):**
- Изолированная очередь для задач, выполняемых через Composer
- Максимум **1 активный PR** в любой момент времени
- Приоритет: высокий (изоляция предотвращает конфликты)
- Статусы в Briefs: `Ready` → `In Progress` → `Review` → `Done`

**Стандартные очереди:**
- `lane:docs` — документация (до 3 активных PR)
- `lane:infra` — инфраструктура (до 2 активных PR)
- `lane:feat` — новые возможности (до 2 активных PR)
- `lane:fix` — исправления (до 3 активных PR)
- `lane:stories` — эпизоды Stories (до 2 активных PR)
- Остальные lanes: до 2 активных PR

#### SLA (Service Level Agreement)

**Время ревью:**
- **Composer PR**: до 24 часов с момента создания PR
- **Стандартные PR**: до 48 часов с момента создания PR
- **Срочные PR** (label `urgent`): до 12 часов

**Метрики:**
- Время от создания PR до первого комментария ревьюера
- Время от создания PR до мерджа
- Процент PR, закрытых в рамках SLA

**Эскалация:**
- Если PR не получил ревью в течение SLA + 50% времени → ping в комментариях
- Если PR заблокирован более 72 часов → автоматический комментарий с предложением разбить на меньшие PR

#### Представления Briefs для контроля сроков и ревью

Для быстрого контроля просроченных задач и очереди ревью используются специальные представления в базе данных Briefs:

**Overdue (просроченные задачи):**
- Показывает все задачи со статусом `Ready`, `In Progress` или `Review`, у которых `SLA` уже прошло
- Формула: `Status in [Ready, In Progress, Review] AND now() > SLA`
- Использование: ежедневная проверка просроченных задач, приоритизация работы
- Доступ: представление `Overdue` в Briefs

**Pending Review (ожидающие ревью):**
- Показывает все задачи со статусом `Review`, которые требуют ручного ревью (`Requires Review = Yes`)
- Фильтры: `Status = Review` AND `Requires Review = Checked`
- Использование: быстрый доступ к очереди ревью, контроль нагрузки на ревьюеров
- Доступ: представление `Pending Review` в Briefs

**By Lane (доска по дорожкам):**
- Группирует задачи по `Lane` (Infra, Docs, IA, Content, Stories, Characters, QA)
- Сортировка: по `SLA` (ascending) — сначала задачи с ближайшим сроком
- Использование: визуальный обзор задач по дорожкам, планирование работы
- Доступ: представление `By Lane` (Board) в Briefs

**Ready for CodeGPT:**
- Показывает задачи, готовые для выполнения через CodeGPT агентов
- Фильтры: `Status = Ready` AND `Executor` starts with `CodeGPT:`
- Использование: быстрый доступ к задачам для CodeGPT агентов
- Доступ: представление `Ready for CodeGPT` в Briefs

**Подробнее:** см. [Briefs upgrade — инструкция по обновлению](./briefs-upgrade-how-to.md) для настройки представлений и формулы Overdue.

#### Статусы в Briefs

Для отслеживания прогресса задач используются следующие статусы:

- `Ready` — задача готова к выполнению
- `In Progress` — задача выполняется (ветка создана, PR в работе)
- `Review` — PR создан, ожидает ревью
- `Done` — PR смерджен, задача завершена
- `Blocked` — задача заблокирована (требуется дополнительная информация или внешние зависимости)

**Маппинг статусов → этапы:**
- `Ready` → агент берёт задачу, создаёт ветку
- `In Progress` → агент работает над задачей
- `Review` → PR создан, CI проходит, ожидается ревью
- `Done` → PR смерджен, ветка удалена, deliverables обновлены

### Тестирование Guardrails

Для проверки корректности работы guardrails используется скрипт `scripts/test-guardrails.mjs`:

**Тесты:**
- `--test-lanes` — тестирование Lanes Policy (one-PR-per-lane)
- `--test-size` — тестирование Size Guard
- `--test-lint` — тестирование Lint Thresholds

**Пример использования:**
```bash
# Запустить все тесты
node scripts/test-guardrails.mjs

# Запустить только тест lanes
node scripts/test-guardrails.mjs --test-lanes

# Запустить тесты size и lint
node scripts/test-guardrails.mjs --test-size --test-lint
```

**Тестовые файлы с плохими примерами:**
- `test-guardrails/bad-examples/` — примеры нарушений для проверки линтера

## Telemetry: минимальные метрики для улучшения Composer

Система телеметрии собирает минимально необходимые метрики для улучшения работы Composer без приватных данных.

### Собираемые метрики

1. **Время выполнения шагов CI**:
   - Длительность каждого шага проверки
   - Общее время выполнения CI
   - Самые медленные шаги

2. **Размер диффа**:
   - Количество добавленных строк (`+`)
   - Количество удалённых строк (`-`)
   - Количество изменённых файлов
   - Базовая ветка для сравнения

3. **Причины фейлов**:
   - Тип проверки, которая упала (lint, eval harness, guardrails, lanes)
   - Шаг, на котором произошёл фейл
   - Временная метка фейла

### Использование

**Сбор метрик:**
```bash
# Собрать метрики диффа
npm run telemetry:collect -- --collect-diff

# Начать отслеживание шага
npm run telemetry:collect -- --step=lint-docs --start

# Завершить отслеживание шага
npm run telemetry:collect -- --step=lint-docs --end

# Зафиксировать фейл
npm run telemetry:collect -- --step=lint-docs --fail="YAML parsing error"
```

**Генерация отчёта:**
```bash
npm run telemetry:report
```

Отчёт сохраняется в `tests/composer/results/telemetry-report.md` и включает:
- Сводку по времени выполнения
- Анализ фейлов
- Метрики диффа
- Рекомендации по оптимизации

### Интеграция в CI

Телеметрия автоматически интегрирована в `.github/workflows/docs-ci.yml`:
- Сбор метрик диффа после всех проверок
- Генерация сводного отчёта
- Сохранение артефактов в CI (доступны 30 дней)

**Артефакты CI:**
- `.telemetry/metrics.json` — собранные метрики
- `.telemetry/step-timings.json` — тайминги шагов
- `tests/composer/results/telemetry-report.md` — сводный отчёт

### Приватность

Телеметрия **не собирает**:
- Содержимое файлов
- Имена пользователей или email
- Токены или секреты
- Пути к файлам вне репозитория
- Любые приватные данные

Собираются только агрегированные метрики: время выполнения, размер изменений, типы ошибок.

### Анализ метрик

Метрики помогают:
- Выявить узкие места в CI (медленные шаги)
- Оптимизировать время выполнения проверок
- Понять частые причины фейлов
- Контролировать размер PR (рекомендации по разбиению больших изменений)

## Адаптеры файловых операций

Для обеспечения надёжных изменений в `docs/` и `prototype/` через минимальные диффы используются адаптеры файловых операций.

### Допустимые операции

**Типы операций:**
- `read` — чтение файла (без ограничений по путям)
- `write` — создание нового файла
- `update` — полная замена содержимого файла
- `patch` — частичное изменение (append, prepend, replace section)

**Разрешённые зоны записи:**
- `docs/**` — документация и контент
- `prototype/**` — UI прототип (HTML, CSS, JS)
- `templates/**` — шаблоны файлов

**Запрещённые зоны:**
- `notion-brain/**` — источник истины
- `.env`, `.env.*` — секреты
- `node_modules/**`, `vendor/**` — зависимости
- `.git/**` — метаданные Git

### Обязательные проверки для Composer

**Dry-run режим:**
- Все операции должны выполняться сначала в режиме `dryRun: true`
- Показывает preview изменений без записи на диск
- Обязателен перед реальными изменениями

**Preview изменений:**
- Использовать `previewChanges()` для просмотра диффа перед записью
- Проверять размер изменений (добавления/удаления строк)
- Убедиться, что изменения соответствуют ожидаемым

**Проверка диффов:**
- `npm run check:diff` — проверка размера и формата изменений
- `npm run check:diff:strict` — строгая проверка (блокирует при ошибках)
- Максимальные лимиты:
  - Добавления: 200 строк
  - Удаления: 100 строк
  - Всего изменений: 250 строк

**Использование адаптеров:**
```javascript
import { readFile, writeFile, updateFile, patchFile, previewChanges } from './scripts/adapters/file-operations.mjs';

// Dry-run перед реальной записью
const preview = previewChanges('docs/new-page.md', content);
console.log('Preview:', preview);

// Запись с проверками
writeFile('docs/new-page.md', content, { 
  dryRun: true,  // Сначала dry-run
  validateDiff: true,
  expectedChanges: ['title:', 'slug:']
});
```

### Тестирование адаптеров

**Запуск тестов:**
- `npm run test:adapters` — запуск тестов для адаптеров файловых операций
- Тесты проверяют типовые кейсы: front matter, routes, link-map

**Типовые кейсы:**
1. Чтение файла
2. Запись файла с dry-run
3. Обновление front matter
4. Проверка запрещённых путей
5. Preview изменений
6. Проверка диффа (минимальные изменения)

## Two-stream Policy: работа с Notion и GitHub

Проект использует **двухпотоковую модель** (Two-stream policy) для синхронизации между Notion (источник истины) и GitHub (зеркало для исполнения и публикации).

### Два потока работы

**Stream 1: Notion → GitHub (импорт)**
- **Направление**: Notion → GitHub
- **Тип**: Автоматический импорт через workflow `notion-import.yml`
- **Использование**: Импорт контента, документации, структуры из Notion в GitHub
- **Ветки**: `notion-sync/*` (автоматически создаются workflow)
- **Процесс**: Экспорт из Notion → ZIP в `uploads/` → запуск workflow → создание PR

**Stream 2: GitHub → Notion (синхронизация)**
- **Направление**: GitHub → Notion
- **Тип**: Ручная/автоматическая синхронизация через CodeGPT агентов
- **Использование**: Обновление статусов задач, синхронизация прогресса, обратная связь
- **Ветки**: Любые ветки агентов (`chore/*`, `feat/*`, `docs/*`, и т.д.)
- **Процесс**: Агент выполняет задачу → создаёт PR → после мерджа обновляет статус в Notion

### Правила для агентов (CodeGPT, Copilot, Cursor)

**При работе с Stream 1 (Notion → GitHub):**
- ❌ **Не изменять** файлы, импортированные из Notion (`notion_page_id` присутствует)
- ❌ **Не создавать** задачи в Notion для импортированного контента
- ✅ **Использовать** workflow `notion-import.yml` для импорта
- ✅ **Проверять** безопасность импорта через `check-import-safety.mjs`
- ✅ **Распознавать** ветки `notion-sync/*` как односторонний импорт (не синхронизировать обратно)

**При работе с Stream 2 (GitHub → Notion):**
- ✅ **Обновлять** статусы задач в Notion после завершения работы
- ✅ **Использовать** скрипты `scripts/codegpt/notion-update.mjs` или MCP сервер для обновления статусов
- ✅ **Синхронизировать** статусы: `Ready` → `In Progress` → `Review` → `Done`
- ✅ **Добавлять** ссылку на PR в поле задачи (если доступно)
- ❌ **Не создавать** дубликаты задач в Notion для работы, начатой в GitHub
- ✅ **Проверять** статус задачи в Notion перед началом работы (если задача из Notion)
- ✅ **Останавливать** работу, если задача в Notion переведена в `Blocked` или `Done`

**Специфичные правила для Copilot:**
- ✅ **Использовать** MCP сервер `mcp-server-notion.mjs` для работы с Notion API
- ✅ **Проверять** доступ к страницам Notion перед использованием (см. `docs/NOTION-ACCESS-SETUP.md`)
- ✅ **Использовать** инструменты MCP: `notion_search`, `notion_fetch`, `notion_update_page` для синхронизации
- ✅ **Следовать** two-stream policy при работе с задачами из Notion Briefs
- ❌ **Не работать** с файлами, имеющими `notion_page_id` в front matter (это импортированный контент)

### Синхронизация статусов

**Маппинг статусов между Notion и GitHub:**

| Notion Briefs | GitHub PR | Описание |
|---------------|-----------|----------|
| `Ready` | — | Задача готова к выполнению |
| `In Progress` | PR создан, в работе | Агент работает над задачей |
| `Review` | PR открыт, CI проходит | PR ожидает ревью |
| `Done` | PR смерджен | Задача завершена |
| `Blocked` | PR заблокирован | Требуется дополнительная информация |

**Обновление статусов:**
- При создании ветки → обновить статус в Notion на `In Progress`
- При создании PR → обновить статус в Notion на `Review`
- После мерджа PR → обновить статус в Notion на `Done`
- При блокировке → обновить статус в Notion на `Blocked`

**Команды для синхронизации:**

**Через скрипты (CodeGPT, Cursor):**
```bash
# Обновить статус задачи в Notion
node scripts/codegpt/notion-update.mjs <page-id> '{"Status":{"select":{"name":"In Progress"}}}'

# Получить ID задачи из Briefs
node scripts/codegpt/notion-search.mjs "Title задачи"
```

**Через MCP (Copilot):**
```javascript
// Использовать MCP инструменты через Copilot
// Поиск задачи
notion_search({ query: "Title задачи" })

// Получение задачи
notion_fetch({ id: "page-id" })

// Обновление статуса
notion_update_page({ 
  pageId: "page-id", 
  properties: { 
    Status: { select: { name: "In Progress" } } 
  } 
})
```

**Настройка MCP для Copilot:**
- См. `COPILOT-NOTION-SETUP.md` для настройки MCP сервера
- См. `docs/NOTION-ACCESS-SETUP.md` для настройки доступа к страницам Notion

### Исключения и особые случаи

**Ветки `notion-sync/*`:**
- Автоматически создаются workflow `notion-import.yml`
- **Не требуют** обновления статусов в Notion (импорт односторонний)
- **Не требуют** синхронизации обратно в Notion
- Могут быть смерджены без обновления статусов

**Задачи без Notion карточки:**
- Если задача создана только в GitHub (Issue), синхронизация не требуется
- Можно работать без обновления статусов в Notion
- Рекомендуется создать карточку в Briefs для полноты картины

**Конфликты синхронизации:**
- Если статус в Notion изменён вручную во время работы агента → приоритет у Notion
- Если задача в Notion переведена в `Blocked` → агент должен остановить работу
- Если задача в Notion переведена в `Done` → агент должен проверить, не дублирует ли работу

## Процесс работы агента

1. **Чтение задачи**: получить Brief из Notion или Issue
   - Если задача из Notion: использовать MCP (`notion_fetch`) или скрипты (`notion-search.mjs`)
   - Если задача из GitHub: прочитать Issue
2. **Подготовка**: прочитать контекст (`/.codegpt/context.md`, `docs/protocol-kontraktnaya-model-dlya-agentov.md`)
   - Для Copilot: прочитать `docs/stories/SHARED_CONTEXT.md` и `docs/stories/CONCEPT.md` (если работа со Stories)
3. **Проверка two-stream**: определить тип потока
   - Stream 1 (Notion → GitHub): проверить, что файлы не имеют `notion_page_id` (импортированный контент)
   - Stream 2 (GitHub → Notion): проверить доступ к Notion через MCP или скрипты
4. **Синхронизация статуса**: обновить статус в Notion на `In Progress` (если задача из Notion, Stream 2)
   - Copilot: использовать MCP инструмент `notion_update_page`
   - CodeGPT/Cursor: использовать скрипт `notion-update.mjs`
5. **Выполнение**: создать ветку, внести изменения, проверить локально
   - Использовать адаптеры файловых операций для всех изменений
   - Обязательно использовать dry-run и preview перед записью
   - ❌ Не изменять файлы с `notion_page_id` (Stream 1, импортированный контент)
6. **Проверка перед PR**:
   - `npm run normalize:dry` — проверить изменения нормализации
   - `npm run lint:docs` — проверить качество контента
   - `npm run check:diff` — проверить размер и формат диффов
   - `npm run check:pr-size` — проверить размер PR
   - `npm run check:lanes` — проверить соответствие Lanes policy
   - Проверить соответствие Deliverables из Briefs
7. **PR**: создать Pull Request с описанием, секцией Deliverables и соответствующим `lane:*` label
   - Указать тип two-stream в описании PR
   - Заполнить секцию "Two-stream Sync Status" в Deliverables
8. **Синхронизация статуса**: обновить статус в Notion на `Review` (если задача из Notion, Stream 2)
   - Copilot: использовать MCP инструмент `notion_update_page`
   - CodeGPT/Cursor: использовать скрипт `notion-update.mjs`
9. **Ожидание**: дождаться зелёного CI (`Docs CI` должен пройти)
10. **Мердж**: после одобрения смерджить PR
11. **Завершение**: 
    - Обновить статус в Notion на `Done` (если задача из Notion, Stream 2)
    - Удалить ветку (если не `notion-sync/*`)
    - Заполнить секцию "Two-stream Notes" в PR (если применимо)

## Release: процедура релиза GitHub Pages прототипа

Для релиза прототипа на GitHub Pages используется единый чек-лист и процедура.

### Preflight проверки

**Перед релизом необходимо:**
1. **CI статус**: Все проверки CI зелёные на ветке `main`
2. **Diagnostics свежие**: `prototype/data/pages.json`, `stats.json`, `broken-links.json`, `orphans.json` обновлены
3. **Prototype файлы готовы**: `index.html`, `styles.css`, `app.js`, `data/*.json` актуальны
4. **Workflow готов**: `.github/workflows/pages.yml` на месте и настроен

### Процедура релиза

**Вариант A: Автоматический деплой (push в main)**
- Изменения в `prototype/` или `docs/` автоматически запускают деплой
- Workflow выполняется автоматически при push в `main`

**Вариант B: Ручной запуск через GitHub Actions**
1. Открыть Actions → "Deploy Pages (prototype)"
2. Нажать "Run workflow"
3. Выбрать ветку `main`
4. Нажать "Run workflow"

### Верификация

После деплоя проверить:
- ✅ Сайт доступен по URL: https://utemix-lab.github.io/vovaipetrova-core/
- ✅ Основные функции работают (навигация, фильтры, поиск)
- ✅ Нет ошибок в консоли браузера
- ✅ Мобильная версия отображается корректно

### Критерии успешного релиза

✅ Workflow выполнен без ошибок  
✅ Сайт доступен по URL  
✅ Все функции работают  
✅ Нет критических багов  
✅ Производительность приемлемая (< 3 сек загрузка)

### Процедура Rollback

Если релиз неудачный:
1. **Через GitHub Actions**: Перезапустить предыдущий успешный деплой
2. **Через Git**: Создать revert коммит и запушить в `main`
3. **Через GitHub Pages Settings**: Выбрать предыдущий коммит в настройках Pages

**Время rollback:** обычно 2-5 минут

**Подробнее:** см. [Release checklist — процедура релиза Pages прототипа](./release-checklist-pages-prototype.md)

## Инциденты и ретроспективы

При возникновении инцидентов (ошибки CI, проблемы с деплоем, критические баги) используйте шаблоны для фиксации и анализа:

- **Шаблон инцидента**: [`docs/template-incident.md`](./template-incident.md) — минимальные поля для быстрого заполнения (< 3 минут)
  - Поля: What/Impact/When/Why/Fixed/Follow-ups/Owner
  - SLA реакции по уровням серьёзности
  - Чек-лист проверки решения

- **Шаблон ретроспективы**: [`docs/template-incident-retrospective.md`](./template-incident-retrospective.md) — короткая ретро для анализа и улучшений
  - Что прошло хорошо / Что можно улучшить
  - Действия по улучшению (немедленные, краткосрочные, долгосрочные)
  - Уроки и метрики

**Процесс:**
1. При обнаружении инцидента → создать файл по шаблону `template-incident.md`
2. После решения → заполнить разделы "Как исправлено" и "Последующие действия"
3. В течение 48 часов → провести ретроспективу по шаблону `template-incident-retrospective.md`
4. Добавить follow-up задачи в Briefs (если необходимо)

**Интеграция:**
- Ссылки на инциденты можно добавлять в PR описания (секция "Problems Encountered")
- Инциденты могут быть источником задач в Briefs (`Upstream Source: Incident`)

## KB Autolink: правила автолинкинга терминов

### Цель

Автоматически превращать упоминания терминов в ссылки на соответствующие страницы, не создавая ложных совпадений.

### Правила безопасного линкинга

1. **Точные совпадения**: Автолинк работает только для точных совпадений по `canonical_slug` и `title` из `pages.json`.

2. **Границы слова**: Автолинк срабатывает только на целых словах (word boundaries), не на части слова:
   - ✅ Правильно: "используем **Flux** для генерации"
   - ❌ Неправильно: "**Flux**ирование процесса" (часть слова)

3. **Игнорирование контекста**:
   - Пропускаются упоминания внутри code blocks (`` `code` `` и ` ```code``` `)
   - Пропускаются упоминания внутри существующих ссылок `[text](url)`
   - Пропускаются служебные слова (исключения: `a`, `an`, `the`, `is`, `are`, и т.д.)

4. **Приоритет при конфликтах**:
   - При наличии нескольких кандидатов используется страница с `canonical_slug` (высший приоритет)
   - Список исключений можно расширить в `scripts/autolink.mjs` (константа `EXCLUSIONS`)

### Использование

```bash
# Dry run (проверка без изменений)
npm run autolink:dry

# Автолинкинг всех файлов в docs/
npm run autolink

# Автолинкинг конкретного файла
node scripts/autolink.mjs --file docs/some-file.md
```

### Примеры before/after

**Before:**
```markdown
Мы используем Flux для генерации видео. Также работаем с Adobe Photoshop.
```

**After:**
```markdown
Мы используем [Flux](flux.md) для генерации видео. Также работаем с [Adobe Photoshop](adobe-photoshop.md).
```

**Игнорирование в code:**
```markdown
В коде используется `Flux` для обработки.  <!-- не будет автолинком -->
```

**Игнорирование в ссылках:**
```markdown
См. [документацию по Flux](https://example.com/flux).  <!-- не будет автолинком -->
```

### Технические детали

- **Словарь**: Строится из `prototype/data/pages.json` (slug и title каждой страницы)
- **Обработка**: Markdown файлы обрабатываются с сохранением front matter
- **Производительность**: Обработка всех файлов занимает < 5 секунд

## Связано с

- `CONTRIBUTING.md` — процесс работы с репозиторием
- `/.codegpt/context.md` — контекст проекта
- `docs/rfcs/rfc-xxxx-nazvanie-rfc.md` — шаблон для RFC (для крупных изменений)
- `docs/release-checklist-pages-prototype.md` — чек-лист и процедура релиза
- `docs/template-incident.md` — шаблон фиксации инцидента
- `docs/template-incident-retrospective.md` — шаблон ретроспективы инцидента

