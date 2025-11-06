---
title: Концепция «портов» — интерфейсы до реализации
slug: koncepciya-portov-interfejsy-do-realizacii
summary: "# Концепция «портов» — интерфейсы до реализации\r\n\r\n### Идея\r\n\r\nПроектируем точки подключения заранее через переменные окружения и конфиги.\r\n\r\n### Пример конфигурации (псевдо‑JSON)\r\n\r\n```json\r\n{\r\n  \"paths\": {\r\n    \"input\": \"${PROJECT_ROOT}/s"
tags: []
machine_tags: []
---
# Концепция «портов» — интерфейсы до реализации

### Идея

Проектируем точки подключения заранее через переменные окружения и конфиги.

### Пример конфигурации (псевдо‑JSON)

```json
{
  "paths": {
    "input": "${PROJECT_ROOT}/sort/vova/drafts/",
    "output": "${PROJECT_ROOT}/data/music/vst/"
  },
  "apis": {
    "llm": "${LLM_ENDPOINT}",
    "parser": "${APIFY_KEY}"
  }
}
```

### Пример .env

```
PROJECT_ROOT=/hdd/vovaipetrova-core
LLM_ENDPOINT=[https://api.openrouter.ai](https://api.openrouter.ai)
```

### Результат

Готовность к развёртыванию на любом железе и быстрая замена провайдеров.

### Связано с…

- Окружения и деплой
- [ADR] Журнал решений
