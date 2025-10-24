
<!-- VST Visual Block -->
<div style="width: 100%; max-width: 800px; margin: 0 auto; font-family: sans-serif;">

  <!-- Обложка -->
  <div style="width: 100%; overflow: hidden;">
    <a href="https://www.youtube.com/watch?v=V_TnMfjXxEM&t=24s" target="_blank" rel="noopener noreferrer">
      <img src="Amplesound-cover.jpg" alt="VST Cover" style="width: 100%; max-width: 960px; height: auto; object-fit: cover;">
    </a>
  </div>

  <!-- Отступ -->
  <div style="height: 20px;"></div>

  <!-- Логотип -->
  <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
    <a href="obsidian://open?vault=DU&file=Ample%20Sound">
      <img src="Amplesound-logo.png" alt="Ample Sound Logo" style="max-height: 50px; height: auto;">
    </a>
  </div>
  
</div>

<!-- VST Visual Block -->
<div style="width: 100%; max-width: 800px; margin: 0 auto; font-family: sans-serif;">

  <!-- Обложка -->
  <div style="width: 100%; overflow: hidden;">
    <a href="https://www.youtube.com/watch?v=V_TnMfjXxEM&t=24s" target="_blank" rel="noopener noreferrer">
      <img src="Amplesound-cover.jpg" alt="VST Cover" style="width: 100%; max-width: 960px; height: auto; object-fit: cover;">
    </a>
  </div>

  <!-- Отступ -->
  <div style="height: 20px;"></div>

  <!-- Логотип + Флаг -->
  <div style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 20px;">
    <!-- Логотип -->
    <a href="obsidian://open?vault=DU&file=Ample%20Sound">
      <img src="Amplesound-logo.png" alt="Ample Sound Logo" style="max-height: 50px; height: auto;">
    </a>

    <!-- Флаг страны -->
    <a href="obsidian://open?vault=DU&file=China">
      <img src="китай.png" alt="Flag of China" style="max-height: 50px; height: auto;">
    </a>
  </div>

</div>

### 🔧 Как использовать блок:

#### 📌 Где редактировать:

- Вставляешь этот HTML-блок в HTML-страницу сайта.
    
- В Obsidian можно вставлять как обычный блок кода.

- Но _визуально отображаться не будет_, если не используешь HTML-плагины (например HTML Reader)

---

### 🖼 Как вставить картинки:

- `cover.jpg` — путь к **основной обложке** 16:9 (например, `/assets/vst/ample_bass/cover.jpg`)
    
- `logo.png` — путь к **логотипу компании**, PNG желательно с прозрачным фоном
    

#### ✏️ Пример замены:

```
<img src="/assets/vst/ample_bass/cover.jpg" alt="Ample Bass Cover" />
<img src="/assets/logos/ample_sound_logo.png" alt="Ample Sound Logo" />
```

🔗 Кликабельность логотипа:

```
<a href="https://www.amplesound.net" target="_blank" rel="noopener noreferrer">
  <img src="logo.png" />
</a>
```

- Это делает логотип кликабельным и безопасным (через `rel="noopener"`).
    
- **Нагрузка минимальна**: это обычная ссылка + картинка. Весит столько же, сколько и некликабельный логотип.
    

---

### 📱 Адаптация под разные устройства:

- Используется `aspect-ratio`, `max-width` и `object-fit`, что позволяет:
    
    - Сохранять пропорции блоков
        
    - Подгонять размеры под ширину экрана
        
    - Центрировать лого и обложку
        
- Всё это работает адаптивно и быстро даже на мобильных устройствах.

### 🔁 Если ты хочешь **внутреннюю ссылку в Obsidian** — на страницу `Ample Sound`, то:

1. **HTML-ссылки не распознают Obsidian-вики-формат** (`[[Ample Sound]]`) внутри HTML-блока.
    
2. Но ты можешь использовать **специальную JavaScript-ссылку**, которую поддерживает плагин **Obsidian HTML Embed Render**:
    

---
### ✨ Вот **обновлённая красивая версия** твоего `VST Visual Block` с раскрывающимся разделом:

