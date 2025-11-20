## Описание изменений

Запуск модели Composer в прод-контуре Cursor с изолированной дорожкой и предсказуемыми очередями ревью.

**Связанная задача**: [Composer] Rollout v1: one‑lane policy + review queues

**Lane Label**: `lane:composer`

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: https://www.notion.so/838f882b6e744167a78b60b4b60ab944

### Completed
- [x] Включена политика one-PR-per-lane для задач Composer (`lane:composer`)
- [x] Настроены очереди ревью и SLA в PROTOCOL.md
- [x] Проверена совместимость с существующими guardrails

### Changes
- Добавлена поддержка `lane:composer` в `scripts/check-lanes.mjs`
- Добавлен раздел "Очереди ревью и SLA" в `docs/protocol-kontraktnaya-model-dlya-agentov.md`:
  * Composer Queue: максимум 1 активный PR, SLA 24 часа
  * Стандартные очереди: до 2-3 активных PR, SLA 48 часов
  * Статусы в Briefs: Ready → In Progress → Review → Done
- Обновлён маппинг префиксов веток: `composer/*` → `lane:composer`

### Files Changed
- `scripts/check-lanes.mjs` — добавлена поддержка `lane:composer` в регулярное выражение
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — добавлен раздел про очереди ревью и SLA

### Metrics
- Добавлена 1 новая lane (`lane:composer`)
- Добавлено 4 новых статуса в Briefs (Ready, In Progress, Review, Done)
- Определены SLA для разных типов PR

### Problems Encountered
- Нет

### Proposals
- Рассмотреть возможность автоматического отслеживания SLA через GitHub Actions
- Добавить метрики времени ревью в диагностику

