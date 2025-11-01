#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VOVA VST CRAWLER v0.1
Автоматизированная система создания страниц VST-инструментов

Автор: Sam (companion-coordinator)
Дата: 2025-11-01
Статус: прототип
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional


class VovaVSTCrawler:
    """Агент Вова для парсинга и документирования VST-инструментов"""
    
    def __init__(self, config_path: str = "vova_config_vst.json"):
        """Инициализация с загрузкой конфига"""
        self.config = self._load_config(config_path)
        self.tags_db = self._load_tags_db()
        print(f"✅ Вова VST Crawler v{self.config['version']} готов!")
    
    def _load_config(self, path: str) -> Dict:
        """Загрузка конфигурации"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _load_tags_db(self) -> Dict:
        """Загрузка базы тегов"""
        tags_path = self.config['tags']['database']
        if os.path.exists(tags_path):
            with open(tags_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"categories": {}}
    
    def generate_md_file(self, instrument: Dict) -> str:
        """Генерация .md файла для инструмента"""
        
        # Формируем frontmatter
        frontmatter = self._generate_frontmatter(instrument)
        
        # HTML Visual Block
        html_block = self._generate_html_block(instrument)
        
        # Описание
        description = instrument.get('description', '')
        
        # Комментарий Вовы
        vova_comment = self._generate_vova_comment(instrument)
        
        # Offers
        offers = self._generate_offers(instrument)
        
        # Собираем всё вместе
        md_content = f"{frontmatter}\n{html_block}\n{description}\n{vova_comment}\n{offers}"
        
        return md_content
    
    def _generate_frontmatter(self, instrument: Dict) -> str:
        """Генерация YAML frontmatter"""
        title = instrument['title']
        manufacturer = instrument['manufacturer']
        manufacturer_url = instrument.get('manufacturer_url', '#')
        categories = instrument.get('categories', [])
        tags = instrument.get('tags', [])
        
        # Формируем manufacturer с внутренней и внешней ссылкой
        manufacturer_link = f"[[{manufacturer}]] [{manufacturer}]({manufacturer_url})"
        
        # Формируем категории
        categories_links = ' '.join([f"[[{cat}]]" for cat in categories])
        
        # Формируем теги
        tags_str = ' '.join([f"#{tag}" for tag in tags])
        
        frontmatter = f"""---
