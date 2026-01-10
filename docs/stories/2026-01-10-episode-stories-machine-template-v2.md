---
title: "Эпизод: Stories machine-template v2"
slug: episode-stories-machine-template-v2
summary: "Упрощение шаблона Stories: front matter + MACHINE_REPORT, AUTHOR_BLOCK = placeholder"
tags:
  - Story
  - Template
machine_tags:
  - content/story
  - tool/template
status: draft
pr_number: 207
pr_url: "https://github.com/utemix-lab/vovaipetrova-core/pull/207"
merged_at: "2026-01-10T18:07:18Z"
---

# Эпизод: Stories machine-template v2

## What

Упрощён шаблон `templates/story.md` для машинной генерации Stories:
- Удалены поля `author_image` и `machine_image` из front matter
- Добавлен блок `## MACHINE_REPORT` для автоматически сгенерированного контента
- Добавлен блок `## AUTHOR_BLOCK` как placeholder в теле документа (не в front matter)
- Front matter теперь содержит только основные метаданные: `title`, `slug`, `summary`, `tags`, `machine_tags`, `status`, `last_edited_time`

## Why

Шаблон стал слишком сложным с вложенными объектами в front matter (`author_image`, `machine_image`). Для машинной генерации нужна более простая структура:
- Front matter должен быть минималистичным и легко парситься
- MACHINE_REPORT — явное место для автогенератора (CHANGELOG, ADR, ProtoLabs stats)
- AUTHOR_BLOCK — placeholder в теле документа, а не в метаданных

## Result

Шаблон стал проще и понятнее:
- ✅ Front matter содержит только необходимые метаданные
- ✅ MACHINE_REPORT — место для автоматической генерации
- ✅ AUTHOR_BLOCK — placeholder в теле документа (не в front matter)
- ✅ Структура соответствует требованиям машинной генерации
- ✅ Совместимость с `generate-stories.mjs` сохранена

## Next

- Автогенератор `generate-stories.mjs` будет использовать новый формат шаблона
- AUTHOR_BLOCK может быть заполнен вручную или через отдельный процесс
- MACHINE_REPORT будет автоматически заполняться данными из CHANGELOG, ADR и ProtoLabs stats
