---
title: 'Автопилот: Notion → Cursor → GitHub'
slug: 04-avtopilot-notion-cursor-github
summary: Как мы сняли требование ручных аппрувов и научили Cursor закрывать цикл сам.
tags:
  - Story
machine_tags:
  - content/story
status: draft
last_edited_time: 2025-11-14T09:30:00.000Z
---

# Автопилот: Notion → Cursor → GitHub

TL;DR

- Упрощена branch protection, снята лишняя защита ветки.
- Автопилот читает Briefs, создаёт ветку, ждёт Docs CI и мержит сам.
- Карточка Briefs обновляется автоматически после merge.
- Токен с нужными правами хранится в `.cursor/secrets.json`, sanity-check фиксируем в PR.
- Теперь можно сосредоточиться на витрине и новой аудитории.

**Что произошло.** Упрощена branch protection: оставлен только Docs CI в Required checks, approvals обнулены. Теперь Cursor берёт задачу из Briefs, делает ветку и мержит сам.

**Зачем это делали.** Проект идёт в темпе, а человеческое подтверждение нужно только на уровне содержания. Автопилот освобождает время: формируется бриф, а после merge получается готовый результат, проверка нужна только на смысловом уровне.

**Что получилось.** В инструкциях Cursor прописано: зелёный CI — сразу merge, затем обновить карточку Briefs (Deliverables, PR link, Status=Done). Полный цикл — от Ready до Done — занимает пару часов без простоя.

**Тех-вставка.** Токен, лежащий в `C:\Users\<user>\.cursor\secrets.json`, имеет права push и merge. Мы задокументировали sanity-check в PR: API `/branches/main/protection` возвращает 404 без admin scope, поэтому подтверждаем текстом, что включён только Docs CI.

**Что дальше.** Когда рутина снята, можно заняться витриной. Следующий эпизод — как Explorer отделили от Think Tank, чтобы показать истории наружу.

