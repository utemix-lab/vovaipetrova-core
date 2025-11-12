---
title: ADR — Теги и фасеты
slug: adr-tegi-i-fasety
summary: >-
  Фасеты: theme/*, action/*, product/*, tool/*, role/*, country/*, producer/*
  Видимые хэштеги: TitleCase_с_подчёркиваниями (#Adobe_Photoshop) Машинотеги:
  живут в front matter (machine_tags[]), скрытывЂ¦
status: draft
tags:
  - Adobe
machine_tags:
  - producer/adobe
---
# ADR — Теги и фасеты

### Решение: модель навигации

- Фасеты: theme/*, action/*, product/*, tool/*, role/*, country/*, producer/*
- Видимые хэштеги: TitleCase_с_подчёркиваниями (#Adobe_Photoshop)
- Машинотеги: живут в front matter (machine_tags[]), скрыты от UI
- Синонимы: aliases → canonical, маппинг в context-map.yaml

### Обоснование

- Разделение «для людей» и «для машины» исключает визуальную путаницу и упрощает поиск
- Фасет country/* покрывает кейсы «флаги/страны» без дублирования тегов

### Следствия

- В UI не показываем слаги типа theme/ml
- В normalize добавляем machine_tags по aliases

Связано: [Навигация (техническая)](navigaciya-tehnicheskaya.md), [Синтаксис и разметка — Markdown → WordPress](sintaksis-i-razmetka-markdown-wordpress.md)
