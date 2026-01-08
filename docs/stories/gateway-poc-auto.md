---
title: Gateway PoC — auto (no seed)
slug: gateway-poc-auto
summary: 'PoC: no seed → auto flow for Author Gateway'
tags:
  - Story
machine_tags:
  - content/story
status: draft
---

# Gateway PoC — auto (no seed)

This PoC demonstrates running the gateway in `auto` mode with an empty queue (no seed).

Run the helper script:

```powershell
node scripts/poc/gateway-poc-auto.mjs
```

The script will ensure `tmp/ideas.json` is empty and then run `scripts/author-gateway.mjs --mode=auto`.
