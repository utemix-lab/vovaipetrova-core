## Описание изменений

Подготовлен пакет промптов для Composer под формат Briefs с безопасными рамками вывода.

**Связанная задача**: [Composer] Prompts pack: task spec + safety rails

**Lane Label**: `lane:composer`

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: https://www.notion.so/83c7e45b7dcf476c809e7a49833c04c8

### Completed
- [x] Сформирован шаблон task spec для Composer с обязательными полями
- [x] Добавлены safety rails: запрещённые пути, приватные данные, стиль правок
- [x] Созданы примеры 2–3 готовых спецификаций под типовые задачи

### Changes
- Обновлён `docs/template-task-spec.md`:
  * Структурированные разделы с обязательными полями
  * Safety Rails с запрещёнными путями и действиями
  * Чек-лист приёмки и ссылки на примеры
- Добавлен раздел Safety Rails в `docs/protocol-kontraktnaya-model-dlya-agentov.md`:
  * Запрещённые пути (notion-brain, .env, node_modules)
  * Защита приватных данных (PII, стиль правок)
  * Структурные и процессные запреты
- Созданы примеры готовых спецификаций:
  * `docs/template-task-spec-example-1-docs.md` — документация
  * `docs/template-task-spec-example-2-scripts.md` — скрипты
  * `docs/template-task-spec-example-3-prototype.md` — прототип UI

### Files Changed
- `docs/template-task-spec.md` — обновлён шаблон для Composer
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — добавлен раздел Safety Rails
- `docs/template-task-spec-example-1-docs.md` — пример для документации
- `docs/template-task-spec-example-2-scripts.md` — пример для скриптов
- `docs/template-task-spec-example-3-prototype.md` — пример для прототипа

### Metrics
- Добавлено 3 примера спецификаций
- Определено 10+ запрещённых путей и действий
- Структурированы обязательные поля для task spec

### Problems Encountered
- Нет

### Proposals
- Рассмотреть возможность автоматической проверки safety rails в CI
- Добавить больше примеров для других типов задач (CI, Stories, etc.)

