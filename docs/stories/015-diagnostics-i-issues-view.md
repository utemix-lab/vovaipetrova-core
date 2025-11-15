---
title: Diagnostics и issues view
slug: 015-diagnostics-i-issues-view
summary: Создание системы диагностики проблемных ссылок и issues view в Explorer.
tags:
  - Story
machine_tags:
  - content/story
status: draft
last_edited_time: null
---

# Diagnostics и issues view

TL;DR

- Создана система диагностики проблемных ссылок через generate-stats.mjs.
- Статистика включает totals, topProblems и issuesPerPage с scoring.
- Explorer получил отдельный таб Issues для показа проблемных страниц.
- Scoring учитывает приоритеты: internal-missing × 3, service × 2, unknown × 1.
- Дальше — развитие диагностики и добавление новых метрик для оценки качества.

**Что произошло.** После создания link-map потребовалась система для отслеживания проблемных ссылок и оценки качества навигации. Создан скрипт `scripts/generate-stats.mjs` для генерации статистики из broken-links.json. Explorer получил отдельный таб Issues для показа проблемных страниц с scoring.

**Зачем это делали.** Нужна была возможность видеть проблемные страницы и приоритизировать работу по их исправлению. Scoring позволяет ранжировать страницы по важности проблем, а issues view даёт быстрый доступ к страницам с наибольшим количеством broken links.

**Что получилось.** Статистика включает totals (pages, statuses, issues по типам), topProblems (топ-4 проблемные страницы), issuesPerPage (полный список с scoring). Explorer получил таб Issues с карточками проблемных страниц, показывающими score, количество issues по типам и ссылку на страницу. Scoring учитывает приоритеты проблем.

**Тех-вставка.** Скрипт описан в `scripts/generate-stats.mjs`, статистика сохраняется в `prototype/data/stats.json`. Issues view реализован в `prototype/app.js` через функцию `renderIssues()`. Карточки проблемных страниц создаются через `createIssueCard()` с отображением score и деталей issues.

**Что дальше.** После создания диагностики следующий шаг — развитие системы и добавление новых метрик для оценки качества. Это позволит лучше отслеживать состояние навигации и приоритизировать работу по исправлению проблем.

