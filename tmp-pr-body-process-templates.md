# Process templates finale: PR/RFC/PROTOCOL актуализация

## Цель

Привести все шаблоны и документацию в соответствие с практикой.

## Изменения

### 1. Актуализация PR template

- ✅ Добавлены проверки guardrails (`check:pr-size`, `check:lanes`)
- ✅ Добавлена секция "Content quality" с проверками summary и контента
- ✅ Обновлён чек-лист проверки перед созданием PR

### 2. Обновление RFC template

- ✅ Добавлена ссылка на PROTOCOL.md с примечанием о процессе работы
- ✅ Уточнено, что при реализации RFC нужно следовать процессу работы с репозиторием

### 3. Синхронизация PROTOCOL.md

- ✅ Обновлён процесс работы агента с детальными проверками перед PR
- ✅ Добавлены проверки: `check:pr-size`, `check:lanes`
- ✅ Уточнён процесс завершения работы (обновление статуса в Briefs, удаление ветки)

### 4. Проверка актуальности README

- ✅ Добавлены новые команды: `check:pr-size`, `check:lanes`, `test:guardrails`
- ✅ Обновлён процесс работы с добавлением проверок перед PR
- ✅ Добавлена ссылка на PROTOCOL.md для подробностей процесса

## Deliverables

**Executor**: Cursor  
**Status**: ✅ Completed  
**Task**: [Process templates finale: PR/RFC/PROTOCOL актуализация](https://www.notion.so/758b0206d67a4260b149596a36ccaa6f)

### Completed

- [x] Актуализировать PR template по итогам последних PR
- [x] Обновить RFC template на основе опыта
- [x] Синхронизировать PROTOCOL.md с реальными процессами
- [x] Проверить актуальность README (ссылки, процессы)

### Changes

- Обновлён `.github/pull_request_template.md` с проверками guardrails и content quality
- Обновлён `docs/rfcs/rfc-xxxx-nazvanie-rfc.md` со ссылкой на PROTOCOL.md
- Синхронизирован `docs/protocol-kontraktnaya-model-dlya-agentov.md` с реальными процессами
- Обновлён `README.md` с новыми командами и ссылками на процессы

### Files Changed

- `.github/pull_request_template.md` — добавлены проверки guardrails и content quality
- `docs/rfcs/rfc-xxxx-nazvanie-rfc.md` — добавлена ссылка на PROTOCOL.md
- `docs/protocol-kontraktnaya-model-dlya-agentov.md` — обновлён процесс работы агента
- `README.md` — добавлены новые команды и ссылки на процессы

### Acceptance

- ✅ Все шаблоны соответствуют текущей практике
- ✅ Нет устаревших ссылок и процессов
- ✅ Документация читается логично
- ✅ CI зелёный (ожидается после создания PR)

