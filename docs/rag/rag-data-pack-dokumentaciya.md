---
title: RAG Data Pack — документация
slug: rag-data-pack-dokumentaciya
summary: '# RAG Data Pack — документация'
tags: []
machine_tags: []
---
# RAG Data Pack — документация

## Обзор

RAG Data Pack — это набор экспортированных данных в формате JSONL для использования в системах Retrieval-Augmented Generation (RAG). Данные подготовлены из базы знаний (KB) и Stories эпизодов проекта.

## Структура данных

### Расположение файлов

Все файлы находятся в директории `data/`:

```
data/
├── exports/              # Исходные экспорты
│   ├── kb_terms.v1.jsonl          # KB термины (канонический формат)
│   ├── stories.v1.jsonl           # Stories эпизоды (машинная линия)
│   └── canon_map.v1.json          # Каноническая карта и alias-словарь
├── slices/               # Разбитые на чанки данные
│   ├── kb/
│   │   └── slices.jsonl           # Срезы KB терминов (~1-2k токенов)
│   ├── stories/
│   │   └── slices.jsonl           # Срезы Stories эпизодов (~1-2k токенов)
│   └── source_mapping.json        # Маппинг slice_id → source_id
└── schemas/              # JSON схемы для валидации
    ├── kb_terms.schema.json
    └── stories.schema.json
```

## Форматы данных

### KB Terms (kb_terms.v1.jsonl)

Каждая строка — JSON объект с полями:

- `slug` (string) — канонический slug термина
- `title` (string) — заголовок термина
- `lite_summary` (string) — краткое описание (для быстрого поиска)
- `full_text_md` (string) — полный текст в Markdown
- `tags` (array[string]) — теги термина
- `links` (array[string]) — ссылки на связанные термины
- `updated_at` (string, ISO 8601) — дата последнего обновления

**Пример:**
```json
{
  "slug": "canonical-slug",
  "title": "Canonical Slug",
  "lite_summary": "Канонический идентификатор для терминов базы знаний",
  "full_text_md": "# Canonical Slug\n\nКанонический slug...",
  "tags": ["kb", "concepts"],
  "links": ["slug", "autolink"],
  "updated_at": "2026-01-14T10:00:00Z"
}
```

### Stories (stories.v1.jsonl)

Каждая строка — JSON объект с полями:

- `slug` (string) — slug эпизода
- `tldr` (string) — краткое резюме эпизода
- `machine_report_md` (string) — машинный отчёт в Markdown (основной контент)
- `refs` (object) — ссылки на PR и коммиты
  - `prs` (array[string]) — номера PR
  - `commits` (array[string]) — хеши коммитов
- `series_id` (string, optional) — ID серии (если эпизод входит в серию)
- `updated_at` (string, ISO 8601) — дата последнего обновления

**Пример:**
```json
{
  "slug": "explorer-unresolved-terms",
  "tldr": "Добавлена панель 'Unresolved terms' в Explorer",
  "machine_report_md": "# Explorer: Unresolved Terms\n\n...",
  "refs": {
    "prs": ["234"],
    "commits": ["abc123"]
  },
  "series_id": "explorer-features",
  "updated_at": "2026-01-14T10:00:00Z"
}
```

### Canon Map (canon_map.v1.json)

Каноническая карта для автолинка и нормализации:

```json
{
  "canonical_slug": {
    "aliases": ["alias1", "alias2"],
    "preferred_title": "Preferred Title"
  }
}
```

**Использование:**
- Автолинк: поиск упоминаний терминов в тексте
- Нормализация: приведение вариантов написания к канонической форме
- Поиск: расширение запросов через aliases

### Slices (slices.jsonl)

Разбитые на чанки данные для эффективного embedding и retrieval:

- `id` (string) — уникальный ID среза
- `source_id` (string) — ID исходного документа
- `source_type` (string) — тип источника (`kb` или `stories`)
- `text` (string) — текст среза
- `tokens` (number) — примерное количество токенов
- `metadata` (object) — дополнительные метаданные

