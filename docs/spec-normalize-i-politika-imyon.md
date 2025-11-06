---
title: Spec — Normalize и политика имён
slug: spec-normalize-i-politika-imyon
summary: "# Spec — Normalize и политика имён\r\n\r\n### Цель\r\n\r\nЕдинообразие md‑файлов и маршрутов после импорта Notion.\r\n\r\n### Политика\r\n\r\n- Распаковка: bsdtar, поддержка «двойного ZIP»\r\n- Нормализация: scripts/normalize.mjs\r\n    - перенос #Хэштегов из "
tags:
  - Хэштегов
machine_tags: []
---
# Spec — Normalize и политика имён

### Цель

Единообразие md‑файлов и маршрутов после импорта Notion.

### Политика

- Распаковка: bsdtar, поддержка «двойного ZIP»
- Нормализация: scripts/normalize.mjs
    - перенос #Хэштегов из текста → tags[]
    - дополнение machine_tags по aliases из context-map.yaml
    - проставление title/slug/summary
    - переименование файла по slug → [kebab-case.md](http://kebab-case.md)
- Стабильность путей: не меняем slug без явной миграции (редиректы на уровне сборки)

### Проверки

- Отсутствуют дубликаты slug в одном разделе
- Нет «кракозябр» в названиях (Unicode → OK)

Связано: [README (черновик) для корня GitHub](https://www.notion.so/README-GitHub-98c47949f1244855b37edba741b2ada9?pvs=21)
