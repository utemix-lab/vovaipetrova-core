---
title: TEMPLATE — Задача для исполнителя (Cursor/Aider)
slug: template-zadacha-dlya-ispolnitelya-cursoraider
summary: >-
  Шаблон задачи для агентов Cursor/Aider: структура постановки, требования и
  чек-лист принятия.
tags:
  - Автоматизация
  - Кодинг
  - Проектирование
machine_tags:
  - action/build
  - product/services
  - theme/automation
  - theme/dev
  - theme/graphics
status: review
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
