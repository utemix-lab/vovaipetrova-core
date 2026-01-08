---
title: Release checklist — процедура релиза Pages прототипа
slug: release-checklist-pages-prototype
summary: >-
  Чек-лист и процедура релиза GitHub Pages прототипа: preflight проверки, запуск
  деплоя, верификация, rollback
tags:
  - Документация
  - Процесс
  - Release
machine_tags:
  - action/build
  - action/deploy
  - product/kb
  - product/site
status: ready
---

# Release checklist — процедура релиза Pages прототипа

## Цель

Единый сценарий релиза GitHub Pages прототипа с проверками и процедурой rollback.

## Preflight проверки (перед релизом)

### 1. CI статус

- [ ] Все проверки CI зелёные на ветке `main`
- [ ] Нет открытых PR с критическими ошибками
- [ ] Eval Harness проходит (100% pass rate)

**Проверка:**
```bash
# Проверить статус последнего коммита в main
gh pr list --state open --base main
npm run test:eval
```

### 2. Diagnostics свежие

- [ ] `prototype/data/pages.json` обновлён (последний коммит < 24 часов)
- [ ] `prototype/data/stats.json` актуален
- [ ] `prototype/data/broken-links.json` актуален
- [ ] `prototype/data/orphans.json` актуален

**Проверка:**
```bash
# Проверить дату обновления diagnostics
git log -1 --format="%ai %s" prototype/data/pages.json
npm run diagnostics:snapshot  # Если нужно обновить
```

### 3. Prototype файлы готовы

- [ ] `prototype/index.html` обновлён
- [ ] `prototype/styles.css` обновлён
- [ ] `prototype/app.js` обновлён
- [ ] `prototype/data/*.json` файлы актуальны
- [ ] `prototype/build-index.mjs` выполнен успешно

**Проверка:**
```bash
# Локальная сборка для проверки
node prototype/build-index.mjs
# Открыть prototype/index.html в браузере и проверить функциональность
```

### 4. Workflow готов

- [ ] `.github/workflows/pages.yml` на месте
- [ ] Workflow триггер настроен (`workflow_dispatch` или `push` на `main`)
- [ ] Нет синтаксических ошибок в workflow

**Проверка:**
```bash
# Проверить workflow файл
cat .github/workflows/pages.yml
```

## Процедура релиза

### Шаг 1: Запуск деплоя

**Вариант A: Автоматический деплой (push в main)**
```bash
# Убедиться, что все изменения закоммичены и запушены
git checkout main
git pull origin main
# Если есть изменения в prototype/ или docs/, они автоматически запустят деплой
```

**Вариант B: Ручной запуск через GitHub Actions**
1. Открыть https://github.com/utemix-lab/vovaipetrova-core/actions
2. Выбрать workflow "Deploy Pages (prototype)"
3. Нажать "Run workflow"
4. Выбрать ветку `main`
5. Нажать "Run workflow"

### Шаг 2: Мониторинг деплоя

- [ ] Отслеживать выполнение workflow в GitHub Actions
- [ ] Проверить, что все шаги прошли успешно:
  - ✅ Checkout
  - ✅ Setup Node.js
  - ✅ Install dependencies
  - ✅ Build prototype index
  - ✅ Configure Pages
  - ✅ Upload Pages artifact
  - ✅ Deploy to Pages

**Время выполнения:** обычно 2-5 минут

### Шаг 3: Верификация URL

После успешного деплоя:

- [ ] Получить URL из GitHub Actions (шаг `deployment.outputs.page_url`)
- [ ] Или открыть Settings → Pages → View site
- [ ] Проверить доступность сайта
- [ ] **Автоматические smoke checks** выполняются автоматически после деплоя (3 проверки: `/`, `/data/pages.json`, `/data/stats.json`)
- [ ] Проверить основные сценарии:
  - [ ] Главная страница загружается
  - [ ] Навигация работает (Docs, Stories, Issues, Orphans)
  - [ ] Фильтры и сортировка работают
  - [ ] Поиск работает
  - [ ] Tag pages работают (`/tags/<tag>`)
  - [ ] Shareable filters работают (URL параметры)
  - [ ] Мобильная версия отображается корректно

**URL прототипа:** https://utemix-lab.github.io/vovaipetrova-core/