**Пример:**
```json
{
  "id": "kb_canonical-slug_0",
  "source_id": "canonical-slug",
  "source_type": "kb",
  "text": "# Canonical Slug\n\nКанонический slug...",
  "tokens": 1500,
  "metadata": {
    "title": "Canonical Slug",
    "tags": ["kb", "concepts"]
  }
}
```

### Source Mapping (source_mapping.json)

Маппинг для отслеживания срезов обратно к исходным документам:

```json
{
  "kb": {
    "canonical-slug": ["kb_canonical-slug_0", "kb_canonical-slug_1"]
  },
  "stories": {
    "explorer-unresolved-terms": ["stories_explorer-unresolved-terms_0"]
  }
}
```

## Версионирование

Файлы версионируются через суффикс в имени: `v1`, `v2`, и т.д.

**Текущая версия:** `v1`

**Правила версионирования:**
- `v1` → `v2`: изменение структуры полей (добавление/удаление обязательных полей)
- Остаётся `v1`: добавление опциональных полей, исправления данных

## Обновление данных

### Генерация экспортов

```bash
# Экспорт KB терминов
npm run export:kb-jsonl

# Экспорт Stories эпизодов
npm run export:stories-jsonl

# Построение canon map
npm run export:canon-map

# Все экспорты сразу
npm run export:rag
```

### Генерация срезов

```bash
# Разбиение на срезы
npm run rag:split-slices

# С параметрами
node scripts/split-slices.mjs --source both --max-tokens 2000
```

### CI/CD

Экспорты генерируются автоматически в CI при изменениях в контенте:
- При мердже PR в `main`
- При обновлении KB терминов или Stories эпизодов

## Использование в RAG

### 1. Embedding

Используйте `slices.jsonl` для создания embeddings:
- Каждый срез — отдельный вектор
- Метаданные сохраняются для фильтрации

### 2. Retrieval

При поиске:
1. Найти релевантные срезы по embedding similarity
2. Использовать `source_mapping.json` для получения полного контекста
3. Загрузить исходный документ из `exports/` для полного контекста

### 3. Контекст для генерации

Собрать контекст из нескольких срезов:
- Максимум N токенов (например, 4000)
- Приоритет по relevance score
- Сохранение порядка из исходного документа

## Схемы валидации

JSON схемы находятся в `docs/data-schemas/`:
- `kb_terms.schema.json` — схема для KB терминов
- `stories.schema.json` — схема для Stories эпизодов

**Валидация:**
```bash
# Используйте любой JSON Schema валидатор
ajv validate -s docs/data-schemas/kb_terms.schema.json -d data/exports/kb_terms.v1.jsonl
```

## Размеры данных

**Типичные размеры (на момент создания документации):**
- `kb_terms.v1.jsonl`: ~500 KB
- `stories.v1.jsonl`: ~200 KB
- `canon_map.v1.json`: ~50 KB
- `slices/kb/slices.jsonl`: ~800 KB
- `slices/stories/slices.jsonl`: ~300 KB

## Часто задаваемые вопросы

**Q: Как часто обновляются данные?**  
A: При каждом изменении контента в репозитории через CI/CD.

**Q: Можно ли использовать старые версии?**  
A: Да, старые версии сохраняются в истории Git. Но рекомендуется использовать последнюю версию.

**Q: Как добавить новые поля?**  
A: Добавьте опциональные поля в экспортеры и обновите схемы. Для обязательных полей — новая версия.

**Q: Где найти примеры использования?**  
A: См. `scripts/rag/` для примеров скриптов индексации и retrieval.

## Связанные документы

- [Отчёт об индексации RAG](otchyot-ob-indeksacii-rag.md) — отчёт об индексации
- [Data Schemas](../data-schemas/) — JSON схемы для валидации
- [Canon Map Usage](../kb/canonical-slug.md) — использование canon map

---

**Последнее обновление:** 2026-01-14  
**Версия документации:** 1.0
