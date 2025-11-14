---
title: Site IA / nav
slug: site-ia-nav
service: true
summary: '# Site IA / nav'
tags: []
machine_tags: []
---
# Site IA / nav

`routes.yml` описывает целевые разделы витрины и то, какими Markdown‑файлами из `docs/` мы их закрываем.  
Файл служит для синхронизации между информационной архитектурой (IA) и текущим контентом.

## Формат `routes.yml`

```yaml
version: 1
updated: 2025-11-14
routes:
  - path: "/"
    title: "Главная"
    description: "индексы и быстрые ответы"
    entries:
      - slug: vova-i-petrova
        doc: docs/vova-i-petrova.md
        status: ok        # ok | missing
        notes: "обзор и позиционирование"
```

- `path` — маршрут/раздел сайта.
- `entries` — документы, которые покрывают этот маршрут.  
  - `status: ok` — файл существует и готов для маршрута.  
  - `status: missing` — запланированный слот, контент нужно создать.
- `notes` помогают понять роль файла внутри раздела.

## Маппинг маршрутов (snapshot)

| route | docs path | status |
| --- | --- | --- |
| `/` | `docs/vova-i-petrova.md` | ok |
| `/` | `docs/indeks-i-tldr.md` | ok |
| `/` | `docs/sut-proekta-one-liner.md` | ok |
| `/` | `docs/indeks-sajta.md` | ok |
| `/project` | `docs/arhitektura-proekta-komponenty.md` | ok |
| `/project` | `docs/dorozhnaya-karta-etapy.md` | ok |
| `/project` | `docs/dorozhnaya-karta-i-beklog.md` | ok |
| `/project` | `docs/process-obsudili-razlozhili-svyazali.md` | ok |
| `/project` | `docs/vision-strategiya-marketing-autentichnost-tretij-put-onepager.md` | ok |
| `/think-tank` | `docs/think-tank-kompaktnoe-yadro.md` | ok |
| `/think-tank` | `docs/think-tank-vitrina-processa.md` | ok |
| `/think-tank` | `docs/adr-source-of-truth-mirroring.md` | ok |
| `/think-tank` | `docs/adr-tags-and-facets.md` | ok |
| `/think-tank` | `docs/adr-zhurnal-reshenij-b34c2e.md` | ok |
| `/kb` | `docs/baza-znanij-koren.md` | ok |
| `/kb` | `docs/kontentmodel-i-marshruty.md` | ok |
| `/kb` | `docs/taksonomiya-i-tegi.md` | ok |
| `/kb` | `docs/spec-content-linter-i-scaffold-chernovik.md` | ok |
| `/kb` | `docs/spec-normalize-i-politika-imyon.md` | ok |
| `/portfolio` | `docs/portfolio-koren.md` | ok |
| `/portfolio` | `docs/portfolio-struktura.md` | ok |
| `/portfolio` | `docs/kartochka-uslugi-dizajn.md` | ok |
| `/portfolio` | `docs/kartochka-uslugi-videoprodakshn.md` | ok |
| `/portfolio` | `docs/case-library.md` | missing |
| `/nav` | `docs/navigaciya-polzovatelskaya.md` | ok |
| `/nav` | `docs/navigaciya-tehnicheskaya.md` | ok |
| `/nav` | `docs/indeks-sajta.md` | ok |
| `/nav` | `docs/kontentmodel-i-marshruty.md` | ok |

> Если создаёшь новый маршрут, добавь его в `routes.yml`, а затем обнови план действий (например, TODO/Briefs), чтобы собрать недостающий контент.

