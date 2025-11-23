## Описание изменений

Добавлен гайд для авторов и редакторов Stories (`docs/CONTRIBUTING.stories.md`), который описывает процесс создания и редактирования эпизодов Stories, включая dual-story формат и проверки качества.

## Deliverables

**Executor**: GitHub Copilot  
**Status**: ✅ Completed  
**Task**: docs/CONTRIBUTING.stories.md — гайд для авторов/редакторов (dual-story, проверки)

**Two-stream Sync Status**:
- [ ] Задача не из Notion (только GitHub Issue) — синхронизация не требуется

### Completed
- [x] Создан документ docs/CONTRIBUTING.stories.md с гайдом для авторов и редакторов
- [x] Описаны форматы эпизодов (обычный и dual-story)
- [x] Описан процесс создания эпизода (шаги 1-5)
- [x] Добавлены правила оформления и Safety Rails
- [x] Описаны проверки и валидации (автоматические и локальные)
- [x] Добавлен чек-лист перед PR
- [x] Добавлены ссылки на связанные документы

### Changes
- Создан новый документ docs/CONTRIBUTING.stories.md с полным гайдом для работы со Stories
- Исправлены баги в scripts/extractor-stories-terms.mjs (undefined переменные)
- Улучшена обработка ссылок в scripts/report-broken-internal-links.mjs
- Убрано ложное PII-срабатывание в docs/stories/SHARED_CONTEXT.md

### Files Changed
- docs/CONTRIBUTING.stories.md — новый гайд для авторов и редакторов Stories
- scripts/extractor-stories-terms.mjs — исправлен парсинг аргументов
- scripts/report-broken-internal-links.mjs — улучшена обработка ссылок вне docs/
- docs/stories/SHARED_CONTEXT.md — убрано ложное PII-срабатывание
- package.json — исправлен дубликат scripts секции

### Metrics
- Создан 1 новый документ (309 строк)
- Покрыты все аспекты работы со Stories: форматы, процесс, правила, проверки
- Исправлено 3 бага в скриптах автоматизации

### Problems Encountered
- Нет

### Proposals
- Нет
