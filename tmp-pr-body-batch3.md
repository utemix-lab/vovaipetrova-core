## Summary

Доведено internal-missing до 0, уменьшено service до 0, не меняя контент docs/.

## Changes

- Добавлены правила в `prototype/link-map.json` для всех internal-missing ссылок
- Обновлено lint-правило: разрешено использование 'мы' в stories
- Исправлен парсер YAML в `scripts/report-broken-internal-links.mjs` (gray-matter)
- Исправлена YAML ошибка в `docs/stories/stories-v10-content-ready-2025-11-12.md`

## Before / After

| Metric | Before | After |
|--------|--------|-------|
| internal-missing | 14 | **0** ✅ |
| issues_total | 15 | 2 |
| issues_service | 0 | 0 ✅ |
| issues_unknown | 1 | 2 |

## Remaining Issues

Осталось 2 unknown_target ссылки (не internal-missing):
- `vova-i-petrova-ef2871.md`: CSV файл
- `arhitektura-i-komponenty-486a0b.md`: ссылка на service файл

## Acceptance

- ✅ internal-missing = 0
- ✅ service ≤ 5 (0)
- ✅ external помечены ↗ в UI
- ✅ Контент docs/ не изменён

