
Для наглядного изучения подключения нод и “кабелей” (workflow connections) в ComfyUI, проще всего скачать готовые примеры рабочих процессов (workflow) — их можно загрузить прямо в UI и посмотреть структуру, подключение каждой ноды и ее логику.

## Где скачать примеры похожих воркфлоу

## 1. **Официальные примеры ComfyUI**

- Репозиторий с коллекцией воркфлоу:  
    [https://github.com/comfyanonymous/ComfyUI_examples](https://github.com/comfyanonymous/ComfyUI_examples)  
    В нем лежат десятки разных примеров, включая `img2img`, частичное изменение изображения, ControlNet, стиль, маски и даже inpainting — скачайте `*.json` или workflow PNG, перетащите в свое окно ComfyUI.[](https://comfyui-wiki.com/ru/workflows/img2img)​
    

## 2. **ComfyUI Wiki и сайты с русским объяснением**

- [https://comfyui-wiki.com/ru/workflows/img2img](https://comfyui-wiki.com/ru/workflows/img2img)  
    Содержит примеры сценариев и пошаговые схемы подключения узлов для img2img, частичной генерации, использования reference-image и параметров denoise.[](https://comfyui-wiki.com/ru/workflows/img2img)​
    

## 3. **Примеры с ControlNet и частичным изменением**

- [https://docs.comfy.org/tutorials/controlnet/controlnet](https://docs.comfy.org/tutorials/controlnet/controlnet)  
    Тут есть готовый workflow с ControlNet (workflow PNG с metadata).[](https://docs.comfy.org/tutorials/controlnet/controlnet)​
    

## 4. **YouTube и DTF Guides**

- По запросу “ComfyUI workflow”, “img2img ComfyUI” или “inpainting ComfyUI” можно найти видео с разбором подключения.
    
- Пример: “ComfyUI 13 img2img Workflow (free download)” — в описании есть файлы и схематичное подключение.​
    

---

## Как использовать скачанный workflow

1. Скачайте нужный `.json` или PNG оттуда, где явно написано “workflow для ComfyUI”.
    
2. В ComfyUI нажмите “Open Workflow” (или перетащите файл/картинку прямо в рабочее поле интерфейса).
    
3. Вам откроется наглядная схема — все кабели, ноды и порядок генерации.
    
4. Изучите логику соединений и расположения: это лучший способ понять, что и куда подключается в аналогичном процессе.
    

---

**Вывод:**  
Лучшие источники — [github.com/comfyanonymous/ComfyUI_examples], comfyui-wiki, оф. туториалы и отдельные изображения/JSON с workflow. Просто скачайте, загрузите в ComfyUI, и изучайте наглядную схему подключения "кабелей" между нодами и их настройками. Вы сразу увидите рабочий пример для img2img, ControlNet и частичного редактирования.[](https://github.com/comfyanonymous/ComfyUI_examples)​