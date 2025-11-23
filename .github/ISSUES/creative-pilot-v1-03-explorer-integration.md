# [Task] Creative Pilot v1: Интеграция Stories с Explorer

## Task Description

Обеспечить корректную интеграцию Stories эпизодов с Explorer (prototype). Проверить отображение эпизодов в ленте Stories, фильтрацию, сортировку и навигацию.

## Related

- **Roadmap Issue**: Creative Pilot v1 — Roadmap Issue
- **Upstream Source**: Ideas & Proposals

## Two-stream Policy

**Stream Type**:
- [x] Нет связи с Notion: Задача только в GitHub (Issue)

**Если Stream 2 (GitHub → Notion)**:
- [x] Задача только в GitHub Issue (синхронизация не требуется)

## Scope

- [ ] Проверить функцию `isStoryPage()` в Explorer
- [ ] Проверить фильтрацию Stories через `collection: "stories"`
- [ ] Проверить сортировку по `story_order` из slug
- [ ] Проверить отображение в ленте Stories (`#stories-panel`)
- [ ] Проверить навигацию между эпизодами
- [ ] Обновить `prototype/data/pages.json` после добавления эпизодов
- [ ] Проверить обновление индексов через `npm run diagnostics:snapshot`

## Deliverables

- [ ] Все эпизоды Stories отображаются в Explorer
- [ ] Лента Stories работает корректно
- [ ] Фильтрация и сортировка работают правильно
- [ ] Навигация между эпизодами работает
- [ ] Индексы обновлены (`prototype/data/pages.json`)

## Lane

**Copilot lanes:**
- [x] `lane:copilot:stories` — Copilot Stories tasks

## Sequence

- [x] `seq:3` — Третья задача в последовательности Creative Pilot v1

## Executor

- [x] GitHub Copilot

## Additional Context

### Текущее состояние

- Explorer интегрирован с Stories через функцию `isStoryPage()`
- Лента Stories доступна по адресу: https://utemix-lab.github.io/vovaipetrova-core/#stories-panel
- Эпизоды фильтруются через `collection: "stories"` в front matter
- Сортировка происходит по `story_order` из slug

### Что нужно проверить

1. Отображаются ли все эпизоды в ленте Stories
2. Работает ли фильтрация по `collection: "stories"`
3. Правильно ли работает сортировка по `story_order`
4. Обновляются ли индексы после добавления новых эпизодов
5. Работает ли навигация между эпизодами

### Команды для проверки

```bash
# Обновление индексов
npm run diagnostics:snapshot

# Проверка обновления pages.json
cat prototype/data/pages.json | grep -i story

# Локальный запуск Explorer
# (если настроен локальный сервер)
```

### Связанные файлы

- `prototype/build-index.mjs` — скрипт сборки индексов
- `prototype/data/pages.json` — индекс страниц
- `docs/stories/CONCEPT.md` — концепция Stories

