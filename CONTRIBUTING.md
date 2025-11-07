# Contributing to Vova & Petrova — Docs

## Поток работы

### Импорт из Notion

1. **Экспорт из Notion** → ZIP архив
2. **Создай ветку**: `git checkout -b notion-sync/YYYY-MM-DD`
3. **Положи ZIP** в `uploads/` и закоммить
4. **Push** → автоматически создастся PR
5. **CI проверки** → Docs CI запустится автоматически
6. **Review** → проверь изменения в PR
7. **Merge** → после approval и зелёных проверок

### Правила PR

- ✅ Менять только `docs/` (кроме `.github/` и `scripts/`)
- ✅ Front matter обязателен в каждом `.md` файле
- ✅ `slug` = имя файла (kebab-case)
- ✅ Ссылки относительные, без percent-encoding
- ✅ `notion_page_id` + `last_edited_time` должны быть (если импорт из Notion)

### Локальные команды

```bash
# Просмотр изменений без применения
npm run normalize:dry

# Нормализация: front matter, slug, tags
npm run normalize

# Проверка качества документов
npm run lint:docs

# Строгий режим: missing tags = ошибки
npm run lint:docs:strict

# Проверка внутренних ссылок (404 = fail)
npm run check:links

# Отчёт по тегам без alias
npm run report:no-alias
```

### Как завести задачу

- **GitHub Issues**: создай issue с описанием задачи
- **Tasks/**: если есть папка `tasks/`, можно добавить `.md` файл с описанием

### CI проверки

- **Docs CI / lint-and-links**: проверяет front matter, ссылки, нормализацию
- **Link check**: проверяет внутренние ссылки (404 = ошибка)
- **No-alias report**: предупреждения по тегам без alias (не блокирует)

### Дополнительно

- См. [README.md](README.md) для общей информации
- См. `docs/.import-map.yaml` для правил импорта из Notion

