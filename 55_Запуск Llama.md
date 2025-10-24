
### ✅ Как правильно запускать (всегда!)

Вот **чёткая последовательность** команд — запомни её или сохрани в шпаргалке:

```
cd /hdd/llama/text-generation-webui        # 1. Перейти в папку проекта
source venv/bin/activate                   # 2. Активировать виртуальное окружение (venv)
python3 server.py --model LLaMA-2-7B-GGUF --loader llama-cpp --listen --listen-port 7860   # 3. Запустить сервер
```
