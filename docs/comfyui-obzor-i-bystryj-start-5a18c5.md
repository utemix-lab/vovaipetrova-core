---
title: ComfyUI — обзор и быстрый старт
slug: comfyui-obzor-i-bystryj-start-5a18c5
summary: >
  Шпаргалка по настройке пайплайнов ComfyUI: пресеты, интеграции и контроль
  качества рендеров.
tags: []
machine_tags: []
status: ready
service: true
---
# ComfyUI — обзор и быстрый старт

## TL;DR
- ComfyUI даёт визуальный контроль над графом генерации: видно каждый узел и параметр.
- Храним набор пресетов для типовых задач (портрет, продукт, фон) и делимся через Git.
- Контролируем качество через сравнение seed, сохранение промежуточных карт и логов.

## Подготовка окружения
1. Обновите GPU-драйверы и установите зависимости (`python -m pip install -r requirements.txt`).  
2. Структурируйте модели: чекпойнты, VAE, LoRA в отдельных папках, чтобы настройки были переносимыми.  
3. Настройте autosave: `Settings → Save to → Custom path`, храните результаты и workflow вместе.

## Шаблоны пайплайнов
- **Base render.** SDXL + CFG 6–7, 1024×1024, k-sampler `dpmpp_2m`.  
- **Product pack.** Инпейнтинг + control net depth, масштаб 3:4, связки с шаблонами подсветки.  
- **Видео-луп.** KSampler → Frame Interpolation → VideoCombine, кадры на 24 fps.

## Контроль качества
- Для сравнения вариантов фиксируйте seed и сохраняйте метаданные (`Save Prompt`).  
- Проверяйте логи VRAM — если падаем, оптимизируйте граф (remove unused branches).  
- Встраивайте генерацию в пайплайны публикации: готовые ассеты попадают в Notion и GitHub автоматически.

## Связано с…
- [ComfyUI — обзор и быстрый старт](comfyui-obzor-i-bystryj-start.md)
- [Таксономия и теги](taksonomiya-i-tegi.md)
- [Услуги](uslugi.md)
- [Вова и Петрова](vova-i-petrova.md)
