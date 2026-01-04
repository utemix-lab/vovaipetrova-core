---
title: Terms found — формат блока в PR по Stories
slug: terms-found-format
summary: Стандартизированный формат блока "Terms found" для добавления в каждый PR по Stories.
tags: [Документация, Stories]
machine_tags: [theme/docs, content/story]
status: ready
---

# Terms found — формат блока в PR по Stories

## Назначение

Блок "Terms found" добавляется в тело каждого PR по Stories для документирования терминов, найденных в эпизодах, и их контекста использования. Это помогает автоматически собирать кандидатов для добавления в Knowledge Base.

## Формат

### Стандартная структура

```markdown
## Terms found

Термины извлечены из файлов Stories для добавления в KB:

- **Термин** (`slug`)
  > Цитата контекста 1 (до 150 символов)
  > Цитата контекста 2 (до 150 символов, опционально)

- **Другой термин** (`другой-slug`)
  > Цитата контекста
```

### Правила форматирования

1. **Заголовок**: всегда `## Terms found`
2. **Вводный текст**: "Термины извлечены из файлов Stories для добавления в KB:"
3. **Список терминов**: маркированный список с форматированием `**Термин** (\`slug\`)`
4. **Цитаты контекста**: 
   - Отступ 2 пробела
   - Формат `> цитата`
   - Максимум 2 цитаты на термин
   - Максимум 150 символов на цитату (с многоточием при обрезке)
5. **Ограничения**:
   - Максимум 10 терминов в блоке
   - Термины сортируются по частоте появления (frequency)
   - Показываются только термины с frequency ≥ 1

## Генерация блока

### Автоматическая генерация

Используйте скрипт `scripts/generate-terms-found-block.mjs`:

```bash
# 1. Сначала запустите extractor для извлечения терминов
node scripts/extractor-stories-terms.mjs --base=main --no-issues

# 2. Затем сгенерируйте блок Terms found
node scripts/generate-terms-found-block.mjs > terms-found-block.md

# 3. Скопируйте содержимое terms-found-block.md в PR body
```

### Параметры скрипта

- `--max-terms=N` — максимальное количество терминов (по умолчанию: 10)
- `--max-contexts=N` — максимальное количество цитат на термин (по умолчанию: 2)

Пример:

```bash
node scripts/generate-terms-found-block.mjs --max-terms=5 --max-contexts=1
```

### Ручное добавление

Если автоматическая генерация недоступна, используйте формат вручную:

1. Запустите `npm run extractor-stories-terms` (или `node scripts/extractor-stories-terms.mjs`)
2. Откройте `prototype/data/candidates_kb.json`
3. Выберите топ-10 терминов по frequency
4. Для каждого термина добавьте 1-2 цитаты из `contexts`
5. Отформатируйте по шаблону выше

## Интеграция в процесс создания PR

### Workflow для Stories PR

1. **Создание/обновление эпизода Stories**
2. **Извлечение терминов**:
   ```bash
   node scripts/extractor-stories-terms.mjs --base=main --no-issues
   ```
3. **Генерация блока Terms found**:
   ```bash
   node scripts/generate-terms-found-block.mjs
   ```
4. **Добавление блока в PR body**:
   - Скопируйте вывод скрипта
   - Вставьте в раздел "Terms found" PR body

### Пример полного PR body

```markdown
Описание изменений...

## Deliverables

- Файл `docs/stories/XXX-episode.md`
- ...

## Terms found

Термины извлечены из файлов Stories для добавления в KB:

- **Термин** (`slug`)
  > Цитата контекста

## Проверки

- normalize:dry — без изменений
- lint:docs — предупреждения (ожидаемо)
- pii:scan — PII не обнаружен
```

## Примеры

### Пример 1: Один термин с двумя цитатами

```markdown
## Terms found

Термины извлечены из файлов Stories для добавления в KB:

- **dual-story** (`dual-story`)
  > …эпизод dual-story формата с AUTHOR_BLOCK и MACHINE_REPORT, готовый для дальнейшей доработки…
  > …развитие формата dual-story с улучшенной структурой Когда формат начинает жить собственной жизнью…
```

### Пример 2: Несколько терминов

```markdown
## Terms found

Термины извлечены из файлов Stories для добавления в KB:

- **Gateway** (`gateway`)
  > …работы author-gateway с расширенным контекстом Когда контекст становится длиннее…

- **HITL** (`hitl`)
  > …Режим HITL (Human-in-the-Loop) для генерации dual-story…

- **seed_text** (`seedtext`)
  > …Длинный seed_text — это не просто больше слов, это попытка передать сложность мысли…
```

## Связанные документы

- [extractor-stories-terms.mjs](../../scripts/extractor-stories-terms.mjs) — скрипт для извлечения терминов
- [generate-terms-found-block.mjs](../../scripts/generate-terms-found-block.mjs) — скрипт для генерации блока
- [Single Source Playbook](SINGLE-SOURCE-PLAYBOOK.md) — правила работы с Stories
- [CONTRIBUTING.stories.md](stories/CONTRIBUTING.stories.md) — гайд для авторов Stories

