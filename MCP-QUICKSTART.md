# Быстрый старт: MCP сервер с OpenRouter

## Что это даёт

✅ **Локальный доступ к файлам** через MCP протокол  
✅ **Работа через OpenRouter** с разными моделями  
✅ **Параллельная работа** с основным Composer  
✅ **Полная интеграция** с Cursor

## Установка (5 минут)

### 1. Установите зависимости

```bash
npm install
```

### 2. Создайте файл `.env` (если ещё нет)

```env
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ
PROJECT_ROOT=R:\vovaipetrova-core
```

### 3. Настройте Cursor

Создайте файл конфигурации MCP:

**Windows:** `%APPDATA%\Cursor\mcp.json`  
**macOS/Linux:** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "openrouter-file-access": {
      "command": "node",
      "args": [
        "R:\\vovaipetrova-core\\mcp-server-openrouter.mjs"
      ],
      "env": {
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "PROJECT_ROOT": "R:\\vovaipetrova-core"
      }
    }
  }
}
```

**Важно:** Замените путь `R:\\vovaipetrova-core` на ваш реальный путь к проекту.

### 4. Перезапустите Cursor

Закройте и откройте Cursor заново, чтобы загрузить MCP сервер.

## Проверка работы

После перезапуска Cursor:
1. Откройте новый чат
2. MCP сервер должен быть доступен как дополнительный ассистент
3. Попробуйте: "Прочитай файл docs/README.md"

## Альтернатива: Использование разных моделей в Composer

Если MCP кажется сложным, можно просто переключать модели в настройках Cursor:

1. **Откройте настройки Cursor** (Ctrl+,)
2. **Найдите "Cursor: Model"**
3. **Выберите модель** или настройте кастомный endpoint:
   - Base URL: `https://openrouter.ai/api/v1`
   - Model: `anthropic/claude-3.5-sonnet`
   - API Key: ваш ключ OpenRouter

## Разделение задач

### Стратегия:

**Composer (основной):**
- Работа с файлами
- Редактирование кода
- Использование основной модели

**MCP сервер (второй поток):**
- Дополнительные запросы
- Параллельная обработка
- Другие модели через OpenRouter

## Troubleshooting

### MCP сервер не запускается
```bash
# Проверьте, что Node.js установлен
node --version

# Проверьте путь к скрипту
node mcp-server-openrouter.mjs
```

### OpenRouter ошибки
- Проверьте API ключ в `.env`
- Убедитесь, что баланс на OpenRouter достаточен
- Проверьте доступность модели

### Cursor не видит MCP
- Перезапустите Cursor
- Проверьте путь в `mcp.json`
- Откройте DevTools (Help → Toggle Developer Tools) и проверьте логи

## Подробная документация

См. [docs/cursor-mcp-openrouter-setup.md](docs/cursor-mcp-openrouter-setup.md)