STRICT: DO NOT MODIFY MANUALLY
Title: {title}
Manufacturer: {manufacturer_link}
Category: {categories_links}
Tags: {tags_str}
---"""
        
        return frontmatter
    
    def _generate_html_block(self, instrument: Dict) -> str:
        """Генерация HTML визуального блока"""
        cover_image = instrument.get('cover_image', 'cover.jpg')
        video_url = instrument.get('video_url', '#')
        logo_image = instrument.get('logo_image', 'logo.png')
        manufacturer = instrument['manufacturer']
        country = instrument.get('country', 'Unknown')
        flag_image = instrument.get('flag_image', 'flag.png')
        
        html = f'''🔒 DO NOT CHANGE THE STRUCTURE. EDIT VALUES.
<div style="width: 100%; max-width: 800px; margin: 0 auto; font-family: sans-serif;">
  <!-- Обложка -->
  <div style="width: 100%; overflow: hidden;">
    <a href="{video_url}" target="_blank" rel="noopener noreferrer">
      <img src="{cover_image}" alt="VST Cover" style="width: 100%; max-width: 960px; height: auto; object-fit: cover;">
    </a>
  </div>
  <!-- Отступ -->
  <div style="height: 5px;"></div>
  <!-- Логотип + Флаг -->
  <div style="display: flex; justify-content: center; align-items: center; gap: 50px;">
    <!-- Логотип -->
    <a href="obsidian://open?vault=DU&file={manufacturer}">
      <img src="{logo_image}" alt="{manufacturer} Logo" style="max-height: 50px;">
    </a>
    <!-- Флаг -->
    <a href="obsidian://open?vault=DU&file={country}">
      <img src="{flag_image}" alt="{country} Flag" style="max-height: 50px;">
    </a>
  </div>
</div>'''
        
        return html
    
    def _generate_vova_comment(self, instrument: Dict) -> str:
        """Генерация комментария Вовы"""
        comment_text = instrument.get('vova_comment', 'Этот инструмент заслуживает внимания!')
        avatar = instrument.get('vova_avatar', 'vova-classic.png')
        
        html = f'''---
🔒 DO NOT CHANGE THE STRUCTURE. EDIT VALUES.
<div style="position: relative; display: flex; margin-top: 2em; height: auto; min-height: 120px;">
  <div style="width: 130px; flex-shrink: 0;">
    <img src="{avatar}" alt="Вова" style="width: 100%; height: auto;" />
  </div>
  <div style="position: relative; margin-left: 1em; padding-top: 10px;">
    <p style="font-style: italic; margin: 0;">
      {comment_text}
    </p>
  </div>
</div>'''
        
        return html
    
    def _generate_offers(self, instrument: Dict) -> str:
        """Генерация секции Offers"""
        offers = f'''---
🟢 CHANGE THE STRUCTURE AND VALUES.
#### Offers
##### Tag_Master:
- Проверить теги на уникальность

##### Nay:
- Добавить в видеохронику проекта

##### Vova:
- Создать ТГ-пост об инструменте

##### Structure:
- Предложения по улучшению формата
'''
        return offers
    
    def test_ample_sound(self) -> str:
        """Тестовый запуск на Ample Sound"""
        print("\n🧪 ТЕСТ: Генерация страницы Ample Guitar M...")
        
        # Тестовые данные на основе эталона
        test_instrument = {
            'title': 'Ample Guitar M',
            'manufacturer': 'Ample Sound',
            'manufacturer_url': 'https://www.amplesound.net/en/pro-pd.asp?id=7',
            'categories': ['Guitar', 'Acoustic Guitar'],
            'tags': ['Ample_Sound', 'Guitar', 'Acoustic', 'Steel_String', 'KONTAKT', 'Realistic_Guitar', 'Riffer', 'Strummer', 'Tab_Reader'],
            'country': 'China',
            'cover_image': 'ample-guitar-m-cover.jpg',
            'video_url': 'https://www.youtube.com/watch?v=V_TnMfjXxEM&t=24s',
            'logo_image': 'ample-sound-logo.png',
            'flag_image': 'china-flag.png',
            'vova_avatar': 'vova-classic.png',
            'vova_comment': 'Лучшим способом освоения этого инструмента было изучение MIDI-файлов в их демо-версиях. Различные шумы не имеют переключателей включения/выключения. У них есть слайдеры, которые, на мой взгляд, гораздо предпочтительнее.',
            'description': '''Ample Guitar M — это виртуальный инструмент, эмулирующий звучание акустической гитары Martin D-41.

#### System Requirements:
- Windows: Windows 7/8/10/11, только 64-разрядная версия.
- Mac: 10.9 или выше.
- [[VST2]] [[VST3]] [[AU]] [[AAX]] [[Standalone]]
- Жесткий диск объемом 10 ГБ, процессор Intel i5 или выше.

#### Sampling:
- Размер: 5,83 ГБ
- Три библиотеки сэмплов: Finger, Pick и Strum.
- Режимы стерео и моно.
- Управляемый резонансный звук.

#### Technology:
- CPC (Customized Parameters Control)
- Double Guitar
- Poly Legato and Slide Smoother
- Alternate Tuner

#### Riffer:
- Редактор струнных с 8 характеристиками для каждой ноты
- Dice - генератор случайных риффов
- Множественный выбор и управление

#### Strummer:
- 14 нот для бренчания + 28 способов воспроизведения
- Бренчание легато
- 4 настройки гуманизации

#### FX:
- 8-полосный эквалайзер
- 2-линейный компрессор
- 6-Tap Echo
- IR Reverb

#### Tab Reader:
- Загрузка и воспроизведение Guitar Pro форматов 4-8
- Экспорт в аудио'''
        }
        
        # Генерируем файл
        md_content = self.generate_md_file(test_instrument)
        
        # Сохраняем в draft
        output_path = Path("test_output_ample_guitar_m.md")
        output_path.write_text(md_content, encoding='utf-8')
        
        print(f"✅ Файл создан: {output_path}")
        print(f"📊 Размер: {len(md_content)} символов")
        print(f"\n📄 ПРЕВЬЮ (первые 500 символов):\n")
        print(md_content[:500])
        print("\n...")
        
        return md_content
    
    def process_producer(self, producer_name: str, producer_url: str, country: str):
        """Обработка одного производителя (заглушка для v0.1)"""
        print(f"\n🔍 Парсинг: {producer_name} ({country})")
        print(f"   URL: {producer_url}")
        print("   ⚠️  v0.1: реальный парсинг в следующей версии")
        print("   💡 Пока используем тестовые данные")


if __name__ == "__main__":
    print("="*60)
    print("🎸 VOVA VST CRAWLER v0.1")
    print("   Прототип системы документирования VST")
    print("="*60)
    
    # Инициализация
    vova = VovaVSTCrawler()
    
    # Тестовый запуск
    print("\n" + "="*60)
    print("🧪 ТЕСТОВЫЙ ЗАПУСК: Ample Sound")
    print("="*60)
    
    result = vova.test_ample_sound()
    
    print("\n" + "="*60)
    print("✅ ТЕСТ ЗАВЕРШЁН!")
    print("="*60)
    print("\n📌 СЛЕДУЮЩИЕ ШАГИ:")
    print("   1. Проверить test_output_ample_guitar_m.md")
    print("   2. Сравнить с эталоном")
    print("   3. Добавить реальный парсинг сайтов")
    print("   4. Интегрировать LLM для комментариев")
    print("\n🎯 Статус: ПРОТОТИП РАБОТАЕТ!\n")
