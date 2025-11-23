# [Task] Creative Pilot v1: Создание первых эпизодов Stories вручную

## Task Description

Создать 3–5 стартовых эпизодов Stories вручную для проверки формата, качества и процесса работы. Эпизоды должны фиксировать ключевые события проекта и следовать структуре: TL;DR → что произошло → зачем → что получилось → тех-вставка → что дальше.

## Related

- **Roadmap Issue**: Creative Pilot v1 — Roadmap Issue
- **Upstream Source**: Ideas & Proposals

## Two-stream Policy

**Stream Type**:
- [x] Нет связи с Notion: Задача только в GitHub (Issue)

**Если Stream 2 (GitHub → Notion)**:
- [x] Задача только в GitHub Issue (синхронизация не требуется)

## Scope

- [ ] Изучить существующие эпизоды Stories для понимания стиля
- [ ] Выбрать 3–5 ключевых событий для фиксации
- [ ] Создать эпизоды по шаблону `templates/story.md`
- [ ] Проверить формат (700–1200 знаков)
- [ ] Проверить структуру (TL;DR, что произошло, зачем, что получилось, тех-вставка, что дальше)
- [ ] Запустить проверки PII (`npm run pii:scan`)
- [ ] Запустить проверки линтинга (`npm run lint:docs`)
- [ ] Создать PR с меткой `content/story`

## Deliverables

- [ ] 3–5 эпизодов Stories в `docs/stories/`
- [ ] Все эпизоды проходят проверки PII
- [ ] Все эпизоды проходят проверки линтинга
- [ ] Все эпизоды соответствуют формату (700–1200 знаков)
- [ ] Все эпизоды имеют правильный front matter
- [ ] Создан PR с меткой `content/story`

## Lane

**Copilot lanes:**
- [x] `lane:copilot:stories` — Copilot Stories tasks

## Sequence

- [x] `seq:2` — Вторая задача в последовательности Creative Pilot v1

## Executor

- [x] GitHub Copilot

## Additional Context

### Кандидаты для эпизодов

1. Настройка Copilot и интеграция с Notion через MCP
2. Создание labels и шаблонов для Copilot
3. Настройка CI guardrails для Copilot
4. Запуск Creative Pilot v1

### Формат эпизода

```yaml
---
title: "Название эпизода"
slug: "XXX-краткое-описание"
summary: "Краткая аннотация (1–2 предложения)"
tags: [Story]
machine_tags: [content/story]
status: draft  # draft | review | ready
last_edited_time: null
---
```

### Структура контента

1. **TL;DR** — краткое резюме (3–5 пунктов)
2. **Что произошло** — описание события
3. **Зачем это делали** — мотивация
4. **Что получилось** — результаты
5. **Тех-вставка** — технические детали (2–3 предложения)
6. **Что дальше** — следующие шаги

### Проверки перед PR

```bash
npm run pii:scan          # Обязательно для Stories
npm run lint:docs
npm run normalize:dry
npm run check:pr-size
npm run check:lanes
```

### Связанные файлы

- `templates/story.md` — шаблон эпизода
- `docs/stories/CONCEPT.md` — концепция Stories
- `docs/stories/GITHUB_INSTRUCTIONS.md` — инструкции для работы

