---
title: >-
  Briefs upgrade — инструкция по обновлению полей, представлений, SLA и очередей
  ревью
slug: briefs-upgrade-how-to
summary: >-
  Инструкция по обновлению базы данных Briefs в Notion: добавление полей
  Executor, Lane, SLA, Requires Review, RFC Link, Upstream Source, создание
  представлений и формулы Overdue
tags:
  - Документация
  - Процесс
machine_tags:
  - action/build
  - product/kb
  - theme/automation
status: ready
---

# Briefs upgrade — инструкция по обновлению полей, представлений, SLA и очередей ревью

## Цель

Обновить базу данных Briefs в Notion для двусторонней работы с агентами (Cursor/CodeGPT) и контроля SLA/Review.

## Область изменений

Только база Briefs (схема и представления). Изменения выполняются вручную в Notion UI.

## Шаг 1: Добавление полей

### 1.1. Поле Executor (Select)

**Тип**: Select  
**Название**: `Executor`  
**Опции**:
- `Cursor`
- `CodeGPT:Orchestrator`
- `CodeGPT:Docs`
- `CodeGPT:Refactor`
- `CodeGPT:Creative`
- `Manual`

**Инструкция**:
1. Откройте базу данных Briefs в Notion
2. Нажмите на `+` в правой части таблицы (или `Add a property`)
3. Выберите тип `Select`
4. Назовите поле `Executor`
5. Добавьте опции по одной, используя значения выше

### 1.2. Поле Lane (Select)

**Тип**: Select  
**Название**: `Lane`  
**Опции**:
- `Infra`
- `Docs`
- `IA`
- `Content`
- `Stories`
- `Characters`
- `QA`

**Инструкция**: аналогично полю Executor

### 1.3. Поле SLA (Date)

**Тип**: Date  
**Название**: `SLA`  
**Описание**: Дата и время, до которого должно быть завершено ревью PR

**Инструкция**:
1. Добавьте новое свойство типа `Date`
2. Назовите его `SLA`
3. Опционально добавьте описание: "Дата и время, до которого должно быть завершено ревью PR"

### 1.4. Поле Requires Review (Checkbox)

**Тип**: Checkbox  
**Название**: `Requires Review`  
**Описание**: Требуется ли ручное ревью для этой задачи

**Инструкция**:
1. Добавьте новое свойство типа `Checkbox`
2. Назовите его `Requires Review`
3. Опционально добавьте описание: "Требуется ли ручное ревью для этой задачи"

### 1.5. Поле RFC Link (URL)

**Тип**: URL  
**Название**: `RFC Link`  
**Описание**: Ссылка на RFC, связанный с этой задачей

**Инструкция**:
1. Добавьте новое свойство типа `URL`
2. Назовите его `RFC Link`
3. Опционально добавьте описание: "Ссылка на RFC, связанный с этой задачей"

### 1.6. Поле Upstream Source (Select)

**Тип**: Select  
**Название**: `Upstream Source`  
**Опции**:
- `Ideas & Proposals`
- `RFC`
- `Incident`
- `Metrics`

**Инструкция**: аналогично полю Executor

## Шаг 2: Создание формулы Overdue

**Тип**: Formula  
**Название**: `Overdue`  
**Формула**:
```
if(prop("Status") == "Ready" or prop("Status") == "In progress" or prop("Status") == "Review", if(prop("SLA") != empty() and now() > prop("SLA"), "Yes", "No"), "No")
```

**Инструкция**:
1. Добавьте новое свойство типа `Formula`
2. Назовите его `Overdue`
3. Вставьте формулу выше
4. Опционально добавьте описание: "Показывает, просрочена ли задача (Yes/No)"

**Альтернативная формула** (если предыдущая не работает):
```
if(and(or(prop("Status") == "Ready", prop("Status") == "In progress", prop("Status") == "Review"), and(prop("SLA") != empty(), now() > prop("SLA"))), "Yes", "No")
```

## Шаг 3: Создание представлений (Views)

### 3.1. Ready for CodeGPT

**Название**: `Ready for CodeGPT`  
**Тип**: Table  
**Фильтры**:
- `Status` is `Ready`
- `Executor` starts with `CodeGPT:`

**Инструкция**:
1. Нажмите `+ Add a view` в верхней части базы данных
2. Выберите тип `Table`
3. Назовите представление `Ready for CodeGPT`
4. Добавьте фильтры:
   - `Status` is `Ready`
   - `Executor` starts with `CodeGPT:`
5. Сохраните представление

### 3.2. Pending Review

**Название**: `Pending Review`  
**Тип**: Table  
**Фильтры**:
- `Status` is `Review`
- `Requires Review` is `Checked`

**Инструкция**:
1. Создайте новое представление типа `Table`
2. Назовите его `Pending Review`
3. Добавьте фильтры:
   - `Status` is `Review`
   - `Requires Review` is `Checked`
4. Сохраните представление

### 3.3. Overdue

**Название**: `Overdue`  
**Тип**: Table  
**Фильтры**:
- `Overdue` is `Yes`

**Инструкция**:
1. Создайте новое представление типа `Table`
2. Назовите его `Overdue`
3. Добавьте фильтр:
   - `Overdue` is `Yes`
4. Сохраните представление

### 3.4. By Lane (Board)

**Название**: `By Lane`  
**Тип**: Board  
**Группировка**: `Lane`  
**Сортировка**: по `SLA` (ascending)

**Инструкция**:
1. Создайте новое представление типа `Board`
2. Назовите его `By Lane`
3. Настройте группировку:
   - Group by: `Lane`
4. Настройте сортировку:
   - Sort by: `SLA` (ascending)
5. Сохраните представление

## Шаг 4: Заполнение данных для существующих задач

После создания полей необходимо заполнить их для существующих задач:

1. **Executor**: установите значение на основе типа задачи:
   - Задачи для Cursor → `Cursor`
   - Задачи для CodeGPT → выберите соответствующий подтип (`CodeGPT:Docs`, `CodeGPT:Refactor`, и т.д.)
   - Ручные задачи → `Manual`

2. **Lane**: установите значение на основе типа задачи:
   - Документация → `Docs`
   - Инфраструктура → `Infra`
   - Stories → `Stories`
   - И т.д.

3. **SLA**: установите дату на основе типа задачи:
   - Composer PR → +24 часа от даты создания
   - Стандартные PR → +48 часов от даты создания
   - Срочные PR → +12 часов от даты создания

4. **Requires Review**: установите `Yes` для задач, требующих ручного ревью

5. **RFC Link**: добавьте ссылку на RFC, если задача связана с RFC

6. **Upstream Source**: установите источник задачи:
   - Из Ideas & Proposals → `Ideas & Proposals`
   - Из RFC → `RFC`
   - Из инцидента → `Incident`
   - Из метрик → `Metrics`

## Проверка

После выполнения всех шагов проверьте:

- [ ] Все поля созданы и имеют правильные типы
- [ ] Формула Overdue работает корректно
- [ ] Все представления созданы и отображают правильные данные
- [ ] Существующие задачи заполнены новыми полями

## Связанные документы

- [Protocol — Контрактная модель для агентов](./protocol-kontraktnaya-model-dlya-agentov.md) — описание процесса работы с агентами
- [Очереди ревью и SLA](./protocol-kontraktnaya-model-dlya-agentov.md#очереди-ревью-и-sla) — описание SLA и очередей ревью

