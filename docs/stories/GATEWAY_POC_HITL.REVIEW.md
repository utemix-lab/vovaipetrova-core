---
title: "Review: Gateway PoC — HITL"
slug: "gateway-poc-hitl-review"
summary: "Короткий чеклист для ревью PoC HITL"
tags: [Story, Review]
machine_tags: [pipeline/poc, review]
status: draft
---

# Review: Gateway PoC — HITL

Файл‑вход для ревью PoC (HITL).

Что проверить:

- Скрипт `scripts/poc/gateway-poc-hitl.mjs` корректно семянит `tmp/ideas.json` и запускает `scripts/author-gateway.mjs --mode=hitl`.
- `docs/stories/GATEWAY_POC_HITL.md` содержит инструкции для запуска и ожидаемый результат.
- Убедиться, что `docs/stories/2025-11-23-seed-dual-story-001.md` парсится и не содержит PII.

Если всё ок — смержите этот Draft PR вручную по контракту (ассистент открывает Draft PR, вы ревью и мердж).

Дата создания: 2025-11-23
