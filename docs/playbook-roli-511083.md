---
title: Playbook — Роли
slug: playbook-roli-511083
summary: '# Playbook — Роли'
status: draft
tags: []
machine_tags: []
---
# Playbook — Роли

### Архитектор

- Пишет Vision, ADR, Specs в notion-brain
- Формирует Task spec

### Исполнитель (Cursor/Aider)

- Читает notion-brain
- Вносит правки в docs/prototype/workflows/scripts
- Делает небольшие осмысленные коммиты, PR с предпросмотром

### Редактор контента

- Проверяет язык, хэштеги (канон), связность
- Обновляет видимые оглавления

### Поток

Vision → ADR → Spec → Task spec → Scaffold → PR → Normalize CI → Preview → Merge/Deploy

### Правила коммитов

- feat/fix/chore + контекст; батчи до ~50 файлов для контента
