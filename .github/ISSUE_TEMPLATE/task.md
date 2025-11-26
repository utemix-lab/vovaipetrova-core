---
name: Task
about: Create a task issue for tracking work
title: '[Task] '
labels: ''
assignees: ''
---

## Task Description

{Describe the task clearly and concisely}

## Related

- **Notion Brief**: {Link to Notion Briefs card, if applicable}
- **RFC**: {Link to RFC, if applicable}
- **Upstream Source**: {Ideas & Proposals | RFC | Incident | Metrics}

## Two-stream Policy

**Stream Type**:
- [ ] Stream 2 (GitHub → Notion): Работа агента с синхронизацией статусов в Notion

**Синхронизация статусов**:
- [ ] Задача создана в Notion Briefs (требуется синхронизация статусов)
- [ ] Статус будет синхронизироваться: `Ready` → `In Progress` → `Review` → `Done`

## Scope

- [ ] {Scope item 1}
- [ ] {Scope item 2}
- [ ] {Scope item 3}

## Deliverables

- [ ] {Deliverable 1}
- [ ] {Deliverable 2}
- [ ] {Deliverable 3}

## Lane

Select appropriate lane label:

**Standard lanes:**
- `lane:docs` — documentation work
- `lane:infra` — infrastructure, workflows, scripts
- `lane:feat` — new features
- `lane:fix` — bug fixes
- `lane:refactor` — code refactoring
- `lane:stories` — Stories episodes
- `lane:characters` — character work
- `lane:qa` — quality assurance
- `lane:composer` — Composer tasks (isolated lane)

**Copilot lanes:**
- `lane:copilot` — GitHub Copilot tasks (general)
- `lane:copilot:docs` — Copilot documentation tasks
- `lane:copilot:infra` — Copilot infrastructure tasks
- `lane:copilot:stories` — Copilot Stories tasks
- `lane:copilot:refactor` — Copilot refactoring tasks
- `lane:copilot:feat` — Copilot feature tasks
- `lane:copilot:fix` — Copilot bug fix tasks

## Sequence

If this task is part of a sequence, add sequence label:
- `seq:1`, `seq:2`, `seq:3`, ..., `seq:15` (up to 15 steps)

## Executor

- [ ] Cursor
- [ ] GitHub Copilot
- [ ] Manual

## Additional Context

{Add any other context, screenshots, or references}

