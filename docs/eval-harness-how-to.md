---
title: Eval harness — метрики качества и регрессии
slug: eval-harness-how-to
summary: >-
  Инструкция по использованию eval harness для проверки качества работы Composer
  и обнаружения регрессий
tags: []
machine_tags: []
status: ready
---

# Eval harness — метрики качества и регрессии

## TL;DR

Eval harness — набор эталонных тестов для проверки качества работы Composer. Автоматически запускается в CI и обнаруживает регрессии при изменении правил и шаблонов.

## Что проверяется

**Эталонные задачи:**
1. **Tags normalization** — нормализация тегов (валидность алиасов в `tags.yaml`)
2. **Link-map consistency** — консистентность link-map (валидность exact mappings и patterns)
3. **Routes consistency** — консистентность routes (валидность структуры `routes.yml`)
4. **Lint quality** — качество линтинга (отсутствие ошибок)
5. **Diff size** — размер изменений (минимальные диффы, лимиты на добавления/удаления)

**Метрики:**
- **Точность** — процент пройденных тестов (pass rate)
- **Объём диффа** — количество добавлений/удалений строк
- **Время выполнения** — длительность выполнения каждого теста

## Использование

**Локальный запуск:**
```bash
npm run test:eval
```

**Подробный вывод:**
```bash
npm run test:eval:verbose
```

**Результаты сохраняются в:**
- `tests/composer/results/eval-{timestamp}.json` — полные результаты
- `tests/composer/results/pr-report.md` — отчёт для PR

## Интеграция в CI

Eval harness автоматически запускается в CI при создании PR:
- Запускается в job `lint-and-links`
- Результаты публикуются как комментарий в PR
- Падение тестов не блокирует мердж (но предупреждает о регрессии)

**Условия запуска:**
- PR к `main` ветке
- Изменения в `docs/`, `scripts/`, `tests/`, `.github/workflows/`

## Структура тестов

### TagsNormalizationTest

Проверяет валидность алиасов в `docs/nav/tags.yaml`:
- Все алиасы должны иметь массив machine_tags
- Подсчитывает общее количество алиасов и покрытие

**Метрики:**
- `totalAliases` — общее количество алиасов
- `invalidAliases` — количество невалидных алиасов
- `coverage` — процент покрытия (100% если есть алиасы)

### LinkMapConsistencyTest

Проверяет консистентность `prototype/link-map.json`:
- Все exact mappings должны иметь строковое значение
- Все patterns должны иметь `match` и `replacement`

**Метрики:**
- `exactMappings` — количество exact mappings
- `invalidMappings` — количество невалидных mappings
- `patterns` — количество patterns
- `invalidPatterns` — количество невалидных patterns

### RoutesConsistencyTest

Проверяет консистентность `docs/nav/routes.yml`:
- Все routes должны иметь `path` и `entries`
- Все entries должны иметь `slug` и `doc`
- Подсчитывает уникальные slugs

**Метрики:**
- `totalRoutes` — общее количество маршрутов
- `invalidRoutes` — количество невалидных маршрутов
- `totalSlugs` — общее количество slugs
- `uniqueSlugs` — количество уникальных slugs

### LintQualityTest

Проверяет качество линтинга:
- Запускает `npm run lint:docs`
- Подсчитывает ошибки и предупреждения

**Метрики:**
- `errors` — количество ошибок
- `warnings` — количество предупреждений
- `hasErrors` — наличие ошибок (boolean)
- `hasWarnings` — наличие предупреждений (boolean)

### DiffSizeTest

Проверяет размер изменений:
- Анализирует `git diff --stat`
- Проверяет лимиты: максимум 200 добавлений, 100 удалений

**Метрики:**
- `additions` — количество добавленных строк
- `deletions` — количество удалённых строк
- `filesChanged` — количество изменённых файлов
- `withinLimits` — соответствие лимитам (boolean)

## Формат отчёта

**JSON отчёт (`eval-{timestamp}.json`):**
```json
{
  "timestamp": "2025-11-20T08:00:00.000Z",
  "results": [
    {
      "name": "tags-normalization",
      "passed": true,
      "metrics": { ... },
      "timestamp": "..."
    }
  ],
  "summary": {
    "total": 5,
    "passed": 5,
    "failed": 0,
    "passRate": 100
  }
}
```

**PR отчёт (`pr-report.md`):**
```markdown
## Eval Harness Results

**Pass Rate:** 100.0% (5/5)

### Test Results

| Test | Status | Metrics |
|------|--------|---------|
| tags-normalization | ✅ PASS | totalAliases: 46, ... |
| link-map-consistency | ✅ PASS | exactMappings: 19, ... |
| ...
```

## Добавление новых тестов

Для добавления нового теста создайте класс, наследующий `EvalTest`:

```javascript
class MyCustomTest extends EvalTest {
  constructor() {
    super('my-custom-test');
  }

  async execute() {
    // Ваша логика проверки
    return {
      passed: true,
      metrics: {
        customMetric: 42
      }
    };
  }
}
```

Затем добавьте тест в массив `tests` в функции `runAllTests()`.

## Пороги качества

**Текущие пороги:**
- Tags: все алиасы должны быть валидными (100% валидность)
- Link-map: все mappings и patterns должны быть валидными (0 ошибок)
- Routes: все routes и entries должны быть валидными (0 ошибок)
- Lint: отсутствие ошибок (0 errors)
- Diff size: максимум 200 добавлений, 100 удалений

**Регрессия определяется как:**
- Любой тест падает (passed = false)
- Pass rate < 100%

## Связано с

- `tests/composer/eval-harness.mjs` — основной скрипт eval harness
- `.github/workflows/docs-ci.yml` — интеграция в CI
- `docs/single-source-playbook.md` — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов
- `scripts/test-guardrails.mjs` — тестирование guardrails
- `scripts/verify-stats-accuracy.mjs` — верификация метрик

