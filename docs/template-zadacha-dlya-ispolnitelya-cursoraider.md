---
title: TEMPLATE — Задача для исполнителя (Cursor/Aider)
slug: template-zadacha-dlya-ispolnitelya-cursoraider
summary: "# TEMPLATE — Задача для исполнителя (Cursor/Aider)\r\n\r\n### Задача\r\n\r\nКоротко, что нужно получить на выходе.\r\n\r\n### Контекст\r\n\r\n- Отсылка на ADR/Spec из notion-brain\r\n- Где менять: пути (docs/**, prototype/**, workflows/**, scripts/**)\r\n\r\n###"
tags: []
machine_tags: []
---
# TEMPLATE — Задача для исполнителя (Cursor/Aider)

### Задача

Коротко, что нужно получить на выходе.

### Контекст

- Отсылка на ADR/Spec из notion-brain
- Где менять: пути (docs/**, prototype/**, workflows/**, scripts/**)

### Технические требования

- Front matter: title/slug/summary/tags/machine_tags
- Стиль коммитов: feat/fix/chore + осмысленное сообщение
- Ограничения по инструментам (например, правим только docs//*.md)

### Чек‑лист принятия

- [ ]  Валидация normalize.mjs локально/в CI
- [ ]  Не менялись правила в notion-brain без ADR
- [ ]  Переименования оформлены (slug стабильный или миграция)
- [ ]  Проходит линтер/превью (если есть)

### Материалы

- Ссылки на примеры «до/после», макеты, прототип
