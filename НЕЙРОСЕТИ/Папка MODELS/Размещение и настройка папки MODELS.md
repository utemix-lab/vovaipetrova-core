
Лучший способ избежать дублирования и централизовать хранение моделей (SD, LoRA, ControlNet и т.д.) для интерфейсов вроде ComfyUI, Stable Diffusion (AUTOMATIC1111 WebUI, Forge, Fooocus) — использовать одну общую папку MODELS и настроить для каждого интерфейса путь к этой папке или её подпапкам.[](https://comfyui-wiki.com/ru/install/install-models/install-checkpoint)​​

## Универсальное расположение папки MODELS

Рекомендуется создать отдельную папку на быстром диске, например:  
`D:\MODELS`

Внутри можно рассортировать по типам моделей:

- `MODELS\checkpoints` — основные SD модели (*.ckpt, *.safetensors)
    
- `MODELS\vae` — VAE сети
    
- `MODELS\loras` — LoRA модели
    
- `MODELS\controlnet` — ControlNet
    
- `MODELS\embeddings` — эмбеддинги
    
- Дополнительно: `MODELS\upscale_models`, `MODELS\hypernetworks`, `MODELS\clip` и др.
    

## Подключение папки MODELS в разных интерфейсах

## ComfyUI

1. Откройте папку ComfyUI (например, `ComfyUI_windows_portable\ComfyUI`).
    
2. Найдите файл `extra_model_paths.yaml.example`, скопируйте и переименуйте в `extra_model_paths.yaml`.
    
3. Откройте полученный файл в редакторе и пропишите пути к вашей общей папке, например:
    

text

`comfyui:   base_path: D:/MODELS  checkpoints: checkpoints/  loras: loras/  controlnet: controlnet/  vae: vae/  ...`

Сохраняете и перезапускаете ComfyUI.​[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​

## Stable Diffusion WebUI (AUTOMATIC1111)

- Для указания папки с чекпойнтами:
    
    - Откройте: `webui-user.bat` (для Windows)
        
    - В строке `set COMMANDLINE_ARGS=`, добавьте:  
        `--ckpt-dir "D:\MODELS\checkpoints" --vae-dir "D:\MODELS\vae" --lora-dir "D:\MODELS\loras" --controlnet-dir "D:\MODELS\controlnet"`
        
- Пример:
    
    text
    
    `set COMMANDLINE_ARGS=--ckpt-dir "D:\MODELS\checkpoints" --vae-dir "D:\MODELS\vae"`
    
- Также можно использовать символические ссылки, если интерфейс не поддерживает явное указание пути.[](https://github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/5053)​
    

## Другие WebUI (Forge, Fooocus)

- Аналогично — указывайте пользовательский путь к нужным подпапкам MODELS через параметры запуска (`--ckpt-dir`, `--lora-dir` и т.д.), либо меняйте пути в их конфиг-файлах.[](https://boosty.to/nevskiyart/posts/04ad256f-eb85-4a80-a0c7-2795b8e30d36)​
    

## Как избежать дублирования моделей

- Используйте только одну папку MODELS для загрузки новых моделей: скачивайте новые модели вручную туда, где центральное хранилище.
    
- Для редких интерфейсов, куда нельзя явно прописать путь — создавайте символические ссылки (symlink, ярлыки) на нужные подпапки из вашей папки MODELS.[](https://www.reddit.com/r/StableDiffusion/comments/1ewndwa/is_there_a_way_to_share_models_folder_between_two/)​
    
- Проверяйте структуру: все программы видят корректное дерево подпапок.
    

## Пример структуры папки MODELS

text

`D:\   MODELS\    checkpoints\    loras\    vae\    controlnet\    embeddings\    upscale_models\`

Такой подход позволит всем вашим WebUI видеть одни и те же модели и избавит от лишних копий.​[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​

---

Если потребуется подробная инструкция под вашу сборку — уточните, каким интерфейсом пользуетесь чаще всего, на каком языке и ОС, чтобы получить точный набор команд настройки.

---

Для максимальной универсальности и совместимости с ComfyUI, Stable Diffusion WebUI и аналогичными интерфейсами рекомендуется создать следующий полный список подпапок — почти все возможные классы (типы) моделей в современных графических WebUI:[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​

## Рекомендуемая структура папки MODELS

- checkpoints  
    Основные модели SD (*.ckpt, *.safetensors)[](https://stable-diffusion-art.com/models/)​
    
- loras  
    LoRA и LoCon аддоны (стилизация, доп. веса)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- vae  
    Варианты VAE (улучшение цвета, лиц)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- controlnet  
    Сети управления позой, композицией, формой[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- embeddings  
    Эмбеддинги (Textual inversion, стили)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- upscale_models  
    Апскейлеры изображений (ESRGAN, Real-ESRGAN)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- hypernetworks  
    Гиперсети для глубоких стилевых изменений[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- animatediff_models  
    Модели анимационной диффузии (AnimateDiff)[](https://www.reddit.com/r/StableDiffusion/comments/1ftr71p/any_models_like_these_for_stable_diffusioncomfyui/)​
    
- animatediff_motion_lora  
    LoRA для движений в видео/аниме[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- animatediff_video_formats  
    Для новых форматов видео (аниме, motion)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- diffusion_models  
    Альтернативные диффузионные модели[](https://huggingface.co/docs/diffusers/en/using-diffusers/other-formats)​
    
- classifers  
    Для классификации изображений, масок, стилей[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- clip  
    Модели CLIP для анализа промтов[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- clip_vision  
    Варианты CLIP для обработки визуальных данных[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- configs  
    Конфиги моделей и пайплайнов[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- photomaker  
    Специализированные сетки для Photomaker типа LoRA[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- gligen  
    GLIGEN сети (advanced spatial control)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- style_models  
    Стили изображений или домены генерации[](https://stable-diffusion-art.com/sdxl-styles/)​
    
- unet  
    Альтернативные/специализированные слои UNet​[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- vae_approx  
    Приближённые VAE сети[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- ipadapter  
    Интеграция с IP-Adapters (например, лицевой контроль)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- liveportrait  
    Модели для анимирования портретов, talking face[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- insightface  
    Для распознавания лиц и face swap[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- layerstyle  
    Стилевые слои, кастомные фильтры[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- LLM  
    Для интеграции с языковыми моделями[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- Joy_caption  
    Автоматические подписчики (caption generators)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- sams  
    Модели семантической сегментации (SAM)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- blip  
    BLIP генераторы описаний[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- CogVideo  
    Модели генерации видео CogVideo[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- xlabs  
    Экспериментальные модели, лаборатории[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- instantid  
    Молниеносное распознавание лица (InstantID)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    
- custom_nodes  
    Кастомные узлы или функционал (у ComfyUI)[](https://comfyui-wiki.com/en/tutorial/basic/link-models-between-comfyui-and-a1111)​
    

---

## Как использовать

- Не все интерфейсы используют все папки — но если структура папки общая, вы избежите хаоса и легко адаптируете новые WebUI.[](https://github.com/AUTOMATIC1111/stable-diffusion-webui/discussions/5053)​
    
- В папке MODELS можно создать только нужные подпапки, остальные добивать по мере необходимости.
    
- Пример: для A1111 — нужны checkpoints, loras, vae, controlnet, embeddings, upscale_models; для ComfyUI — почти весь список выше.
    

---

Такой каталог позволит централизовать и грамотно сортировать все типы моделей как для генерации, так и для обработки изображений, а также поддерживать мульти-UI сценарий без дублей.[](https://docs.comfy.org/development/core-concepts/models)​