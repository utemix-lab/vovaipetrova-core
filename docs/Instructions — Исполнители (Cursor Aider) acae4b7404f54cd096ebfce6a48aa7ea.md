---
title: Instructions — Исполнители (Cursor/Aider)
slug: instructions-ispolniteli-cursoraider-acae4b
summary: '# Instructions — Исполнители (Cursor/Aider)'
tags: []
machine_tags: []
---
# Instructions — Исполнители (Cursor/Aider)

### Как работать исполнителям

1) Прочитайте папку notion-brain/ (ADR, Specs, context-map.yaml)

2) Вносите изменения ТОЛЬКО в:

- docs/ (контентные .md)
- prototype/ (UI прототип)
- .github/workflows/ (CI)
- scripts/ (normalize и утилиты)

3) Коммиты малыми батчами, осмысленные сообщения

4) Не меняйте правила в notion-brain/ без ADR и согласования

### Чек‑лист перед PR

- Сохранён формат front matter
- slug стабилен или оформлен миграцией
- normalize.mjs проходит на локальной выборке
- pages.yml не трогает docs/

### Быстрый старт

- Aider: ограничение на путь docs//*.md; коммиты по 50 файлов
- Cursor: repo‑scale правки, предварительно сгенерировать diff‑план
