# Security & validation hardening: guardrails test + lint thresholds

## Цель

Проверить работу guardrails на практике и подкрутить пороги lint rules.

## Изменения

### 1. Тестирование guardrails

- ✅ Создан скрипт `scripts/test-guardrails.mjs` для эмуляции нарушений guardrails
- ✅ Тестирование Lanes Policy (one-PR-per-lane)
- ✅ Тестирование Size Guard
- ✅ Тестирование Lint Thresholds

### 2. Настройка порогов lint

- ✅ Пустой summary → предупреждение (ошибка в строгом режиме `--strict`)
- ✅ Длина summary > 300 символов → предупреждение
- ✅ Длина контента > 50,000 символов → предупреждение
- ✅ Длина контента > 100,000 символов → ошибка (блокирует)

### 3. Тестовые файлы с плохими примерами

- ✅ `test-guardrails/bad-examples/empty-summary.md` — пустой summary
- ✅ `test-guardrails/bad-examples/long-summary.md` — слишком длинный summary
- ✅ `test-guardrails/bad-examples/very-long-content.md` — очень длинный контент

### 4. Документация

- ✅ Обновлён `docs/protocol-kontraktnaya-model-dlya-agentov.md` с документацией:
  - Content Lint Thresholds (пороги для summary и контента)
  - Тестирование Guardrails (команды и примеры использования)
  - Обновлён чек-лист перед созданием PR

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: [Security & validation hardening: guardrails test + lint thresholds](https://www.notion.so/6a900a0a4ab94c0f91fca2671df27218)

### Completed

- [x] Эмуляция или test-case для проверки one-PR-per-lane, size-guard
- [x] Настройка порогов lint: пустые summary, слишком длинные тексты
- [x] Проверка всех guardrails на "плохих" примерах
- [x] Документирование поведения в PROTOCOL.md

### Changes

- Добавлен скрипт `scripts/test-guardrails.mjs` для тестирования guardrails
- Обновлён `scripts/lint-docs.mjs` с порогами для summary и длины контента
- Созданы тестовые файлы в `test-guardrails/bad-examples/`
- Обновлена документация в `docs/protocol-kontraktnaya-model-dlya-agentov.md`
- Добавлена команда `npm run test:guardrails` в `package.json`

### Files Changed

- `scripts/test-guardrails.mjs` — новый скрипт для тестирования guardrails
- `scripts/lint-docs.mjs` — добавлены пороги для summary и длины контента
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — обновлена документация
- `package.json` — добавлена команда `test:guardrails`
- `test-guardrails/bad-examples/*.md` — тестовые файлы с плохими примерами

### Metrics

- Пороги lint: summary max 300 chars, content max 50k/100k chars
- Тестовые файлы: 3 примера нарушений
- Команды тестирования: `npm run test:guardrails`

### Acceptance

- ✅ Есть test-case или эмуляция нарушений (`scripts/test-guardrails.mjs`)
- ✅ Guardrails корректно срабатывают (тестирование lanes, size, lint)
- ✅ Пороги lint настроены адекватно (summary 300, content 50k/100k)
- ✅ Документация актуальна (обновлён PROTOCOL.md)

