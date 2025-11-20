## Описание изменений

Усилена защита для задач Composer от опасных правок и утечек через Guardrails v2.

**Связанная задача**: [Composer] Guardrails v2: size‑guard, PII‑scrub, forbidden‑paths

**Lane Label**: `lane:composer`

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: https://www.notion.so/fb1dbb0ebbf445058582c1ee015bfc94

### Completed
- [x] Size‑guard с порогами по типам задач
- [x] PII‑scrub для имён/почт/путей
- [x] Чёрный список путей (forbidden‑paths)

### Changes
- Создан Guardrails v2 (`scripts/guardrails-v2.mjs`):
  * Size-guard с порогами по типам задач:
    - Composer: 20 файлов, 500 добавлений, 200 удалений
    - Docs: 30 файлов, 1000 добавлений, 500 удалений
    - Scripts: 15 файлов, 800 добавлений, 300 удалений
    - Prototype: 25 файлов, 1200 добавлений, 600 удалений
  * PII-scrub с расширенной детекцией:
    - Пути пользователей (Windows/Unix) → ошибка
    - Email адреса → ошибка
    - Телефонные номера → ошибка
    - Имена (только для stories) → предупреждение
    - API ключи/секреты → ошибка
  * Forbidden-paths проверка:
    - Защита критических файлов (.env, .git/, package.json, etc.)
    - Блокировка изменений в запрещённых путях
- Интегрирован в CI (`.github/workflows/docs-ci.yml`):
  * Автоматический запуск на PR
  * Публикация отчёта как комментарий в PR
  * Блокировка при нарушениях
- Обновлена документация (`docs/protocol-kontraktnaya-model-dlya-agentov.md`):
  * Описание Guardrails v2 с порогами по типам задач
  * Список forbidden-paths
  * Расширенные PII паттерны
- Добавлены команды `npm run guardrails:v2` и `npm run guardrails:v2:verbose`
- Добавлены тестовые файлы для проверки нарушений (`test-guardrails-v2/`)

### Files Changed
- `scripts/guardrails-v2.mjs` — основной скрипт Guardrails v2
- `.github/workflows/docs-ci.yml` — интеграция в CI
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — документация
- `package.json` — добавлены команды `guardrails:v2` и `guardrails:v2:verbose`
- `.gitignore` — добавлен `test-guardrails-v2/`
- `test-guardrails-v2/violations/` — тестовые файлы для проверки нарушений

### Metrics
- Создано 3 типа проверок (size-guard, PII-scrub, forbidden-paths)
- Определено 5 типов задач с индивидуальными порогами
- Добавлено 7 паттернов PII детекции
- Определено 15+ forbidden-paths

### Problems Encountered
- Нет

### Proposals
- Рассмотреть добавление большего количества паттернов PII
- Добавить метрики производительности проверок
- Интегрировать с GitHub Actions для автоматической публикации результатов

