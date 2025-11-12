---
title: Артефакты — корзина и заявка (MVP)
slug: artefakty-korzina-i-zayavka-mvp-925151
summary: '# Артефакты — корзина и заявка (MVP)'
status: draft
tags: []
machine_tags: []
---
# Артефакты — корзина и заявка (MVP)

### TL;DR

Метки: theme/ux, action/build, product/artifacts

Быстрый старт: добавьте услугу в артефакты

- [Карточка услуги: Видеопродакшн](arhitektura-i-komponenty-486a0b.md)
- [Карточка услуги: Дизайн](arhitektura-i-komponenty-486a0b.md)
- [Карточка услуги: Проектирование (CAD/3D)](%D0%9A%D0%B0%D1%80%D1%82%D0%BE%D1%87%D0%BA%D0%B0%20%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8%20%D0%9F%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5%20(CAD%203D)%203d3a300e27fd4b5caff9825bc4d0e450.md)

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
- [Навигация (пользовательская)](%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F%20(%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B0%D1%8F)%202ba5dd285a3643f788773751f6d24184.md)
- [Навигация (техническая)](%D0%9D%D0%B0%D0%B2%D0%B8%D0%B3%D0%B0%D1%86%D0%B8%D1%8F%20(%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B0%D1%8F)%20103c222189b04e90a7529840e9faf9dc.md)
