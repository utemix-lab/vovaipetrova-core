---
title: Навигация — схема разделов и маршрутов
slug: navigaciya-shema-razdelov-i-marshrutov
service: true
summary: '# Навигация — схема разделов и маршрутов'
tags: []
machine_tags: []
status: ready
---
# Навигация — схема разделов и маршрутов

Карта разделов сайта (`routes.yml`) определяет структуру навигации и соответствие между URL-маршрутами и документами в `docs/`.

## Как читать схему

Файл `routes.yml` содержит список разделов (`routes`), каждый из которых имеет:
- `path` — URL-маршрут (например, `/`, `/project`, `/kb`)
- `title` — название раздела
- `description` — описание назначения раздела
- `entries` — список документов, относящихся к этому разделу

Каждая запись (`entry`) содержит:
- `slug` — идентификатор документа
- `doc` — путь к файлу в `docs/`
- `status` — статус: `ok` (файл существует) или `missing` (файл отсутствует)
- `notes` — примечания

## Соответствие route → docs path → status

| Route | Docs Path | Status | Записей |
|-------|-----------|--------|---------|
| `/` | `docs/vova-i-petrova.md`, `docs/indeks-i-tldr.md`, `docs/sut-proekta-one-liner.md`, `docs/indeks-sajta.md`, `docs/opisanie-literaturnaya-versiya.md` | ok | 5 |
| `/project` | `docs/arhitektura-proekta-komponenty.md`, `docs/dorozhnaya-karta-etapy.md`, `docs/dorozhnaya-karta-i-beklog.md`, `docs/process-obsudili-razlozhili-svyazali.md`, `docs/vision-strategiya-marketing-autentichnost-tretij-put-onepager.md`, `docs/arhitektura-i-komponenty.md`, `docs/artefakty-korzina-i-zayavka-mvp.md`, `docs/eksport-v-github-rukovodstvo-i-shablony.md`, `docs/instructions-ispolniteli-cursoraider.md`, `docs/instrukcii-dlya-notion-ai-vovaipetrova.md`, `docs/koncepciya-portov-interfejsy-do-realizacii.md`, `docs/metriki-uspeha.md`, `docs/nej.md`, `docs/okruzheniya-i-deploj.md`, `docs/playbook-roli.md`, `docs/pochemu-eto-srabotaet-cennost.md`, `docs/prototype.md`, `docs/tekushie-zadachi.md`, `docs/teststrategiya-i-kachestvo.md`, `docs/uslugi.md`, `docs/vision-igrovaya-navigaciya-i-roli-v1.md` | ok | 21 |
| `/think-tank` | `docs/think-tank-kompaktnoe-yadro.md`, `docs/think-tank-vitrina-processa.md`, `docs/adr-source-of-truth-mirroring.md`, `docs/adr-tags-and-facets.md`, `docs/adr-zhurnal-reshenij-b34c2e.md`, `docs/adr-source-of-truth-i-zerkalirovanie.md`, `docs/integracii-s-socsetyami.md` | ok (6), missing (1) | 7 |
| `/kb` | `docs/baza-znanij-koren.md`, `docs/kontentmodel-i-marshruty.md`, `docs/taksonomiya-i-tegi.md`, `docs/spec-content-linter-i-scaffold-chernovik.md`, `docs/spec-normalize-i-politika-imyon.md`, `docs/adr-tegi-i-fasety.md`, `docs/ancy.md`, `docs/comfyui-obzor-i-bystryj-start.md`, `docs/dinozavrik.md`, `docs/glossarij-terminov.md`, `docs/hyugo.md`, `docs/ii.md`, `docs/kontentpajplajn-eksporta.md`, `docs/monetizaciya-i-urovni-dostupa.md`, `docs/runa.md`, `docs/sintaksis-i-razmetka-markdown-wordpress.md` | ok | 16 |
| `/portfolio` | `docs/portfolio-koren.md`, `docs/portfolio-struktura.md`, `docs/kartochka-uslugi-dizajn.md`, `docs/kartochka-uslugi-videoprodakshn.md`, `docs/case-library.md`, `docs/dizzy.md`, `docs/petrova.md`, `docs/tehnicheskij-stek-i-infrastruktura.md`, `docs/vasya.md`, `docs/vova.md` | ok (9), missing (1) | 10 |
| `/nav` | `docs/navigaciya-polzovatelskaya.md`, `docs/navigaciya-tehnicheskaya.md`, `docs/indeks-sajta.md`, `docs/kontentmodel-i-marshruty.md`, `docs/spec-front-matter-i-slugi.md`, `docs/ui-maket-shapka-i-pervyj-ekran-static-first.md` | ok | 6 |

**Итого:** 65 записей, из них 64 со статусом `ok`, 2 со статусом `missing`.

## Обновление схемы

Схема обновляется автоматически при запуске `scripts/generate-routes-json.mjs` (вызывается из `prototype/build-index.mjs`). Для ручного обновления:

```bash
node scripts/generate-routes-json.mjs
```

## Использование в Explorer

Explorer использует `routes.yml` для:
- Сортировки документов по разделам (режим "By route")
- Группировки карточек по маршрутам
- Отображения структуры навигации

Файл `prototype/data/routes.json` генерируется из `routes.yml` для использования в браузере.

