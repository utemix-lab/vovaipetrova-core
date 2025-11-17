## Описание изменений

{Краткое описание того, что было сделано}

**Связанная задача**: {Ссылка на Notion Briefs или GitHub Issue}

**Lane Label**: {Добавьте соответствующий label при создании PR: `lane:docs`, `lane:infra`, `lane:stories`, `lane:characters`, `lane:qa`, `lane:refactor`, `lane:fix`, `lane:feat`}

## Deliverables

**Executor**: {Имя агента или исполнителя, например: Cursor, CodeGPT Docs Agent}  
**Status**: ✅ Completed | ⏳ In Progress | ❌ Blocked  
**Task**: {Ссылка на задачу в Notion Briefs или Issue}

### Completed
- [ ] {Пункт 1 из списка Deliverables из Briefs}
- [ ] {Пункт 2 из списка Deliverables из Briefs}

### Changes
- {Описание изменений 1}
- {Описание изменений 2}

### Files Changed
- `path/to/file1.md` — {описание изменений}
- `path/to/file2.js` — {описание изменений}

### PRs Created
- {Номер PR} — {название PR} (если создавались связанные PR)

### Metrics
- {Метрика 1, если применимо, например: "Создано 5 новых файлов"}
- {Метрика 2, если применимо, например: "Исправлено 10 broken links"}

### Problems Encountered
- {Проблема 1, если была, например: "Конфликт с веткой main"}
- {Проблема 2, если была}

### Proposals
- {Предложение по улучшению, если есть, например: "Добавить автоматическую проверку Deliverables в CI"}

---

## Чек-лист проверки

- [ ] Front matter present in changed .md files
- [ ] slug = filename
- [ ] Links are relative (no percent-encoding)
- [ ] notion_page_id + last_edited_time present (if applicable)
- [ ] Only .github/ **or docs/** modified
- [ ] Deliverables секция заполнена в PR описании
- [ ] Все пункты из Briefs отмечены как Completed или объяснено, почему нет
- [ ] Добавлен соответствующий lane label (`lane:*`) для автоматической проверки конфликтов
