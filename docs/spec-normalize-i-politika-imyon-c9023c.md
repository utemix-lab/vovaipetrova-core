---
title: Spec — Normalize и политика имён
slug: spec-normalize-i-politika-imyon-c9023c
summary: '# Spec — Normalize и политика имён'
tags:
  - Автоматизация
  - Кодинг
  - UX
  - Генерация_Видео
machine_tags:
  - theme/automation
  - theme/dev
  - theme/ux
  - theme/graphics
---
# Spec — Normalize и политика имён

### Цель

Единообразие md‑файлов и маршрутов после импорта Notion.

### Политика

- Распаковка: bsdtar, поддержка «двойного ZIP»
- Нормализация: scripts/normalize.mjs
    - перенос #UX, #Генерация_Видео из текста → tags[]
    - дополнение machine_tags по aliases из context-map.yaml
    - проставление title/slug/summary
    - переименование файла по slug → [kebab-case.md](http://kebab-case.md)
- Стабильность путей: не меняем slug без явной миграции (редиректы на уровне сборки)

### Проверки

- Отсутствуют дубликаты slug в одном разделе
- Нет «кракозябр» в названиях (Unicode → OK)

Связано: [README (черновик) для корня GitHub](https://www.notion.so/README-GitHub-98c47949f1244855b37edba741b2ada9?pvs=21)
