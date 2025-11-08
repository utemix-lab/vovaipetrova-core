---
title: context-map.yaml
slug: context-map-yaml
summary: "# context-map.yaml\r\n\r\n```yaml\r\nfacets:\r\n  theme: [theme/ml, theme/nlp, theme/graphics, theme/ux, theme/automation]\r\n  action: [action/learn, action/build, action/evaluate, action/publish, action/debug]\r\n  product: [product/site, product/thi"
tags: []
machine_tags: []
service: true
---
# context-map.yaml

```yaml
facets:
  theme: [theme/ml, theme/nlp, theme/graphics, theme/ux, theme/automation]
  action: [action/learn, action/build, action/evaluate, action/publish, action/debug]
  product: [product/site, product/think-tank, product/kb, product/portfolio, product/artifacts, product/services]
  tool: [tool/nextjs, tool/fastapi, tool/wordpress, tool/transformers, tool/stable-diffusion, tool/figma]
  role: [role/novice, role/client, role/dev, role/editor]
  country: [country/ru, country/us, country/jp, country/de, country/gb]
aliases:
  "UX": ["theme/ux"]
  "Генерация_Видео": ["theme/graphics"]
  "Айдентика": ["theme/graphics", "product/services"]
  "Видео": ["theme/graphics", "product/services"]
  "Монтаж": ["action/build", "product/services"]
policies:
  visible_tags: TitleCase_with_underscores
  machine_tags_hidden: true
  slug_case: kebab-case
```
