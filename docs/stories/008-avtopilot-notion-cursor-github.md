---
title: 'Автопилот: Notion ↔ Cursor ↔ GitHub'
slug: 008-avtopilot-notion-cursor-github
summary: Автоматизация полного цикла от задачи в Briefs до merge в main через Cursor.
tags:
  - Story
machine_tags:
  - content/story
status: ready
last_edited_time: null
---

# Автопилот: Notion ↔ Cursor ↔ GitHub

TL;DR

- Упрощена branch protection: только Docs CI в Required checks, approvals обнулены.
- Cursor читает задачи из Briefs, создаёт ветку, ждёт зелёного CI и мержит сам.
- Карточка Briefs обновляется автоматически после merge через Notion API.
- Токен с правами push и merge хранится в secrets.json, sanity-check фиксируется в PR.
- Дальше — усиление автоматизации и расширение возможностей автопилота.

**Что произошло.** После настройки импорта и нормализации потребовалась автоматизация полного цикла от задачи в Briefs до merge в main. Упрощена branch protection: оставлен только Docs CI в Required checks, approvals обнулены. Cursor получил возможность читать задачи из Briefs и выполнять их автоматически.

**Зачем это делали.** Проект идёт в темпе, а человеческое подтверждение нужно только на уровне содержания. Автопилот освобождает время: формируется бриф, а после merge получается готовый результат. Проверка нужна только на смысловом уровне, технические проверки выполняет CI.

**Что получилось.** В инструкциях Cursor прописано: зелёный CI — сразу merge, затем обновить карточку Briefs через Notion API. Полный цикл — от Ready до Done — занимает пару часов без простоя. Токен с правами push и merge хранится в secrets.json, sanity-check фиксируется в PR описании.

**Тех-вставка.** Токен лежит в `C:\Users\<user>\.cursor\secrets.json` с правами push и merge. API `/branches/main/protection` возвращает 404 без admin scope, поэтому подтверждаем текстом, что включён только Docs CI. Обновление Briefs происходит через Notion API с указанием Deliverables, PR link и Status=Done.

**Что дальше.** После настройки автопилота следующий шаг — усиление автоматизации и расширение возможностей. Это позволит автоматизировать больше рутинных задач и ускорить цикл разработки.

