---
title: Навигация (техническая)
slug: navigaciya-tehnicheskaya
summary: '# Навигация (техническая)'
tags:
  - Adobe
  - Adobe_Photoshop
  - Генерация_Видео
machine_tags:
  - producer/adobe
  - tool/adobe-photoshop
  - theme/graphics
---
# Навигация (техническая)

### TL;DR

Быстрый переход: [Индекс сайта](arhitektura-i-komponenty-486a0b.md) • [Навигация (пользовательская)](%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F%20(%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F)%202ba5dd285a3643f788773751f6d24184.md) • [Услуги](arhitektura-i-komponenty-486a0b.md)

Технический слой навигации: внутренняя таксономия, метки и правила, которые питают пользовательские фасеты и поиск.

### Таксономия и метки

- Контролируемый словарь слагифицированных меток
- Иерархии: тип → подтип, часть ↔ целое
- Связи: related_to, depends_on, alternative_of

### Политики видимости

- Видимость по ролям: гость, клиент, редактор, разработчик
- Приватные internal:* метки скрыты от UI
- Маппинг внутренних меток → пользовательские ярлыки и фасеты

### Правила и валидаторы

- Лимиты на число видимых ярлыков на материал
- Проверки: сиротские метки, циклы в иерархии, конфликтующие синонимы
- Редиректы и синонимы: canonical_slug ↔ aliases

### Интеграции и индекс

### Стартовый словарь тегов (~30)

- Тема (theme/*): theme/ml, theme/nlp, theme/graphics, theme/ux, theme/automation
- Действие (action/*): action/learn, action/build, action/evaluate, action/publish, action/debug
- Роль (role/*): role/novice, role/client, role/dev, role/editor
- Продукт/Модуль (product/*): product/site, product/think-tank, product/kb, product/portfolio, product/artifacts, product/services
- Технология/Инструмент (tool/*): tool/nextjs, tool/fastapi, tool/wordpress, tool/transformers, tool/stable-diffusion, tool/figma, tool/photoshop, tool/illustrator, tool/aftereffects, tool/premiere, tool/davinci, tool/blender, tool/sketchup, tool/cad

Синонимы/алиасы (пример):

- theme/ml ↔ ["машинное обучение", "ML"]
- theme/graphics ↔ ["графика", "визуал"]
- action/build ↔ ["сделать", "реализовать", "построить"]
- action/publish ↔ ["опубликовать", "релиз"]
- product/think-tank ↔ ["ФинкТенк", "Think Tank"]
- product/artifacts ↔ ["корзина", "артефакты"]
- tool/transformers ↔ ["HF Transformers", "Transformers"]
- tool/stable-diffusion ↔ ["SD", "Stable Diffusion"]
- tool/aftereffects ↔ ["AE", "After Effects"]
- tool/davinci ↔ ["Resolve", "DaVinci"]

Правила тегирования (кратко):

Человеко‑читаемые хэштеги — стиль написания:

- Формат: TitleCase с подчёркиваниями между словами. Примеры: #Adobe, #Adobe_Photoshop, #Генерация_Видео
- Разрешённые символы: буквы, цифры, подчёркивание. Без пробелов и дефисов
- Язык: используем язык страницы (рус/англ), без транслитерации. Машинные слаги живут отдельно (theme/*, tool/*)
- Количество: 1–5 видимых тегов на страницу. Остальные — в machine_tags
- На материал ставим: 1–3 theme, 1–2 action, 1 product, 0–5 tool, по необходимости role
- role/* в основном на сервисные/гайдовые страницы
- internal:* скрываем из UI, используем в логике видимости

### Мини‑реестр меток и фасетов (стартовый)

### Фасет «Страна» (country/*)

- Примеры: country/ru, country/us, country/jp, country/de, country/gb
- Использование: фильтры и агрегаторы по странам производителей

### Сущность «Производитель» (черновик модели)

- Поля: name, logo (image), country (country/*), type (software|studio|label|festival|research|vendor), url
- Связи: materials (relation), tools (relation)
- Витрина: логотип как кликабельный ярлык → карточка производителя; флаг как визуал country
- Правило: флаг/логотип — это визуал и навигация, не отдельные теги (метки: country/ *и producer/*)
- Фасет «Тема» (theme/*): theme/ml, theme/nlp, theme/graphics, theme/automation, theme/ux
- Фасет «Действие» (action/*): action/learn, action/build, action/evaluate, action/publish, action/debug
- Фасет «Роль» (role/*): role/guest, role/client, role/editor, role/dev, role/student
- Фасет «Продукт/Модуль» (product/*): product/site, product/think-tank, product/kb, product/portfolio, product/export
- Фасет «Технологии/Инструменты» (tool/*): tool/transformers, tool/stable-diffusion, tool/nextjs, tool/fastapi, tool/wordpress

Примеры маппинга в UI:

- internal:theme/ml → ярлык «Машинное обучение» в фасете «Тема»
- internal:action/learn → «Обучение» в фасете «Действие»
- internal:role/client → скрыт для гостей, видим клиентам

Политики видимости (по умолчанию):

- theme/*, action/*, product/*, tool/* → audience: ["guest", "client", "editor", "dev"]
- role/* → audience: ["client", "editor", "dev"]

Синонимы (aliases):

- theme/ml ↔ ["машинное обучение", "ML"]
- tool/transformers ↔ ["HF Transformers", "Transformers"]
- product/think-tank ↔ ["ФинкТенк", "Think Tank"]
- Поисковый индекс: буст ключевых материалов, синонимы, опечатки
- Экспорт/синхронизация: Notion → GitHub → сайт (маршруты)

---

### Связано с…

- [Навигация (пользовательская)](%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F%20(%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F)%202ba5dd285a3643f788773751f6d24184.md)
- [Услуги](arhitektura-i-komponenty-486a0b.md)
- [Think Tank — компактное ядро](think-tank-kompaktnoe-yadro-1d36dd.md)
- [Индекс сайта](arhitektura-i-komponenty-486a0b.md)
- [Контент‑модель и маршруты](arhitektura-i-komponenty-486a0b.md)
