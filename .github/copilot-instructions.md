# Инструкции для GitHub Copilot в Visual Studio

## Текущее состояние системы (проверено 2026-01-04)

### ✅ Проверка окружения

```powershell
# 1) Ветка и чистота рабочего дерева
git branch --show-current
# Результат: main (или текущая рабочая ветка)

git status --porcelain
# Результат: должен быть пустым для чистой работы

# 2) Версии инструментов
node --version
# Результат: v24.11.0 ✅

npm --version
# Результат: 11.6.1 ✅

gh --version
# Результат: gh version 2.83.0 ✅

# 3) Проверка наличия MCP-серверов
Test-Path .\mcp-server-notion.mjs
# Результат: True ✅

Test-Path .\mcp-server-openrouter.mjs
# Результат: True ✅

# 4) Проверка .env (ключи найдены)
# Результат:
# - GITHUB_TOKEN ✅
# - NOTION_API_KEY ✅

# 5) Проверка аутентификации gh
gh auth status
# Результат: ✓ Logged in to github.com account utemix-lab ✅
```

## Быстрая настройка MCP для Copilot

### Шаг 1: Убедитесь, что зависимости установлены

```powershell
cd "R:\vovaipetrova-core"
npm install
```

### Шаг 2: Проверьте файл `.env`

Файл `.env` должен содержать:
```env
NOTION_API_KEY=ntn_ваш_токен
GITHUB_TOKEN=ghp_ваш_токен
```

**Текущее состояние:** ✅ Оба ключа найдены в `.env`

### Шаг 3: Настройте MCP конфигурацию для VS Code/Copilot

**Путь к конфигурации (Windows):**
```
%APPDATA%\Code\User\globalStorage\github.copilot\mcp.json
```

**Содержимое файла `mcp.json`:**
```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": [
        "R:\\vovaipetrova-core\\mcp-server-notion.mjs"
      ],
      "env": {
        "NOTION_API_KEY": "ntn_ваш_токен_из_env"
      }
    },
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

**Важно:**
- Замените путь `R:\\vovaipetrova-core` на ваш реальный путь, если отличается
- Токен Notion уже есть в `.env`, но можно указать напрямую в конфигурации
- Для OpenRouter добавьте `OPENROUTER_API_KEY` в `.env`, если планируете использовать

### Шаг 4: Включите Agent Mode в Copilot

1. Откройте VS Code
2. Нажмите `Ctrl+,` (настройки)
3. Найдите "GitHub Copilot"
4. Найдите опцию **"Agent Mode"** или **"Enable MCP"**
5. Включите её
6. **Перезапустите VS Code полностью**

### Шаг 5: Проверка работы

1. Откройте чат Copilot (`Ctrl+L` или через панель)
2. Попробуйте запрос:
   ```
   Найди в Notion страницы про "автоматизация"
   ```
3. Или:
   ```
   Прочитай файл docs/README.md
   ```

Если Copilot может использовать инструменты Notion или файловую систему — всё работает! ✅

## Доступные инструменты

### Notion MCP сервер (`mcp-server-notion.mjs`)

- `notion_search` — поиск страниц и баз данных
- `notion_fetch` — получение страницы/базы данных по ID
- `notion_get_blocks` — получение содержимого страницы
- `notion_create_page` — создание новой страницы
- `notion_update_page` — обновление страницы
- `notion_query_database` — запрос записей из базы данных

### OpenRouter File Access (`mcp-server-openrouter.mjs`)

- `read_file` — чтение файлов из проекта
- `write_file` — запись файлов в проект
- `list_directory` — список файлов в директории
- `search_files` — поиск файлов по содержимому

## Troubleshooting

### Copilot не видит MCP сервер

1. **Проверьте версию VS Code:**
   - Должна быть ≥ 1.102 (июль 2024)
   - Help → About → проверьте версию

2. **Проверьте путь к конфигурации:**
   ```powershell
   # Проверьте существование файла
   Test-Path "$env:APPDATA\Code\User\globalStorage\github.copilot\mcp.json"
   ```

3. **Проверьте логи VS Code:**
   - Help → Toggle Developer Tools → Console
   - Ищите ошибки связанные с MCP

4. **Перезапустите VS Code полностью** (не просто перезагрузка окна)

### MCP сервер не запускается

1. **Проверьте работу сервера вручную:**
   ```powershell
   cd "R:\vovaipetrova-core"
   node mcp-server-notion.mjs
   ```

   Должно показать:
   ```
   MCP сервер Notion запущен
   Notion API Base: https://api.notion.com/v1
   API Key: ✅ установлен
   ```

2. **Проверьте зависимости:**
   ```powershell
   npm install
   ```

3. **Проверьте токен в `.env`:**
   ```powershell
   Select-String -Path .env -Pattern 'NOTION_API_KEY'
   ```

### Agent Mode не включается

1. **Проверьте подписку Copilot:**
   - Agent Mode может требовать Copilot Pro или Business
   - Проверьте ваш тариф на GitHub

2. **Проверьте настройки организации:**
   - Если используете корпоративный аккаунт, администратор должен включить MCP
   - Settings → Copilot → Policies → MCP

## Документация

- **Основная инструкция:** `docs/copilot-mcp-setup.md`
- **Быстрый старт:** `COPILOT-NOTION-SETUP.md`
- **MCP Quickstart:** `MCP-QUICKSTART.md`
- **Cursor MCP Setup:** `docs/cursor-mcp-openrouter-setup.md`

## Полезные команды для проверки

```powershell
# Проверка всех компонентов
cd "R:\vovaipetrova-core"
git branch --show-current
git status --porcelain
node --version
npm --version
gh --version
Test-Path .\mcp-server-notion.mjs
Test-Path .\mcp-server-openrouter.mjs
if (Test-Path .env) { Select-String -Path .env -Pattern 'NOTION_API_KEY|OPENROUTER_API_KEY|GITHUB_TOKEN|GH_TOKEN' } else { Write-Output ".env not found" }
gh auth status

# Проверка работы MCP сервера
node mcp-server-notion.mjs
# (должен запуститься и показать статус)

# Проверка конфигурации MCP
Test-Path "$env:APPDATA\Code\User\globalStorage\github.copilot\mcp.json"
Get-Content "$env:APPDATA\Code\User\globalStorage\github.copilot\mcp.json"
```

## Обновление после переустановки VS Code

Если VS Code был переустановлен или обновлён:

1. **Проверьте версию:** Help → About
2. **Переустановите расширение GitHub Copilot** (если нужно)
3. **Создайте/обновите конфигурацию MCP** (см. Шаг 3 выше)
4. **Включите Agent Mode** (см. Шаг 4 выше)
5. **Перезапустите VS Code**

## Поддержка

Если что-то не работает:
1. Проверьте логи VS Code: Help → Toggle Developer Tools → Console
2. Проверьте логи MCP сервера (запустите вручную)
3. Проверьте документацию в `docs/copilot-mcp-setup.md`
4. Создайте issue в репозитории проекта