<div style="width: 100%; max-width: 800px; margin: 0 auto; font-family: sans-serif;">

  <!-- Обложка -->
  <div style="width: 100%; overflow: hidden;">
    <a href="https://www.youtube.com/watch?v=V_TnMfjXxEM&t=24s" target="_blank" rel="noopener noreferrer">
      <img src="Amplesound-cover.jpg" alt="VST Cover" style="width: 100%; max-width: 960px; height: auto; object-fit: cover;">
    </a>
  </div>

  <!-- Отступ -->
  <div style="height: 20px;"></div>

  <!-- Логотип -->
  <div style="width: 100%; display: flex; justify-content: center; align-items: center;">
    <a href="obsidian://open?vault=DU&file=Ample%20Sound">
      <img src="Amplesound-logo.png" alt="Ample Sound Logo" style="max-height: 50px; height: auto;">
    </a>
  </div>

  <!-- Отступ -->
  <div style="height: 30px;"></div>

  <!-- Раскрывающийся блок с информацией -->
  <details style="font-size: 0.9em; background-color: #f7f7f7; padding: 1rem; border-radius: 8px; border: 1px solid #ddd;">
    <summary style="cursor: pointer; font-weight: bold; font-size: 1em;">Дополнительная информация</summary>
    <p style="margin-top: 10px;">
      Ample Sound — один из ведущих производителей VST-инструментов, специализирующийся на реалистичных виртуальных гитарах, басах и других инструментах. Поддерживаются форматы: VST, AU, AAX, Standalone.
    </p>
    <p>
      🔗 Официальный сайт:  
      <a href="https://www.amplesound.net/en/pro-pd.asp?id=7" target="_blank">amplesound.net</a>
    </p>
    <p>
      🏷️ Теги: #VST #AU #AAX #Standalone #Guitar #Virtual_Instrument #Ample_Sound
    </p>
  </details>

</div>


Отступы и структура строк в HTML на рендер не влияют напрямую (браузер или плагин всё «сплющит» в одну линию при необходимости), **но читаемость кода — важна для тебя**, особенно если будешь часто править вручную.

Раскрывающиеся списки, которые ты упомянул, действительно **не обязательны**, но могут сделать блок визуально более аккуратным и удобным, если:

- хочется спрятать часть информации (например, технические детали, дополнительные ссылки),
    
- или если блоки слишком длинные.

### ✅ Пример кликабельного логотипа **на внутреннюю страницу Obsidian**:

```
<a href="obsidian://open?vault=Название_Твоего_Хранилища&file=Ample%20Sound">
  <img src="assets/vst/ample_bass/logo.png" alt="Ample Sound Logo" style="height: 70px; object-fit: contain;">
</a>
```

### 📌 Обрати внимание:

- `vault=...` — название твоего vault, **точно как в Obsidian**.
    
- `file=...` — название страницы (пробелы заменяй на `%20`).
    
- Это работает **только на ПК**, где установлен Obsidian, потому что использует **протокол `obsidian://`**.
    

---

### 🧪 Пример:

Если vault называется `vova_project`, а страница — `Ample Sound`, то:

```
<a href="obsidian://open?vault=vova_project&file=Ample%20Sound">
```

---

<span class="tag">#Ambient_Pad</span>
<span class="tag">#Jazz</span>
<span class="tag">#Fingerstyle</span>

<div class="tag-list">
  <div class="tag">#Guitar</div>
  <div class="tag">#Acoustic</div>
  <div class="tag">#Steel_String</div>
  <div class="tag">#KONTAKT</div>
  <div class="tag">#Realistic_Guitar</div>
</div>

#### Теги
#Guitar #Acoustic #Steel_String #KONTAKT #Realistic_Guitar

<div style="display: flex; flex-wrap: wrap; gap: 6px;">
  <span>#Guitar</span>
  <span>#Acoustic</span>
  <span>#Steel_String</span>
  <span>#KONTAKT</span>
  <span>#Realistic_Guitar</span>
</div>


**Tags:**  
  #Guitar #Acoustic #Steel_String #KONTAKT #Realistic_Guitar

<div style="display: flex; align-items: flex-start; font-family: sans-serif; flex-wrap: wrap;">
  <div style="min-width: 60px; font-weight: bold;">Tags:</div>
  <div style="flex: 1;">
    <span style="margin-right: 10px;">#Guitar</span>
    <span style="margin-right: 10px;">#Acoustic</span>
    <span style="margin-right: 10px;">#Steel_String</span>
    <span style="margin-right: 10px;">#KONTAKT</span>
    <span style="margin-right: 10px;">#Realistic_Guitar</span>
  </div>
</div>

<div style="margin-left: 2em;">
#Guitar #Acoustic #Steel_String #KONTAKT #Realistic_Guitar #Realistic_Plucked #Nylon #Soft_Tone #Open_String
</div>

**Tags:**  
#Guitar #Acoustic #Steel_String #KONTAKT #Realistic_Guitar #Soft_Tone #Open_String

Артикуляции:
🎯 Palm Mute | Slide | Harmonics

Техники игры:
🎸 Fingerstyle | Strumming | Picked
