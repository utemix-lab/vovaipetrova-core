## Explorer: shareable filters, tag pages, mini UX polish 3

### Цель
Улучшить навигацию и UX Explorer.

### Изменения

#### 1. Shareable filters
- ✅ Кодирование выбранных сортировки/фильтров/тега в URL (query/hash)
- ✅ Кнопка "Copy link" для копирования текущего URL с фильтрами
- ✅ Восстановление фильтров из URL при открытии страницы

#### 2. Tag pages
- ✅ Маршрут `/tags/<tag>` через hash `#tags/<tag>`
- ✅ Автоприменение фильтра по тегу при открытии страницы тега
- ✅ Breadcrumbs на странице тега
- ✅ Обновление заголовка страницы для тега

#### 3. Mini UX polish 3
- ✅ Улучшено выравнивание карточек (`align-items: stretch`)
- ✅ Оптимизированы отступы на мобильных устройствах
- ✅ Добавлен hover эффект для ready-only-toggle
- ✅ Исправлена проблема с дублированием breadcrumbs

### Тестирование
- [x] Фильтры восстанавливаются из URL при открытии
- [x] Copy link работает корректно
- [x] Страница `/tags/<tag>` показывает карточки по тегу и breadcrumbs
- [x] Мобильная версия работает корректно

### Scope
- `prototype/index.html` (без изменений)
- `prototype/app.js` (обновлена логика tag pages и breadcrumbs)
- `prototype/styles.css` (улучшено выравнивание и отступы)

