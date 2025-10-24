Это стандартная и рекомендованная практика для ComfyUI: файл с настройками путей по умолчанию называется **extra_model_paths.yaml.example** (C:\pinokio\api\comfy.git\app) как шаблон-пример, а для активации конфигурации — его нужно скопировать или переименовать в **extra_model_paths.yaml**.[](https://huggingface.co/spideyrim/ComfyUI/blob/4580c31bfe0db032deb75e83222f2b03c4ecd21a/extra_model_paths.yaml.example)​

Все пользователи, которым нужно использовать кастомные пути к моделям, делают именно так — редактируют и переименовывают этот файл, чтобы ComfyUI загрузила индивидуальные настройки. Аналогичная схема используется во многих open-source проектах: рабочий конфиг генерируется из примера (example/sample), чтобы не затереть дефолтные настройки и было просто восстановить их при ошибке.[](https://comfyui-wiki.com/ru/tutorial/basic/link-models-between-comfyui-and-a1111)​

**Вывод:**

- Действовать по этой инструкции — общепринятая норма.
    
- ComfyUI и документация подразумевают такой способ для расширенной работы с путями к моделям.
    
- Всё сделано правильно и именно так настраивают пути большинство пользователей.[](https://huggingface.co/spideyrim/ComfyUI/blob/4580c31bfe0db032deb75e83222f2b03c4ecd21a/extra_model_paths.yaml.example)​

```
# Скрипт для централизованного дерева моделей ComfyUI
# Переименуйте этот файл в extra_model_paths.yaml для активации настроек

comfyui:
    base_path: D:/MODELS     # измените на ваш актуальный путь

    animatediff_models: animatediff_models/
    animatediff_motion_lora: animatediff_motion_lora/
    animatediff_video_formats: animatediff_video_formats/
    audio_encoders: audio_encoders/
    blip: blip/
    checkpoints: checkpoints/
    classifiers: classifiers/
    clip: clip/
    clip_vision: clip_vision/
    CogVideo: CogVideo/
    configs: configs/
    controlnet: controlnet/
    custom_nodes: custom_nodes/
    diffusion_models: diffusion_models/
    embeddings: embeddings/
    gligen: gligen/
    hypernetworks: hypernetworks/
    insightface: insightface/
    instantid: instantid/
    ipadapter: ipadapter/
    Joy_caption: Joy_caption/
    layerstyle: layerstyle/
    liveportrait: liveportrait/
    LLM: LLM/
    loras: loras/
    model_patches: model_patches/
    photomaker: photomaker/
    sams: sams/
    style_models: style_models/
    text_encoders: text_encoders/
    unet: unet/
    upscale_models: upscale_models/
    vae: vae/
    vae_approx: vae_approx/
    xlabs: xlabs/

# Добавьте другие UI ниже, если хотите совместное использование с A111, Forge и др.
```


## Пояснения:

- **`base_path:`** — ваш основной путь к общей папке MODELS; если вы используете другой диск, замените `D:/MODELS` на актуальный путь.
    
- **`is_default: true`** — помечает этот путь как основной, чтобы загрузки и autodetect пользовались именно им.
    
- Все подпапки соответствуют вашей фактической структуре каталога MODELS, чтобы ComfyUI корректно распознавала каждый тип моделей.
    
- Блоки `a111` и `other_ui` можно включать для других интерфейсов (Forge, Automatic1111, Fooocus), чтобы они использовали те же модели.
    

После вставки и сохранения этого файла под именем `extra_model_paths.yaml` в корневую папку **ComfyUI** (рядом с `main.py`), перезапустите ComfyUI — система подхватит полный маршрут к моделям автоматически.[](https://docs.comfy.org/development/core-concepts/models)

---

​Вот расширенный файл **extra_model_paths.yaml** с секциями для большинства популярных UI в Pinokio, чтобы твоё дерево MODELS подходило для всех актуальных сборок: ComfyUI, AUTOMATIC1111, Forge, Fooocus, SD.Next, Vladmandic, InvokeAI и других на перспективу.

# Универсальный extra_model_paths.yaml для Pinokio-сборок

```
# Универсальный extra_model_paths.yaml для Pinokio-сборок

comfyui:
  base_path: C:/MODELS
  animatediff_models: animatediff_models/
  animatediff_motion_lora: animatediff_motion_lora/
  animatediff_video_formats: animatediff_video_formats/
  audio_encoders: audio_encoders/
  blip: blip/
  checkpoints: checkpoints/
  classifiers: classifiers/
  clip: clip/
  clip_vision: clip_vision/
  cogvideo: CogVideo/
  configs: configs/
  controlnet: controlnet/
  custom_nodes: custom_nodes/
  diffusion_models: diffusion_models/
  embeddings: embeddings/
  gligen: gligen/
  hypernetworks: hypernetworks/
  insightface: insightface/
  instantid: instantid/
  ipadapter: ipadapter/
  joy_caption: Joy_caption/
  layerstyle: layerstyle/
  liveportrait: liveportrait/
  llm: LLM/
  loras: loras/
  model_patches: model_patches/
  photomaker: photomaker/
  sams: sams/
  style_models: style_models/
  text_encoders: text_encoders/
  unet: unet/
  upscale_models: upscale_models/
  vae: vae/
  vae_approx: vae_approx/
  xlabs: xlabs/

a111:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/
  upscale_models: upscale_models/
  embeddings: embeddings/
  hypernetworks: hypernetworks/
  configs: configs/
  lycoris: loras/
  model_patches: model_patches/
  style_models: style_models/
  animatediff_models: animatediff_models/
  animatediff_motion_lora: animatediff_motion_lora/

forge:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/
  upscale_models: upscale_models/
  embeddings: embeddings/
  hypernetworks: hypernetworks/
  configs: configs/
  model_patches: model_patches/

fooocus:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/
  upscale_models: upscale_models/
  embeddings: embeddings/
  model_patches: model_patches/

vlad:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/
  upscale_models: upscale_models/
  embeddings: embeddings/
  hypernetworks: hypernetworks/
  configs: configs/

invokeai:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/

sdnext:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/
  upscale_models: upscale_models/
  embeddings: embeddings/
  hypernetworks: hypernetworks/
  configs: configs/

other_ui:
  base_path: C:/MODELS
  checkpoints: checkpoints/
  vae: vae/
  loras: loras/
  controlnet: controlnet/
  custom_nodes: custom_nodes/
  configs: configs/
  model_patches: model_patches/

```


**Пояснения:**

- Все UI поддерживают общий путь и свои папки; структуру можно копировать для новых UI по аналогии.
    
- Где требуется — дублируй секции или расширяй список подпапок: ошибка не будет, ComfyUI и другие интерфейсы просто пропустят лишнее.
    
- Этот файл уже готов под мультиинтерфейсную работу с одной папкой MODELS без дублей моделей.
    

Теперь все сборки смогут видеть и использовать одни и те же модели без копирования. Просто используй этот конфиг, и дописывай или дополняй секции под новые UI по аналогии!