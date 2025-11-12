---
title: TEMPLATE — PR чек‑лист
slug: template-pr-cheklist-3a6077
summary: '# TEMPLATE — PR чек‑лист'
status: draft
tags: []
machine_tags: []
---
# TEMPLATE — PR чек‑лист

### Перед PR

- [ ]  Только нужные пути затронуты (docs/**, prototype/**, .github/workflows/**, scripts/**)
- [ ]  Front matter валиден, нет пустых slug/summary
- [ ]  Нет кракозябр в именах файлов; slug → kebab-case
- [ ]  Нормализатор не меняет файл «сам по себе» при повторном запуске
- [ ]  Деплой Pages не триггерится правками docs/ (проверить paths)

### После PR

- [ ]  Ссылка на предпросмотр (Pages/Netlify/Vercel)
- [ ]  Комментарий «что именно менять в Notion при обратной синхронизации» (если нужно)
