
<div class="image-text-block" style="position: relative; margin-top: 2em; height: 200px; width: 100%; max-width: 600px;"> <img src="red.png" alt="Вова" style="width: 100%; height: 100%; object-fit: cover;" /> <div class="text left" style="position: absolute; top: 20%; left: 10px; color: white; max-width: 50%; font-style: italic;"> Лучшим способом освоения этого инструмента было изучение MIDI-файлов в их демо-версиях. Различные шумы не имеют переключателей включения/выключения. У них есть слайдеры, которые, на мой взгляд, гораздо предпочтительнее. </div> <!-- Пример текста справа, если нужно --> <!-- <div class="text right" style="position: absolute; top: 30%; right: 10px; color: white; max-width: 50%; font-style: italic;"> Ваш текст справа поверх картинки. </div> --> </div>

---

<div class="image-text-block" style="position: relative; width: 100%; max-width: 600px; height: 250px;">
  <img src="red.png" alt="Вова" style="width: 100%; height: 100%; object-fit: cover;" />
<div class="overlay-text"
     style="
       position: absolute;
       left: 10px;
       top: 15%;
       color: white;
       font-style: italic;
       max-width: 70%;
       overflow-wrap: break-word;
       word-break: break-word;
       text-shadow: 1px 1px 4px #000a;
     ">
    
Лучшим способом освоения этого инструмента было изучение MIDI-файлов в их демо-версиях. Различные шумы не имеют переключателей включения/выключения. У них есть слайдеры, которые, на мой взгляд, гораздо предпочтительнее.
</div>

</div>

## Инструкция по изменению настроек внутри кода

- Измените текст в блоке `<div class="overlay-text">ВАШ ТЕКСТ</div>`.
    
- Для позиционирования текста:
    
    - Для выравнивания слева используйте `left: 10px;` и `right: auto;`
        
    - Для выравнивания справа поменяйте на `right: 10px;` и `left: auto;`
        
- Для управления вертикальным положением текста измените значение `top` в процентах, например, `top: 30%;` — это отступ сверху.
    
- Для цвета текста задайте желаемое значение в свойстве `color`, например, `color: white;` или `color: #ffcc00;`.
    

Если нужно, могу помочь сделать на CSS-классы, чтобы было ещё удобнее править.

---

Чтобы контролировать переносы текста и избежать произвольного разбиения на строки, можно использовать CSS-свойства для управления переносом и шириной блока текста. Вот что можно сделать:

- Установить фиксированную или максимальную ширину блока текста через `max-width` или `width`.
    
- Добавить `word-break: break-word;` или `overflow-wrap: break-word;` чтобы слова корректно переносились на новую строку без разрывов по символам.
    
- Если хотите запретить перенос слов вообще, используйте `white-space: nowrap;` (но обычно это неудобно для абзацев).
    

В ваш стиль текста добавьте, например:

```
max-width: 50%;           /* фиксирует максимальную ширину блока */
overflow-wrap: break-word; /* переносит слова по необходимости */
```

Если хотите, чтобы текст переносился только по пробелам и не разрывался в середине слов, используйте:

```
word-break: normal;
overflow-wrap: normal;
```

