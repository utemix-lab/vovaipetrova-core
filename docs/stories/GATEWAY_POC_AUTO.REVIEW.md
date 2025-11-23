# Review: Gateway PoC — auto

Небольшая подсказка для ревью: этот PoC запускает генератор без seed‑идеи (auto), проверите пожалуйста поведение и логи.

Проверьте:
- `scripts/poc/gateway-poc-auto.mjs` очищает/подготавливает `tmp/ideas.json` и вызывает `scripts/author-gateway.mjs --mode=auto`.
- Наличие ожидаемых файлов в `tmp/` (`story-meta.json`, `story-report.json`).

Дата создания: 2025-11-23
