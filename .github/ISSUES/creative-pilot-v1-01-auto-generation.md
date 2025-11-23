# [Task] Creative Pilot v1: Настройка автоматической генерации Stories

## Task Description

Настроить автоматическую генерацию Stories эпизодов через workflow `.github/workflows/stories.yml` и скрипт `scripts/generate-stories.mjs`. Обеспечить стабильную работу ежедневной генерации и создание PR с меткой `auto:story`.

## Related

- **Roadmap Issue**: Creative Pilot v1 — Roadmap Issue
- **Upstream Source**: Ideas & Proposals

## Two-stream Policy

**Stream Type**:
- [x] Нет связи с Notion: Задача только в GitHub (Issue)

**Если Stream 2 (GitHub → Notion)**:
- [x] Задача только в GitHub Issue (синхронизация не требуется)

## Scope

- [ ] Проверить и обновить скрипт `scripts/generate-stories.mjs`
- [ ] Проверить и обновить workflow `.github/workflows/stories.yml`
- [ ] Настроить интеграцию с CHANGELOG.md
- [ ] Настроить интеграцию с ADR (`docs/adr-*.md`)
- [ ] Настроить интеграцию с Briefs (если доступно)
- [ ] Проверить создание метаданных в `tmp/story-meta.json`
- [ ] Проверить создание PR с правильными метками
- [ ] Протестировать workflow вручную через `workflow_dispatch`

## Deliverables

- [ ] Обновлённый скрипт `scripts/generate-stories.mjs` (если нужно)
- [ ] Обновлённый workflow `.github/workflows/stories.yml` (если нужно)
- [ ] Документация по настройке автоматической генерации
- [ ] Успешный тестовый запуск workflow
- [ ] Создан тестовый PR с автогенерированным эпизодом

## Lane

**Copilot lanes:**
- [x] `lane:copilot:stories` — Copilot Stories tasks

## Sequence

- [x] `seq:1` — Первая задача в последовательности Creative Pilot v1

## Executor

- [x] GitHub Copilot

## Additional Context

### Текущее состояние

- Workflow `.github/workflows/stories.yml` существует и настроен на ежедневный запуск (07:00 Europe/Moscow)
- Скрипт `scripts/generate-stories.mjs` существует и генерирует эпизоды из CHANGELOG
- Workflow создаёт PR с меткой `auto:story`

### Что нужно проверить

1. Работает ли скрипт генерации корректно
2. Создаются ли метаданные в `tmp/story-meta.json`
3. Создаётся ли PR с правильными метками
4. Соответствует ли формат генерируемых эпизодов шаблону
5. Проходят ли эпизоды проверки PII и линтинга

### Связанные файлы

- `scripts/generate-stories.mjs` — скрипт генерации
- `.github/workflows/stories.yml` — workflow для автоматической генерации
- `templates/story.md` — шаблон эпизода
- `docs/stories/CONCEPT.md` — концепция Stories

