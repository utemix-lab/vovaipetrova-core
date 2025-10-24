
## Где искать исчерпывающую документацию

- **Официальная документация по эмоциям, тону и спецэффектам**:  
    [https://docs.fish.audio/resources/best-practices/emotion-control](https://docs.fish.audio/resources/best-practices/emotion-control)  
    [https://docs.fish.audio/developer-platform/emotions](https://docs.fish.audio/developer-platform/emotions)  
    Здесь есть полный список поддерживаемых эмоций, тонов, спецэффектов (смех, паузы и т.д.), а также примеры использования маркеров прямо в тексте запроса.[](https://docs.fish.audio/developer-platform/emotions)​
    
- **GitHub-репозиторий с описанием моделей и параметров запуска**:  
    [https://github.com/fishaudio/fish-speech](https://github.com/fishaudio/fish-speech)  
    Тут указано, как выбрать модель (например, S1 или S1-mini), какие параметры доступны для CLI и API, и есть ссылки на демо.[](https://github.com/fishaudio/fish-speech)​
    
- **Онлайн-демо S1 и S1-mini**:  
    [https://kiylu-fish-audio-t.hf.space/?__theme=system](https://kiylu-fish-audio-t.hf.space/?__theme=system)  
    [https://huggingface.co/spaces/fishaudio/openaudio-s1-mini](https://huggingface.co/spaces/fishaudio/openaudio-s1-mini)  
    Можно тестировать разные версии моделей, сравнить голоса и фичи.[](https://kiylu-fish-audio-t.hf.space/?__theme=system)​
    

## Как вставлять эмоции, паузы, спецэффекты

Использовать текстовые теги, которые распознаёт движок:

- Для эмоций: `(happy)`, `(sad)`, `(angry)`, `(excited)` и десятки других — полный список есть в документации.[](https://docs.fish.audio/developer-platform/emotions)​
    
- Для звуковых эффектов: `(laughing)`, `(sighing)`, `(whispering)`, `(yawning)`, `(break)` (короткая пауза), `(long-break)` (длинная пауза), `(audience laughing)` и др..[](https://docs.fish.audio/developer-platform/emotions)​
    
- Для модификации темпа, громкости и тона: `(soft tone)`, `(shouting)`, `(hurried)`, `(calm)`, `(screaming)` и прочее.[](https://docs.fish.audio/developer-platform/emotions)​
    

**Пример:**

text

`(happy) Привет! Как дела? (laughing) (sad)(whispering) Мне грустно... (break) Сейчас будет длинная пауза! (long-break)`

## Как выбрать S1 вместо S1-mini

- Обычно выбор делается на этапе запуска или настройки:
    
    - Если работаешь через локальные скрипты или API: указывай модель `S1` или `S1-mini` в конфиге (`model: S1`), через параметр запуска или в web-интерфейсе (если поддерживает выбор).[](https://huggingface.co/spaces/fishaudio/openaudio-s1-mini)​
        
    - В некоторых веб-версиях доступны выпадающие списки с выбором модели. В демо на Hugging Face можно тестировать обе версии.[](https://kiylu-fish-audio-t.hf.space/?__theme=system)​
        
    - Если интерфейс урезан и не даёт выбора — меняется модель при пересборке среды/запуске процесса через командную строку или путем ручного редактирования конфиг-файла (см. инструкции на GitHub).[](https://github.com/fishaudio/fish-speech)​
        

## Для расширенного управления — смотри:

- Документация с примерами текстовых маркеров[](https://docs.fish.audio/developer-platform/emotions)​
    
- Описание аргументов запуска/конфигурации моделей[](https://github.com/fishaudio/fish-speech)​
    
- Видео-инструкции и туториалы​
    
- Раздел Issues на GitHub — для решения конкретных технических проблем[](https://github.com/fishaudio/fish-speech/issues/1030)​
    

**Если нужен прямой российский или нейтральный голос, выбирай S1, тестируй разные референсы и смотри настройки эмоций и эффектах**.[](https://github.com/fishaudio/fish-speech)​

Все официальные инструкции и теги доступны в документации и в репозитории Fish Speech / Open Audio.[](https://docs.fish.audio/resources/best-practices/emotion-control)​​​