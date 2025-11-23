# [Task] Creative Pilot v1: QA и проверки для Stories

## Task Description

Настроить и проверить все QA-ворота для Stories эпизодов: проверки PII, линтинг, формат, объём, соответствие структуре. Обеспечить автоматические проверки в CI и документацию по процессу.

## Related

- **Roadmap Issue**: Creative Pilot v1 — Roadmap Issue
- **Upstream Source**: Ideas & Proposals

## Two-stream Policy

**Stream Type**:
- [x] Нет связи с Notion: Задача только в GitHub (Issue)

**Если Stream 2 (GitHub → Notion)**:
- [x] Задача только в GitHub Issue (синхронизация не требуется)

## Scope

- [ ] Проверить работу `npm run pii:scan` для Stories
- [ ] Проверить работу `npm run lint:docs` для Stories
- [ ] Настроить проверку формата (700–1200 знаков)
- [ ] Настроить проверку структуры (TL;DR, что произошло, зачем, что получилось, тех-вставка, что дальше)
- [ ] Добавить проверки в CI workflow (если нужно)
- [ ] Создать документацию по QA-процессу для Stories
- [ ] Протестировать все проверки на существующих эпизодах

## Deliverables

- [ ] Все проверки PII работают корректно
- [ ] Все проверки линтинга работают корректно
- [ ] Проверка формата настроена (если нужно)
- [ ] Проверка структуры настроена (если нужно)
- [ ] CI проверки настроены (если нужно)
- [ ] Документация по QA-процессу создана
- [ ] Все существующие эпизоды проходят проверки

## Lane

**Copilot lanes:**
- [x] `lane:copilot:stories` — Copilot Stories tasks

## Sequence

- [x] `seq:4` — Четвёртая задача в последовательности Creative Pilot v1

## Executor

- [x] GitHub Copilot

## Additional Context

### Текущие проверки

1. **PII scan**: `npm run pii:scan` — обязательная проверка для Stories
2. **Linting**: `npm run lint:docs` — проверка линтинга
3. **Normalization**: `npm run normalize:dry` — проверка нормализации
4. **PR size**: `npm run check:pr-size` — проверка размера PR
5. **Lanes**: `npm run check:lanes` — проверка lanes policy

### Что нужно проверить

1. Работает ли `npm run pii:scan` для всех Stories эпизодов
2. Обнаруживает ли проверка PII реальные проблемы
3. Работает ли линтинг для Stories формата
4. Нужны ли дополнительные проверки формата и структуры
5. Нужны ли проверки в CI workflow

### Возможные улучшения

1. Добавить проверку объёма (700–1200 знаков) в линтер
2. Добавить проверку структуры (обязательные секции) в линтер
3. Добавить проверки в CI workflow для автоматических PR
4. Создать скрипт для валидации формата Stories

### Связанные файлы

- `scripts/pii-scan.mjs` — скрипт проверки PII
- `scripts/lint-docs.mjs` — скрипт линтинга
- `docs/stories/GITHUB_INSTRUCTIONS.md` — инструкции с QA-воротами
- `.github/workflows/docs-ci.yml` — CI workflow

