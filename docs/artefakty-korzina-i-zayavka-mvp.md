---
title: Артефакты — корзина и заявка (MVP)
slug: artefakty-korzina-i-zayavka-mvp
summary: >-
  Игровая витрина, где клиент собирает услуги и кейсы в корзину, а заявка
  автоматически подтягивает выбранные артефакты.
status: ready
tags:
  - UX
  - Автоматизация
  - Дизайн
machine_tags:
  - theme/ux
  - theme/automation
  - product/artifacts
  - product/services
  - action/build
  - theme/graphics
---
# Артефакты — корзина и заявка (MVP)

## TL;DR

- Корзина хранит выбранные услуги и кейсы, а заявка собирает их автоматически.
- Поддерживаются разные роли: гость, клиент и разработчик.
- Все действия ведут к единому webhook: письмо, CRM или Telegram.
- Экспорт артефактов идёт в локальное хранилище или серверную коллекцию.

Игровая витрина с роль‑ориентированным UI и «корзиной артефактов». Пользователь собирает примеры работ и пунктов услуг, прикладывает к заявке. В заявке — текст + ссылки на выбранные артефакты.

## Сущности (минимум)

- UserRole: novice | client | dev
- Artifact: {id, type: image|video|case|service|article, ref, title, cover, meta}
- ArtifactList: {user_id? or device_id, items: ArtifactRef[], notes}
- Service: {id, slug, title, description}
- Request: {id, user_id?, role, text, items: ArtifactRef[], contact, status}

## UI‑флоу

1) Выбор роли (шапка) → роль‑скин и стартовые маршруты

2) Кнопка «+ в артефакты» на карточках картинок, видео, кейсов, услуг

3) Просмотр артефактов (шторка/страница), удаление, заметки

4) Форма заявки: текст + автоматическая подстановка артефактов → предпросмотр → отправка

## API (черновик)

- POST /api/artifacts/add {item}
- POST /api/artifacts/remove {item_id}
- GET /api/artifacts/list
- POST /api/requests/create {text, items, contact, role}
- GET /api/services
- GET /api/cases

## Данные и хранение

- Гости: LocalStorage (artifact_list) + optional device_id
- Авторизованные: серверная коллекция артефактов, синхронизация при входе

## Правила и видимость

- Политики из тех‑навигации (roles, audience) → фильтры UI
- Ограничения: отправляем превью и ссылки, не оригиналы

## Интеграции

- Webhook в почту/CRM/Telegram с карточкой заявки

## Связано с…

- [Контент‑модель и маршруты](kontentmodel-i-marshruty.md)
- [Услуги](uslugi.md)
- [Навигация (пользовательская)](navigaciya-polzovatelskaya.md)
- [Навигация (техническая)](navigaciya-tehnicheskaya.md)
- [Карточка услуги: Проектирование (CAD/3D)](kartochka-uslugi-proektirovanie-cad3d.md)
