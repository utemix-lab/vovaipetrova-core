# Контекст проекта — Vova & Petrova Core

Контекстный файл для CodeGPT и других агентов, работающих с репозиторием.

## Источник истины

- **Notion** — источник истины для архитектуры, правил и задач
- **GitHub** — зеркало для публикации и предпросмотра
- **GitHub Pages** — публичный прототип Explorer: https://utemix-lab.github.io/vovaipetrova-core/

## Структура репозитория

```
vovaipetrova-core/
├── docs/                    # Публичная документация
│   ├── think-tank/         # Архитектурные решения (ADR, Specs)
│   ├── kb/                 # База знаний (статьи, инструменты)
│   ├── stories/            # Хроника проекта (эпизоды)
│   ├── nav/                # Навигация и теги
│   ├── rfcs/               # RFC (Request for Comments)
│   └── PROTOCOL.md         # Контрактная модель для агентов
├── prototype/              # Explorer UI (GitHub Pages)
│   ├── index.html          # Главная страница
│   ├── app.js              # Логика Explorer
│   ├── styles.css          # Стили
│   └── data/               # Генерируемые данные (pages.json, routes.json, stats.json)
├── scripts/                # Утилиты и скрипты
│   ├── normalize.mjs      # Нормализация front matter и slug
│   ├── lint-docs.mjs      # Линтинг контента
│   ├── fix-links.mjs      # Исправление ссылок
│   └── codegpt/           # Скрипты для CodeGPT интеграции
├── templates/              # Шаблоны для новых файлов
├── .github/workflows/      # CI/CD workflows
└── .codegpt/              # Конфигурация для CodeGPT
    ├── context.md         # Этот файл
    └── agents/            # Промпты агентов
```

## Ветви (Branches)

### Типы веток (Lanes)
- `chore/*` — инфраструктура, документация, процессы
- `feat/*` — новые возможности, разделы
- `fix/*` — исправления, багфиксы
- `docs/*` — текстовые правки без изменения логики
- `refactor/*` — структурные изменения без фич
- `notion-sync/*` — импорт из Notion (автоматика)

### Правила ветвления
- Одна ветка = один PR = одна задача из Briefs
- После мерджа PR ветку можно удалить (кроме `notion-sync/*`)
- Не коммитить напрямую в `main` (только через PR)

## Линтеры и проверки

### Контент-линтер (`scripts/lint-docs.mjs`)
- Проверка наличия front matter (title, slug, summary)
- Проверка формата тегов (TitleCase_с_подчёркиваниями)
- Проверка PII (пути, имена, email) — блокирующая ошибка для `stories/`
- Проверка персональных данных в Stories (первое лицо разрешено, но не имена)

### Нормализация (`scripts/normalize.mjs`)
- Перенос `#Хэштегов` из текста → `tags[]` в front matter
- Генерация `machine_tags[]` по алиасам из `docs/nav/tags.yaml`
- Проставление `title`, `slug`, `summary`
- Переименование файла по slug → `kebab-case.md`

### Исправление ссылок (`scripts/fix-links.mjs`)
- Замена Notion-ссылок на нормализованные по slug
- Обработка percent-encoded ссылок
- Удаление Notion ID из ссылок через link-map

### PII сканирование (`scripts/pii-scan.mjs`)
- Поиск Windows/Unix путей пользователей
- Поиск email адресов
- Поиск телефонных номеров

## CI/CD

### Workflows
1. **Docs CI** (`docs-ci.yml`)
   - Запускается на PR
   - Выполняет `normalize --dry` и `lint:docs`
   - Блокирующий чек (required для мерджа)

2. **Notion Import** (`notion-import.yml`)
   - Запускается вручную или при push в `notion-sync/*`
   - Проверяет безопасность импорта
   - Нормализует документы
   - Создаёт PR с отчётом

3. **Pages Deploy** (`pages.yml`)
   - Запускается при изменении `prototype/` или `docs/`
   - Деплоит Explorer на GitHub Pages

### Branch Protection
- `main` защищён требованием `Docs CI` (Required status checks)
- Количество обязательных аппрувов: 0 (автопилот может мерджить после зелёного CI)

## Процесс работы

### Базовый цикл (Notion → GitHub)
1. В Notion готовим структуру и контент, переводим карточку в Briefs → `Ready`
2. Экспортируем (`Markdown & CSV`, с подстраницами) и кладём ZIP в `uploads/`
3. Запускаем workflow **Notion Import (Safe PR)** или пушим ветку `notion-sync/...`
4. Проверяем созданный PR: ждём зелёный `Docs CI`, затем мержим в `main`

### Локальные команды
```bash
npm run normalize:dry   # посмотреть, что поменяет normalize
npm run normalize       # применить нормализацию
npm run lint:docs       # контент-линт (предупреждения не валят CI)
npm run fix:links       # исправить ссылки
npm run pii:scan        # проверить на PII
```

## Front Matter

Каждый `.md` файл должен содержать:

```yaml
---
title: Название документа
slug: kebab-case-slug
summary: Краткое описание
tags: [TitleCase_Тег, Другой_Тег]
machine_tags: [theme/ux, action/build]
status: draft | review | ready
notion_page_id: "..."  # опционально, для синхронизации
last_edited_time: "..."  # опционально, для синхронизации
service: true  # только для служебных файлов
---
```

## Запреты

- ❌ Не менять файлы в `scripts/`, `.github/workflows/` без явного указания в Briefs
- ❌ Не создавать файлы вне `docs/`, `prototype/`, `templates/` без согласования
- ❌ Не добавлять PII (пути пользователей, имена, email, телефоны)
- ❌ Не использовать первое лицо в Stories (личные имена запрещены)
- ❌ Не создавать файлы без front matter
- ❌ Не мерджить PR без зелёного CI
- ❌ Не создавать несколько PR из одной ветки (Lanes policy)

## Связанные документы

- `docs/PROTOCOL.md` — контрактная модель для агентов
- `CONTRIBUTING.md` — процесс работы с репозиторием
- `README.md` — структура и команды
- `docs/rfcs/template.md` — шаблон для RFC

