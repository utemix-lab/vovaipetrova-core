---
title: "Эпизод: Playbook short link"
slug: 2026-01-10-episode-playbook-short-link
summary: "Короткий алиас docs/PLAYBOOK.md и заметный ярлык на главной /prototype"
tags:
  - Story
  - UX
  - Navigation
machine_tags:
  - content/story
  - product/explorer
status: draft
pr_number: 206
pr_url: "https://github.com/utemix-lab/vovaipetrova-core/pull/206"
merged_at: "2026-01-09T20:56:36Z"
---

# Эпизод: Playbook short link

## What

Добавлен быстрый доступ к Playbook через короткие алиасы и заметный ярлык:
- Алиасы в `link-map.json`: `playbook`, `PLAYBOOK`, `playbook.md`, `PLAYBOOK.md`, `/playbook`, `/p` → `single-source-playbook`
- HTML-страница `prototype/playbook.html` с редиректом на `page/single-source-playbook.html`
- Заметный ярлык Playbook в header главной страницы Explorer (`prototype/index.html`)
- Стили для `.playbook-badge` с градиентным фоном, hover-эффектами и поддержкой тёмной темы

## Why

Ключевой документ проекта требовал более очевидного доступа. Необходим был быстрый способ:
- Найти Playbook через короткие алиасы (например, `/playbook` или `/p`)
- Увидеть ярлык на главной странице Explorer
- Использовать алиасы в Markdown-документах (`playbook.md`, `PLAYBOOK.md`)

## Result

Теперь доступ к Playbook возможен через:
- ✅ Короткий алиас: `/playbook` или `/p` → `prototype/playbook.html` → `page/single-source-playbook.html`
- ✅ Прямые алиасы в markdown: `playbook.md`, `PLAYBOOK.md`, `playbook`, `PLAYBOOK`
- ✅ Заметный ярлык на главной странице Explorer с градиентной кнопкой
- ✅ Все алиасы работают через `link-map.json` для автоматического разрешения ссылок
- ✅ Редирект использует комбинацию meta refresh и JavaScript для максимальной совместимости

## Next

- Пользователи смогут быстро находить Playbook через короткие ссылки
- Ярлык на главной странице привлекает внимание к важному документу
- Алиасы можно использовать в документации и ссылках для удобства
