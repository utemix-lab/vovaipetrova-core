---
title: Spec — Content linter и scaffold (черновик)
slug: spec-content-linter-i-scaffold-chernovik
summary: >-
  Черновой план для контент-линтера и генератора шаблонов: проверки, CLI и
  следующие шаги.
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - theme/automation
  - theme/dev
status: draft
---
# Spec — Content linter и scaffold (черновик)

### Content linter (идеи)

Проверки над docs/:

- Наличие front matter и обязательных полей
- slug = kebab‑case и совпадает с именем файла
- Нет «кракозябр» в имени файла
- tags: TitleCase_с_подчёркиваниями; machine_tags скрыты
- Предупреждения: слишком длинный summary, пустые разделы

Интеграция: GitHub Action job `content-lint` (Node/JS), запускается на PR, не блокирующий или блокирующий — по настройке.

### Scaffold generator (идеи)

CLI‑скрипт `node scripts/scaffold.mjs --type page --section kb --title "Flux"`:

- Создаёт docs/kb/`flux.md` с фронт‑маттером по канону
- Добавляет черновой текст‑заглушку
- Опционально обновляет индекс раздела

### Связано с…

- [Spec — Normalize и политика имён](spec-normalize-i-politika-imyon-c9023c.md)
- [Spec — Front matter и слуги](spec-front-matter-i-slugi-91237c.md)

### Следующие шаги

- Описать интерфейс CLI (аргументы) и минимальные правила линтера
- Добавить отдельные jobs в GitHub Actions после стабилизации
