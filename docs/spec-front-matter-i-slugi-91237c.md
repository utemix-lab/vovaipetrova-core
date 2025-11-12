---
title: Spec — Front matter и слуги
slug: spec-front-matter-i-slugi-91237c
summary: '``` --- title: Строка'
status: draft
tags: []
machine_tags: []
service: true
---
# Spec — Front matter и слуги

### Формат front matter (YAML)

```
---
title: Строка
slug: kebab-case
summary: Краткое описание (до ~240 символов)
tags: ["Генерация_Видео","UX"]
machine_tags: ["theme/ux","tool/nextjs"]
date: YYYY-MM-DD
---
```

### Правила

### Примеры — до / после

- До (сырой экспорт из Notion):

```markdown
# Flux
Cтраница о Flux...

#UX #Генерация_Видео
```

- После normalize (front matter + чистый текст):

```yaml
---
title: Flux
slug: flux
summary: Страница о Flux...
tags: ["UX","Генерация_Видео"]
machine_tags: ["theme/ux"]
date: 2025-11-04
---
```

Текст страницы...

- title обязателен; если отсутствует, берём H1
- slug — kebab-case от title; стабильный маршрут
- tags — видимые хэштеги (TitleCase_с_подчёркиваниями)
- machine_tags — скрытые фасеты; не выводятся на сайте
- summary — первый непустой абзац, усечение 240

Связано: [Синтаксис и разметка — Markdown → WordPress](sintaksis-i-razmetka-markdown-wordpress-60cc6c.md), [Навигация (техническая)](navigaciya-tehnicheskaya.md)
