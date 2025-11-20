---
title: "Spec — Normalize и политика имён"
slug: spec-normalize-i-politika-imyon-c9023c
summary: >-
  Правила нормализации экспорта из Notion: как работает скрипт и какие
  ограничения на slug.
tags: []
machine_tags: []
status: ready
service: true
---
# Spec — Normalize и политика имён

## TL;DR
- Скрипт `normalize.mjs` приводит экспорт к канону: slug, summary, теги.  
- Алиасы из `docs/nav/tags.yaml` попадают в machine_tags.  
- Стабильность путей гарантируется редиректами и запретом «ручных» переименований.  
- Проверки ловят дубликаты slug и «кракозябр» в именах файлов.

## Политика нормализации
- Распаковка архивов через `bsdtar` (поддержка двойного ZIP).  
- Перенос видимых хэштегов в `tags[]`, машинных — в `machine_tags[]`.  
- Автогенерация `title`, `slug`, `summary`, `status` по шаблонам.  
- Переименование файла по slug → `kebab-case.md`.

## Проверки
- Отсутствие дубликатов slug в одном разделе.  
- Unicode допускается, но slug только латиница + дефис.  
- Проверка соответствия slug ↔ имя файла и ссылок внутри контента.

## Миграции и редиректы
- Переименование slug требует миграции и обновления ссылок.  
- Таблица редиректов хранится отдельно и загружается при сборке.  
- На PR обязательно прикладываем список затронутых slug.

## Связано с…
- [Spec — Front matter и слуги](spec-front-matter-i-slugi-91237c.md)
- [Spec — Content linter и scaffold (черновик)](spec-content-linter-i-scaffold-chernovik.md)
- [Process: Обсудили → Разложили → Связали](process-obsudili-razlozhili-svyazali.md)
- [Навигация (техническая)](navigaciya-tehnicheskaya.md)
