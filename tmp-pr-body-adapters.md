## Описание изменений

Обеспечены надёжные изменения в docs/ и prototype/ через минимальные диффы и проверки.

**Связанная задача**: [Composer] Adapters: файловые операции и дифф‑патчи

**Lane Label**: `lane:composer`

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: https://www.notion.so/abe69a7a1e384ee0a54549c722a9e7b8

### Completed
- [x] Определены допустимые операции (append/replace/patch) и их проверки
- [x] Введены обязательные dry-run и preview для Composer
- [x] Созданы тесты на типовые кейсы (front matter, routes, link-map)

### Changes
- Создан адаптер файловых операций (`scripts/adapters/file-operations.mjs`):
  * Поддержка операций: read, write, update, patch
  * Проверка разрешённых/запрещённых путей
  * Валидация диффов (минимальные изменения)
  * Dry-run и preview режимы
- Добавлена проверка диффов перед коммитом (`scripts/check-diff.mjs`):
  * Проверка размера изменений (макс. 200 добавлений, 100 удалений)
  * Проверка формата для Markdown файлов
  * Строгий режим (`--strict`)
- Созданы тесты для адаптеров (`scripts/adapters/test-file-operations.mjs`):
  * Тесты типовых кейсов: front matter, routes, link-map
  * Проверка запрещённых путей
  * Проверка preview изменений
- Документированы политики в `docs/protocol-kontraktnaya-model-dlya-agentov.md`:
  * Обязательные dry-run и preview для Composer
  * Допустимые операции и зоны записи
  * Лимиты на размер диффов

### Files Changed
- `scripts/adapters/file-operations.mjs` — адаптер файловых операций
- `scripts/adapters/test-file-operations.mjs` — тесты адаптеров
- `scripts/check-diff.mjs` — проверка диффов перед коммитом
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — документация политик
- `package.json` — добавлены команды `check:diff`, `check:diff:strict`, `test:adapters`
- `.gitignore` — добавлен `test-adapters/`

### Metrics
- Создано 3 новых скрипта (адаптер, проверка диффов, тесты)
- Определено 4 типа операций (read, write, update, patch)
- Установлены лимиты на размер диффов (200/100/250 строк)
- Добавлено 6 тестовых кейсов

### Problems Encountered
- Нет

### Proposals
- Рассмотреть интеграцию проверки диффов в CI (pre-commit hook)
- Добавить больше тестов для edge cases (большие файлы, конфликты путей)

