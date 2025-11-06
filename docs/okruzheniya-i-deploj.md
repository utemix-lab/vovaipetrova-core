---
title: Окружения и деплой
slug: okruzheniya-i-deploj
summary: "# Окружения и деплой\r\n\r\n### TL;DR\r\n\r\nОкружения, конфиги и процессы деплоя.\r\n\r\n### Матрица окружений\r\n\r\n- Dev: локально Docker Compose\r\n- Staging: VPS Docker Compose, автодеплой из main\r\n- Prod: VPS Docker Compose, ручной апрув релиза\r\n- Dev"
tags:
  - Next_js
  - WordPress
  - FastAPI
machine_tags:
  - tool/nextjs
  - tool/wordpress
  - tool/fastapi
---
# Окружения и деплой

### TL;DR

Окружения, конфиги и процессы деплоя.

### Матрица окружений

- Dev: локально Docker Compose
- Staging: VPS Docker Compose, автодеплой из main
- Prod: VPS Docker Compose, ручной апрув релиза
- Dev, Staging, Prod: цели, домены, размерности

### Конфигурация

- .env.example
- Секреты и хранение

### Деплой

- Docker/docker‑compose
- CI/CD пайплайн
- Чек‑лист релиза

### Связано с…

-
