## Описание изменений

Введены эталонные задачи и метрики pass/fail для Composer с автоматическим обнаружением регрессий.

**Связанная задача**: [Composer] Eval harness: метрики качества и регрессии

**Lane Label**: `lane:composer`

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: https://www.notion.so/3ca5dfec630646c7942afcd042d39691

### Completed
- [x] Набор эталонных задач: tags, link-map, routes, lint
- [x] Метрики: точность, объём диффа, время
- [x] Запуск в CI на PR к правилам и шаблонам

### Changes
- Создан eval harness (`tests/composer/eval-harness.mjs`):
  * 5 эталонных тестов: tags-normalization, link-map-consistency, routes-consistency, lint-quality, diff-size
  * Метрики: точность (pass rate), объём диффа, время выполнения
  * Генерация JSON отчётов и PR комментариев
- Интегрирован в CI (`.github/workflows/docs-ci.yml`):
  * Автоматический запуск на PR к `main`
  * Публикация результатов как комментарий в PR
  * Падение при регрессе качества (не блокирует мердж, но предупреждает)
- Добавлена документация (`docs/eval-harness-how-to.md`):
  * Инструкция по использованию eval harness
  * Описание тестов и метрик
  * Пороги качества и обнаружение регрессий
- Добавлены команды `npm run test:eval` и `npm run test:eval:verbose`
- Добавлен `tests/composer/results/` в `.gitignore`

### Files Changed
- `tests/composer/eval-harness.mjs` — основной скрипт eval harness
- `docs/eval-harness-how-to.md` — документация по использованию
- `.github/workflows/docs-ci.yml` — интеграция в CI
- `package.json` — добавлены команды `test:eval` и `test:eval:verbose`
- `.gitignore` — добавлен `tests/composer/results/`

### Metrics
- Создано 5 эталонных тестов
- Метрики: точность (pass rate), объём диффа, время выполнения
- Автоматический запуск в CI на PR
- Генерация отчётов для PR комментариев

### Problems Encountered
- Lint-quality тест падает из-за существующей проблемы YAML в одном из файлов (не связано с изменениями)

### Proposals
- Рассмотреть добавление большего количества эталонных задач
- Добавить метрики производительности (время выполнения скриптов)
- Интегрировать с GitHub Actions для автоматической публикации результатов

