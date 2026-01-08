---
title: Stories · v1.0-content-ready — 2025-11-12
slug: 2025-11-23-stories-v10-content-ready-2025-11-12
summary: 'Черновик автогенератора Stories: синхронизация CHANGELOG, ADR и ProtoLabs.'
tags:
  - Story
machine_tags:
  - content/story
status: draft
last_edited_time: ''
author_image:
  url: 'https://via.placeholder.com/800x450?text=author'
  status: placeholder
  uploaded_by: null
  uploaded_at: null
machine_image:
  url: 'https://via.placeholder.com/800x450?text=machine'
  status: placeholder
  uploaded_by: null
  uploaded_at: null
---
# Stories · v1.0-content-ready — 2025-11-12

TL;DR

- Продолжаем v1.0-content-ready — 2025-11-12: Зафиксировано контентное ядро: 24 страницы со статусом `ready`, остальные в `draft` с заполненными summary и метками.
- ProtoLabs: 83 страниц под мониторингом (Ready 36)
- Связано с ADR: ADR — Source of truth и зеркалирование
- Черновик расписан на 2025-11-23

**Что произошло.** Выполнение блока **v1.0-content-ready — 2025-11-12** отмечено в change-log: Зафиксировано контентное ядро: 24 страницы со статусом `ready`, остальные в `draft` с заполненными summary и метками.; В репозиторий добавлены скрипты для нормализации, обогащения тегов, чистки ссылок и финального линта.. Опорным контекстом остаётся ADR «ADR — Source of truth и зеркалирование», который подчёркивает: Источник истины — Notion. Репозиторий — зеркало для исполнения и публикации. Ранний этап требует скорости вносить массовые правки и фиксировать архитектуру Нужны предпросмотры (Pages) и истории измвЂ¦
**Зачем это делали.** Stories нужны как публичная лента: она переводит сухие Deliverables в читабельные эпизоды и помогает держать синхрон между Think Tank и Explorer без персоналий.
**Что получилось.** В витрине сейчас 36 страниц в статусе ready и 40 оформленных draft — показатели подтягиваются напрямую из ProtoLabs. Список top problems не изменился по сравнению с предыдущим днём.
**Тех-вставка.** Шаблон stories остаётся нейтральным по авторству; lint предупреждает при персоналиях. Черновик собирается автоматически из CHANGELOG, ADR и ProtoLabs stats, чтобы отвечать требованию 700–1200 знаков без ручного копипаста.
**Что дальше.** Автоген продолжит выпускать по одному черновику в сутки и ждать review через Pull Request, пока не появятся новые Deliverables или milestone.
