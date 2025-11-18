## Summary

Дополировка Explorer после batch-3: добавлена кнопка "Back to list", улучшены визуальные стили, обновлены диагностические данные.

## Changes

### Navigation
- ✅ Добавлена кнопка "← Back to list" на страницах документов и эпизодов
- ✅ Кнопка сохраняет текущую сортировку и фильтры (sort, ready-only, tag-filter)
- ✅ Параметры читаются из URL query string и localStorage

### Visual Polish
- ✅ Выравнивание карточек по сетке (consistent gap, padding)
- ✅ Активный tag-chip — более заметный контраст с тенью
- ✅ Улучшен hover для tag-chips
- ✅ Компактные breadcrumbs: скрыт разделитель на узких экранах, оставлена кнопка Back
- ✅ Адаптивная сетка карточек для мобильных устройств

### Diagnostics Refresh
- ✅ Пересобраны `prototype/data/stats.json` и `broken-links.json`
- ✅ Статистика соответствует значению после batch-3

## Diagnostics Summary

| Metric | Value |
|--------|-------|
| **internal-missing** | **0** ✅ |
| **issues_service** | **0** ✅ |
| **issues_external** | 0 |
| **issues_unknown** | 2 |
| **issues_total** | **2** |

## Acceptance

- ✅ Back to list возвращает к списку с сохранёнными сортировкой/фильтрами
- ✅ Карточки и фильтры выглядят аккуратно на мобиле и desktop
- ✅ Статистика соответствует значению после batch-3 (internal-missing=0, issues_total=2)

