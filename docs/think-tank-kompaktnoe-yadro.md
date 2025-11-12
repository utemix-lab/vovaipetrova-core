---
title: Think Tank — компактное ядро
slug: think-tank-kompaktnoe-yadro
summary: >-
  Каркас Think Tank: четыре файла с контекстом, которые синхронизируют Notion и
  GitHub.
tags:
  - Автоматизация
  - Проектирование
  - UX
machine_tags:
  - theme/automation
  - action/build
  - product/think-tank
  - theme/dev
  - theme/ux
  - product/services
  - theme/graphics
status: ready
---
# Think Tank — компактное ядро

## TL;DR
- Четыре файла (goals, organization, agents, focus) задают основу Think Tank.
- Notion — источник истины, GitHub — зеркало для публикации и предпросмотра.
- Любые изменения проходят путь Notion → экспорт → PR → деплой.
- Навигация связывает ядро с услугами, артефактами и процессами.

## Принцип
- Место правды: рабочий воркспейс Notion.  
- GitHub хранит синхронизированную копию для превью, статического прототипа и CI.  
- Репозиторий не меняет структуру — только отражает её.

## Структура ядра
- `goals.md` — цели, философия, KPI.  
- `organization.md` — инфраструктура, стэк, пайплайны.  
- `agents.md` — реестр LLM-агентов и их зоны ответственности.  
- `focus.md` — текущие приоритеты и дорожная карта.

## Связь с Notion
- Быстрый переход: [Индекс сайта](indeks-sajta.md) • [Контент‑модель и маршруты](kontentmodel-i-marshruty.md) • [Навигация (пользовательская)](navigaciya-polzovatelskaya.md).  
- Процесс: [Процесс: Обсудили → Разложили → Связали](process-obsudili-razlozhili-svyazali.md).  
- Страницы в Notion синхронизируются целиком; частичных правок в GitHub нет.

## Версии и опорные узлы
- Версия 1 (3 ноября 2025): зафиксированы узлы навигации и CTA.  
- Опорные разделы: Think Tank, Услуги, База знаний, Портфолио, Артефакты.  
- Любые изменения ядра сопровождаем обновлением связей и TL;DR.

## Связано с…
- [Think Tank — витрина процесса](think-tank-vitrina-processa.md)
- [Индекс и TL;DR](indeks-i-tldr.md)
- [Навигация (техническая)](navigaciya-tehnicheskaya.md)
- [Услуги](uslugi.md)
- [Артефакты — корзина и заявка (MVP)](artefakty-korzina-i-zayavka-mvp.md)
