---
title: "Артефакты — корзина и заявка (MVP)"
slug: artefakty-korzina-i-zayavka-mvp-925151
summary: >-
  Быстрый старт: добавьте услугу в артефакты Игровая витрина с
  роль‑ориентированным UI и «корзиной артефактов». Пользователь собирает примеры
  работ и пунктов услуг, прикладывает к заявке. В заявке — вЂ¦
status: draft
tags: []
machine_tags: []
service: true
---
# Артефакты — корзина и заявка (MVP)

### TL;DR

Метки: theme/ux, action/build, product/artifacts

Быстрый старт: добавьте услугу в артефакты

- [Карточка услуги: Видеопродакшн](arhitektura-i-komponenty-486a0b.md)
- [Карточка услуги: Дизайн](arhitektura-i-komponenty-486a0b.md)
- [Карточка услуги: Проектирование (CAD/3D)](kartochka-uslugi-proektirovanie-cad3d.md)

Игровая витрина с роль‑ориентированным UI и «корзиной артефактов». Пользователь собирает примеры работ и пунктов услуг, прикладывает к заявке. В заявке — текст + ссылки на выбранные артефакты.

### Сущности (минимум)

- UserRole: novice | client | dev
- Artifact: {id, type: image|video|case|service|article, ref, title, cover, meta}
- ArtifactList: {user_id? or device_id, items: ArtifactRef[], notes}
- Service: {id, slug, title, description}
- Request: {id, user_id?, role, text, items: ArtifactRef[], contact, status}

### UI‑флоу

1) Выбор роли (шапка) → роль‑скин и стартовые маршруты

2) Кнопка «+ в артефакты» на карточках картинок, видео, кейсов, услуг

3) Просмотр артефактов (шторка/страница), удаление, заметки

4) Форма заявки: текст + автоматическая подстановка артефактов → предпросмотр → отправка

### API (черновик)

- POST /api/artifacts/add {item}
- POST /api/artifacts/remove {item_id}
- GET /api/artifacts/list
- POST /api/requests/create {text, items, contact, role}
- GET /api/services
- GET /api/cases

### Данные и хранение

- Гости: LocalStorage (artifact_list) + optional device_id
- Авторизованные: серверная коллекция артефактов, синхронизация при входе

### Правила и видимость

- Политики из тех‑навигации (roles, audience) → фильтры UI
- Ограничения: отправляем превью и ссылки, не оригиналы

### Интеграции

- Webhook в почту/CRM/Telegram с карточкой заявки

---

### Связано с…

- [Контент‑модель и маршруты](arhitektura-i-komponenty-486a0b.md)
- [Услуги](arhitektura-i-komponenty-486a0b.md)
- [Навигация (пользовательская)](navigaciya-polzovatelskaya.md)
- [Навигация (техническая)](navigaciya-tehnicheskaya.md)
