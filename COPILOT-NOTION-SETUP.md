# Настройка GitHub Copilot с Notion через MCP

## Быстрый старт (5 минут)

### Шаг 1: Установите зависимости

```bash
npm install
```

Это установит `@modelcontextprotocol/sdk`, необходимый для MCP сервера.

### Шаг 2: Создайте/проверьте файл `.env`

Убедитесь, что в корне проекта есть файл `.env` с токеном Notion:

```env
NOTION_API_KEY=secret_ваш_токен_или_ntn_ваш_токен
```

**Как получить токен:**
1. Перейдите на https://www.notion.so/my-integrations
2. Создайте новую интеграцию (Internal Integration)
3. Скопируйте токен (начинается с `secret_` или `ntn_`)
4. Предоставьте интеграции доступ к нужным страницам/базам данных

### Шаг 3: Проверьте работу MCP сервера

Запустите сервер вручную для проверки:

```bash
node mcp-server-notion.mjs
```

Должно показать:
```
MCP сервер Notion запущен
Notion API Base: https://api.notion.com/v1
API Key: ✅ установлен
```

Если видите ошибки — проверьте токен в `.env`.

### Шаг 4: Настройте Copilot в VS Code

**Вариант A: Через Command Palette (рекомендуется)**

1. Откройте VS Code
2. Нажмите `Ctrl+Shift+P` (Command Palette)
3. Введите: `MCP: Add Server`
4. Следуйте инструкциям:
   - **Name**: `notion`
   - **Command**: `node`
   - **Args**: `R:\vovaipetrova-core\mcp-server-notion.mjs` (замените на ваш путь)
   - **Env**: Добавьте `NOTION_API_KEY` = ваш токен

**Вариант B: Через файл конфигурации**

Создайте/отредактируйте файл конфигурации MCP для Copilot:

**Windows:**
```
%APPDATA%\Code\User\globalStorage\github.copilot\mcp.json
```

**macOS:**
```
~/Library/Application Support/Code/User/globalStorage/github.copilot/mcp.json
```

**Linux:**
```
~/.config/Code/User/globalStorage/github.copilot/mcp.json
```

Содержимое файла:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": [
        "R:\\vovaipetrova-core\\mcp-server-notion.mjs"
      ],
      "env": {
        "NOTION_API_KEY": "secret_ваш_токен"
      }
    }
  }
}
```

**Важно:** Замените путь `R:\\vovaipetrova-core\\` на ваш реальный путь к проекту.

### Шаг 5: Включите Agent Mode в Copilot

1. Откройте настройки VS Code (`Ctrl+,`)
2. Найдите "GitHub Copilot"
3. Найдите опцию "Agent Mode" или "Enable MCP"
4. Включите её
5. Перезапустите VS Code

### Шаг 6: Проверка работы

1. Откройте чат Copilot (`Ctrl+L` или через панель)
2. Попробуйте запрос:
   ```
   Найди в Notion страницы про "автоматизация"
   ```
3. Или:
   ```
   Получи страницу Notion с ID [ваш-page-id]
   ```

Если Copilot может использовать инструменты Notion — всё работает! ✅

## Доступные инструменты Notion

После настройки Copilot сможет использовать:

1. **notion_search** — поиск страниц и баз данных
2. **notion_fetch** — получение страницы/базы данных по ID
3. **notion_get_blocks** — получение содержимого страницы
4. **notion_create_page** — создание новой страницы
5. **notion_update_page** — обновление страницы
6. **notion_query_database** — запрос записей из базы данных

## Примеры использования

### Поиск в Notion
```
Найди в Notion все страницы про "проектирование"
```

### Получение страницы
```
Получи страницу Notion с URL https://notion.so/my-page-123
```

### Создание страницы
```
Создай новую страницу в Notion с заголовком "Новая задача" в родительской странице [parent-id]
```

### Обновление страницы
```
Обнови статус страницы [page-id] на "Готово"
```

## Troubleshooting

### Copilot не видит MCP сервер

1. **Проверьте версию VS Code:**
   - Должна быть ≥ 1.102 (июль 2024)
   - Help → About → проверьте версию

2. **Проверьте версию расширения Copilot:**
   - Extensions → GitHub Copilot → Update (если доступно)

3. **Проверьте конфигурацию MCP:**
   - Убедитесь, что путь к скрипту правильный
   - Проверьте переменные окружения

4. **Перезапустите VS Code полностью**

### MCP сервер не запускается

1. **Проверьте Node.js:**
   ```bash
   node --version
   # Должна быть версия 18+
   ```

2. **Проверьте зависимости:**
   ```bash
   npm install
   ```

3. **Проверьте токен Notion:**
   ```bash
   # Проверьте файл .env
   cat .env
   # Или в PowerShell:
   type .env
   ```

4. **Запустите сервер вручную:**
   ```bash
   node mcp-server-notion.mjs
   ```
   Если видите ошибки — исправьте их перед настройкой Copilot.

### Ошибки подключения к Notion API

1. **Проверьте токен:**
   - Убедитесь, что токен правильный
   - Проверьте, что токен не истёк
   - Убедитесь, что токен начинается с `secret_` или `ntn_`

2. **Проверьте права интеграции:**
   - Убедитесь, что интеграция имеет доступ к нужным страницам
   - В Notion: Settings & Members → Connections → найдите вашу интеграцию

3. **Проверьте баланс/лимиты:**
   - Notion API имеет лимиты на запросы
   - Проверьте статус вашего аккаунта Notion

### Agent Mode не включается

1. **Проверьте подписку Copilot:**
   - Agent Mode может требовать Copilot Pro или Business
   - Проверьте ваш тариф на GitHub

2. **Проверьте настройки организации:**
   - Если используете корпоративный аккаунт, администратор должен включить MCP
   - Settings → Copilot → Policies → MCP

## Использование того же MCP сервера для Cursor

Вы можете использовать один и тот же MCP сервер для Cursor и Copilot!

**Для Cursor** создайте файл:
- Windows: `%APPDATA%\Cursor\mcp.json`
- macOS: `~/Library/Application Support/Cursor/mcp.json`
- Linux: `~/.config/Cursor/mcp.json`

С тем же содержимым:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": [
        "R:\\vovaipetrova-core\\mcp-server-notion.mjs"
      ],
      "env": {
        "NOTION_API_KEY": "secret_ваш_токен"
      }
    }
  }
}
```

## Дополнительная информация

- Подробная документация: `docs/copilot-mcp-setup.md`
- Troubleshooting: `docs/voideditor-github-troubleshooting.md`
- Notion API скрипты: `scripts/codegpt/notion-*.mjs`

## Поддержка

Если что-то не работает:
1. Проверьте логи VS Code: Help → Toggle Developer Tools → Console
2. Проверьте логи MCP сервера (запустите вручную)
3. Создайте issue в репозитории проекта