**Smoke checks:** Автоматически выполняются после деплоя через `scripts/checks/smoke-check-pages.mjs`. Отчёт сохраняется в артефакты CI.

## Критерии успешного релиза

✅ **Технические:**
- Workflow выполнен без ошибок
- Сайт доступен по URL
- Все статические ресурсы загружаются (CSS, JS, JSON)
- Нет ошибок в консоли браузера (F12 → Console)

✅ **Функциональные:**
- Все основные функции работают
- Нет критических багов в UI
- Производительность приемлемая (< 3 сек загрузка)

✅ **Контентные:**
- Все страницы отображаются корректно
- Нет broken links (internal-missing = 0)
- Данные актуальные (pages.json, stats.json)

## Процедура Rollback

Если релиз неудачный или требуется откат:

### Вариант 1: Откат через GitHub Actions

1. Открыть https://github.com/utemix-lab/vovaipetrova-core/actions
2. Найти последний успешный деплой
3. Нажать "Re-run jobs" → "Re-run failed jobs" (если был провал)
4. Или найти предыдущий успешный деплой и перезапустить его

### Вариант 2: Откат через Git

1. Найти последний рабочий коммит:
   ```bash
   git log --oneline prototype/
   ```
2. Создать revert коммит:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
3. Это автоматически запустит новый деплой с предыдущей версией

### Вариант 3: Ручной откат через GitHub Pages Settings

1. Открыть Settings → Pages
2. В разделе "Deploy from a branch" выбрать предыдущий коммит
3. Сохранить изменения

**Время rollback:** обычно 2-5 минут

## Процедура Redo (повторный деплой)

Если нужно перезапустить деплой без изменений:

1. Открыть https://github.com/utemix-lab/vovaipetrova-core/actions
2. Выбрать workflow "Deploy Pages (prototype)"
3. Нажать "Run workflow"
4. Выбрать ветку `main`
5. Нажать "Run workflow"

**Примечание:** Redo полезен, если:
- Деплой прошёл, но сайт не обновился (кэш)
- Нужно пересобрать после изменений в зависимостях
- Требуется принудительное обновление

## Troubleshooting

### Проблема: Workflow не запускается

**Решение:**
- Проверить, что файл `.github/workflows/pages.yml` существует
- Проверить синтаксис YAML файла
- Убедиться, что триггер настроен правильно

### Проблема: Деплой падает с ошибкой

**Решение:**
1. Проверить логи в GitHub Actions
2. Проверить локальную сборку:
   ```bash
   node prototype/build-index.mjs
   ```
3. Исправить ошибки и закоммитить изменения
4. Повторить деплой

### Проблема: Сайт не обновляется после деплоя

**Решение:**
1. Очистить кэш браузера (Ctrl+Shift+R или Cmd+Shift+R)
2. Проверить, что деплой действительно завершился успешно
3. Подождать 1-2 минуты (кэш CDN)
4. Выполнить Redo деплоя

### Проблема: Broken links после релиза

**Решение:**
1. Проверить `prototype/data/broken-links.json`
2. Запустить проверку:
   ```bash
   npm run diagnostics:check-regression
   ```
3. Исправить broken links
4. Обновить `prototype/link-map.json` при необходимости
5. Повторить деплой

## Время выполнения

- **Preflight проверки:** 2-3 минуты
- **Деплой:** 2-5 минут
- **Верификация:** 2-3 минуты
- **Общее время:** < 10 минут

## Связанные документы

- [Single Source Playbook — «священный документ» (Notion↔Repo)](single-source-playbook.md) — единый источник истины для синхронизации между Notion и GitHub, правила работы агентов
- GitHub Actions workflow: `.github/workflows/pages.yml` — конфигурация деплоя

## Чек-лист быстрого релиза

**Минимальный набор для быстрого релиза (< 5 минут):**

- [ ] CI зелёный на main
- [ ] `npm run diagnostics:snapshot` выполнен (если были изменения в docs/)
- [ ] `node prototype/build-index.mjs` выполнен успешно
- [ ] Запущен workflow "Deploy Pages (prototype)" через GitHub Actions
- [ ] Проверен URL сайта и основные функции

**Полный чек-лист:** см. разделы выше.

