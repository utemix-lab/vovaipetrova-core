## Docs hygiene: PR template checklist + orphan how-to

### Цель
Улучшить документацию процесса работы с PR и orphan страницами.

### Изменения

#### 1. PR template checklist
- ✅ Добавлен новый раздел "Orphan pages" в чеклист PR template
- ✅ Чеклист включает проверку orphan страниц при добавлении новых страниц в docs/
- ✅ Указаны действия: добавление в routes.yml или пометка как service: true

#### 2. Orphan how-to документация
- ✅ Создан новый файл `docs/nav/orphans-how-to.md` с полной инструкцией
- ✅ Документация включает:
  - Что такое orphan страницы
  - Как проверить orphan страницы
  - Что делать с orphan страницами (3 варианта)
  - Примеры использования
  - Частые вопросы
- ✅ Добавлена ссылка на новую документацию в `routes-yml-how-to.md`
- ✅ Новая страница добавлена в `routes.yml` (раздел /nav)

### Scope
- `.github/pull_request_template.md` — обновлён чеклист
- `docs/nav/orphans-how-to.md` — новая документация
- `docs/nav/routes-yml-how-to.md` — добавлена ссылка на orphans-how-to
- `docs/nav/routes.yml` — добавлена запись для новой страницы

### Тестирование
- [x] Проверен линтер (нет ошибок)
- [x] Новая страница добавлена в routes.yml
- [x] Документация соответствует стандартам проекта

