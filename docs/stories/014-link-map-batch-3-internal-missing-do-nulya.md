---
title: 'Link-map batch-3: internal-missing до нуля'
slug: 014-link-map-batch-3-internal-missing-do-nulya
summary: >-
  Доведение internal-missing до нуля через расширение правил link-map и
  исправление парсера.
tags:
  - Story
machine_tags:
  - content/story
status: draft
last_edited_time: null
---

# Link-map batch-3: internal-missing до нуля

TL;DR

- Доведено internal-missing до нуля через расширение правил link-map.
- Исправлен парсер YAML в report-broken-internal-links.mjs (gray-matter вместо простого regex).
- Добавлены правила для игнорирования file://, ../README.md, URL, маршрутов /kb/ и /nav/.
- Обновлено lint-правило: разрешено использование "мы" в stories.
- Дальше — поддержание нулевого уровня internal-missing и обработка новых случаев.

**Что произошло.** После batch-2 остались 14 internal-missing ссылок, которые требовали дополнительных правил. Расширены правила link-map для обработки всех оставшихся случаев: file://, ../README.md, URL, маршруты /kb/ и /nav/, CSV файлы. Исправлен парсер YAML для корректной обработки front matter.

**Зачем это делали.** Нужно было довести internal-missing до нуля для улучшения качества навигации. Расширение правил позволяет резолвить или игнорировать все проблемные ссылки автоматически, не требуя правок в контент docs/. Исправление парсера обеспечивает корректную обработку всех файлов.

**Что получилось.** Добавлены правила для игнорирования file://, ../README.md, URL, маршрутов /kb/ и /nav/, CSV файлов. Исправлен парсер YAML: используется gray-matter вместо простого regex для корректной обработки пустых массивов и сложных структур. Internal-missing доведён до нуля, issues_total снижен с 15 до 2.

**Тех-вставка.** Исправления описаны в PR "chore: link-map refine (batch-3) - internal-missing to 0". Парсер обновлён в `scripts/report-broken-internal-links.mjs`, правила расширены в `prototype/link-map.json`. Линт-правило обновлено в `scripts/lint-docs.mjs`: убрано "мы с " из запрещённых фраз.

**Что дальше.** После достижения нуля следующий шаг — поддержание нулевого уровня internal-missing и обработка новых случаев по мере появления. Это позволит сохранить качество навигации и автоматически обрабатывать новые проблемные ссылки.

