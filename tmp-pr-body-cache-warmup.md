## Описание изменений

Обеспечен прогрев контекста и словарей для ускорения первых ответов Composer.

**Связанная задача**: [Composer] Cache warmup: контекст и словари

**Lane Label**: `lane:composer`

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: https://www.notion.so/20e825da26824b5ba3cf4e9fb8b0fc96

### Completed
- [x] Сформированы компактные снапшоты глоссария и тегов
- [x] Добавлены быстрые справки по маршрутам и link-map
- [x] Документирована регенерация снапшотов

### Changes
- Создан скрипт cache-warmup (`scripts/cache-warmup.mjs`):
  * Генерация компактных снапшотов глоссария и тегов
  * Быстрые справки по маршрутам и link-map
  * Поддержка tags.yaml, routes.yml, link-map.json, glossary, context-map
- Добавлена документация (`docs/cache-warmup-how-to.md`):
  * Инструкция по регенерации снапшотов
  * Примеры использования в скриптах
  * Интеграция в процесс работы агента
- Интегрировано в PROTOCOL.md:
  * Упоминание `.cache/context-snapshot.json` и `.cache/quick-reference.json`
  * Инструкция по использованию для ускорения первых ответов
- Добавлена команда `npm run cache:warmup`
- Добавлена ссылка на документацию в `routes.yml`
- Добавлен `.cache/` в `.gitignore`

### Files Changed
- `scripts/cache-warmup.mjs` — скрипт генерации снапшотов
- `docs/cache-warmup-how-to.md` — документация по использованию
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — интеграция в протокол
- `package.json` — добавлена команда `cache:warmup`
- `.gitignore` — добавлен `.cache/`
- `docs/nav/routes.yml` — добавлена ссылка на документацию

### Metrics
- Создан 1 новый скрипт (cache-warmup)
- Генерируется 2 снапшота (context-snapshot.json, quick-reference.json)
- Поддерживается 5 источников данных (tags.yaml, routes.yml, link-map.json, glossary, context-map)
- Добавлена 1 документация (cache-warmup-how-to.md)

### Problems Encountered
- Нет

### Proposals
- Рассмотреть автоматическую регенерацию снапшотов в CI при изменении исходных файлов
- Добавить валидацию снапшотов перед использованием

