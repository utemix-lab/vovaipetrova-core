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

### Общие проверки
- [ ] Front matter present in changed .md files
- [ ] slug = filename
- [ ] Links are relative (no percent-encoding)
- [ ] notion_page_id + last_edited_time present (if applicable)
- [ ] Only .github/ **or docs/** modified
- [ ] Deliverables секция заполнена в PR описании
- [ ] Все пункты из Briefs отмечены как Completed или объяснено, почему нет
- [ ] Добавлен соответствующий lane label (`lane:*`) для автоматической проверки конфликтов
- [ ] Проверка размера PR пройдена (`npm run check:pr-size`)
- [ ] Проверка lanes policy пройдена (`npm run check:lanes`)

### Прототип (если изменялись prototype/ или docs/)
- [ ] Rebuild diagnostics выполнен (`npm run diagnostics:snapshot`)
- [ ] Проверено обновление `prototype/data/pages.json`
- [ ] Проверено обновление `prototype/data/orphans.json` (если изменялись routes.yml)
- [ ] Проверено обновление `prototype/data/stats.json`
- [ ] Проверено обновление `prototype/data/broken-links.json`

### Orphan pages (если добавлялись новые страницы в docs/)
- [ ] Проверен список orphan страниц (`npm run routes:check`)
- [ ] Новые страницы добавлены в `routes.yml` (если они не служебные)
- [ ] Или страницы помечены как `service: true` в front matter (если они служебные)
- [ ] Проверено отображение в Explorer → Orphans view (должно быть пусто для публичных страниц)

### Lanes policy
- [ ] Добавлен соответствующий `lane:*` label к PR
- [ ] Проверка one-PR-per-lane пройдена (CI должен быть зелёным)
- [ ] Нет конфликтов с другими открытыми PR в той же lane

### Content quality
- [ ] Summary не пустой и не превышает 300 символов
- [ ] Контент не превышает 50,000 символов (предупреждение) или 100,000 символов (ошибка)
- [ ] Нет PII (пути пользователей, email, телефоны) в контенте
- [ ] Линтер пройден (`npm run lint:docs`)
