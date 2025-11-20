---
title: Spec — Content linter и scaffold (черновик)
slug: spec-content-linter-i-scaffold-chernovik
summary: 'План контент-линтера и генератора шаблонов: проверки, CLI и дальнейшие шаги.'
status: ready
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - action/build
  - theme/automation
  - theme/dev
---
# Spec — Content linter и scaffold (черновик)

## TL;DR
- Линтер проверяет фронт-маттер, slug и ссылки в `docs/`.
- CLI-scaffold генерирует страницы с готовым шаблоном и тегами.
- GitHub Action запускает проверки на каждый PR.
- Следующий шаг — описать интерфейс CLI и минимальные правила.

## Content linter

- Наличие front matter и обязательных полей.  
- `slug` = kebab-case и совпадает с именем файла.  
- Предотвращаем «кракозябр» и пустые разделы.  
- Контроль тегов: TitleCase, 1–5 видимых, machine_tags скрыты.  
- Предупреждения: длинный summary, битые ссылки, отсутствующие изображения.

Интеграция: GitHub Action job `content-lint` (Node/JS), запускается на PR (режим — предупреждение/блокер по настройке).

## Scaffold generator

- CLI `node scripts/scaffold.mjs --type page --section kb --title "Flux"`.  
- Создаёт `docs/kb/flux.md` с каноническим фронт-маттером и заглушкой.  
- Подтягивает aliases из `docs/nav/tags.yaml`.  
- Опционально обновляет индекс раздела и добавляет в обзорную таблицу.

## Связано с…
- [Spec — Normalize и политика имён](spec-normalize-i-politika-imyon-c9023c.md)
- [Spec — Front matter и слуги](spec-front-matter-i-slugi-91237c.md)
- [Spec — Normalize и политика имён (черновик)](spec-normalize-i-politika-imyon.md)
- [Process: Обсудили → Разложили → Связали](process-obsudili-razlozhili-svyazali.md)

## Следующие шаги
- Описать интерфейс CLI (аргументы) и минимальные правила линтера.  
- Добавить отдельные jobs в GitHub Actions после стабилизации.  
- Задокументировать workflow для Notion → GitHub → CI.
