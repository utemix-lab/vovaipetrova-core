---
title: Gateway PoC — HITL (seed_text)
slug: gateway-poc-hitl
summary: PoC: seed_text → human-in-the-loop flow for Author Gateway
tags: [Story]
machine_tags: [content/story]
status: draft
---

# Gateway PoC — HITL (seed_text)

This PoC demonstrates seeding an idea into `tmp/ideas.json` and running `scripts/author-gateway.mjs --mode=hitl`.

Run the helper script:

```powershell
node scripts/poc/gateway-poc-hitl.mjs
```

The script will write an approved idea into `tmp/ideas.json`, then invoke the gateway in HITL mode. The generator will create a draft in `docs/stories/` for manual review.
