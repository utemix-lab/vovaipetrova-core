---
title: Spec — Content linter и scaffold (черновик)
slug: spec-content-linter-i-scaffold-chernovik-6329bc
summary: '# Spec — Content linter и scaffold (черновик)'
tags: []
machine_tags: []
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

- Создаёт docs/kb/[flux.md](http://flux.md) с фронт‑маттером по канону
- Добавляет черновой текст‑заглушку
- Опционально обновляет индекс раздела

### Следующие шаги

- Описать интерфейс CLI (аргументы) и минимальные правила линтера
- Добавить как отдельные jobs в .github/workflows (после стабилизации)
