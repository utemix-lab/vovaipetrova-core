## Link-map coverage finale: internal-missing = 0, edge cases

### Цель
Довести internal-missing до строгого нуля, обработать edge-cases ссылок.

### Изменения

#### 1. Улучшена обработка edge-cases
- ✅ **Якоря и query-параметры**: ссылки вида `file.md#anchor` и `file.md?param=value` теперь корректно обрабатываются
- ✅ **CSV файлы**: улучшена нормализация ссылок на CSV файлы с хешами
- ✅ **Service файлы**: добавлена поддержка резолвинга ссылок на service файлы через `serviceMap`
- ✅ **Хеши в именах**: улучшена обработка файлов с хешами (например, `api-reestr-i-specifikacii-711159.md`)

#### 2. Обновлены правила в link-map.json
- ✅ Добавлены exact mappings для `api-reestr-i-specifikacii-711159.md` → `api-reestr-i-specifikacii-711159`
- ✅ Добавлены mappings для CSV файлов "База знаний dcec31887b6145d78d9096d911a951cb.csv" → `baza-znanij-koren`

#### 3. Улучшена нормализация ссылок
- ✅ `normalizeReferenceCandidates` теперь обрабатывает:
  - Якоря (`#anchor`)
  - Query-параметры (`?param=value`)
  - CSV файлы (`.csv`)
  - Файлы с хешами в именах
- ✅ `buildSlugMaps` теперь создаёт `serviceMap` для резолвинга service файлов
- ✅ `resolveReference` проверяет service файлы через `serviceMap`

### Результаты

**До:**
- `issues_total`: 2
- `issues_internal_missing`: 0 (но было 2 unknown_target)
- `brokenCount`: 2

**После:**
- `issues_total`: **0** ✅
- `issues_internal_missing`: **0** ✅
- `brokenCount`: **0** ✅

### Обработанные edge-cases

1. **Service файлы с хешами**: `api-reestr-i-specifikacii-711159.md`
   - Проблема: файл существует, но имеет `service: true`, поэтому не попадал в canonicalSet
   - Решение: добавлена `serviceMap` для резолвинга service файлов

2. **CSV файлы с пробелами и хешами**: `База знаний dcec31887b6145d78d9096d911a951cb.csv`
   - Проблема: файл не существует, но ссылка на него есть в контенте
   - Решение: добавлен exact mapping в link-map.json для маппинга на `baza-znanij-koren`

3. **Якоря и query-параметры**: ссылки вида `file.md#anchor` и `file.md?param=value`
   - Решение: добавлена обработка в `normalizeReferenceCandidates` для удаления якорей и query-параметров перед проверкой

### Scope
- `scripts/report-broken-internal-links.mjs` — улучшена обработка edge-cases
- `prototype/link-map.json` — добавлены exact mappings для проблемных ссылок
- `prototype/data/broken-links.json` — обновлён (0 issues)
- `prototype/data/stats.json` — обновлён (issues_total = 0)

### Acceptance
- [x] internal-missing = 0 строго
- [x] issues_total = 0 (было 2)
- [x] Все internal ссылки корректно резолвятся
- [x] CI зелёный (проверки не блокируют)

### Технические детали

**Улучшения в normalizeReferenceCandidates:**
- Удаление якорей (`#anchor`) и query-параметров (`?param=value`) перед нормализацией
- Поддержка CSV файлов (`.csv`)
- Улучшенная обработка хешей в именах файлов

**Добавлена serviceMap:**
- Отдельная мапа для service файлов для корректного резолвинга
- Поддержка вариантов с хешами и без хешей
- Интеграция с существующей логикой резолвинга

