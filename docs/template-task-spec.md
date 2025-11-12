---
title: TEMPLATE — Task spec
slug: template-task-spec
summary: >-
  Шаблон постановки технической задачи с путями правок, требованиями и
  чек-листом приёмки.
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
# TEMPLATE — Task spec

### Что нужно сделать (результат)

1–2 предложения о желаемом выходе. Пример: «Добавить страницу услуги X по шаблону, связать с фасетами и включить в индексы».

### Где менять

- Путь(и): docs/ **или prototype/** или workflows/**, scripts/**
- Ограничения (не менять): notion-brain/

### Требования

- Front matter: title, slug, summary, tags (TitleCase_с_подчёркиваниями), machine_tags
- Слоги: kebab-case, стабильные маршруты
- Вставки ссылок: [[WikiLinks]] или относительные /kb/...
- Проверка normalize.mjs проходит

### Чек‑лист приёмки

- [ ]  Файл(ы) созданы/обновлены в нужных путях
- [ ]  Локально прошёл normalize без диффов
- [ ]  Нет «кракозябр», slug корректный
- [ ]  Добавлены ссылки в оглавления/индексы при необходимости
- [ ]  PR содержит предпросмотр (Pages/Vercel/Netlify)

### Ссылки на контекст

- ADR: ...
- Spec: ...
- Примеры «до/после»: ...
