---
title: Troubleshooting Voideditor и GitHub
slug: voideditor-github-troubleshooting
summary: Решение проблем с интеграцией Voideditor и GitHub
status: draft
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - theme/automation
  - theme/dev
---

# Troubleshooting Voideditor и GitHub

## Где найти настройки GitHub в Voideditor

**Важно:** В Voideditor может не быть явного поля для GitHub токена в настройках UI. Вместо этого он использует системные настройки Git.

См. подробную инструкцию: [Настройка GitHub токена в Voideditor](voideditor-github-token-setup.md)

## Типичные проблемы и решения

### 1. Проблемы с аутентификацией GitHub

#### Симптомы:
- Void не может подключиться к GitHub
- Ошибки "Authentication failed"
- Не видит репозиторий

#### Решения:

**A. Проверка токена GitHub:**

1. Создайте Personal Access Token (PAT):
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Выберите права: `repo`, `workflow`, `read:org`
   - Скопируйте токен (начинается с `ghp_`)

2. В Voideditor:
   - Settings → GitHub → Authentication
   - Вставьте токен
   - Сохраните и перезапустите Void

**B. Проверка SSH ключей:**

Если используете SSH:

```bash
# Проверьте SSH ключ
ssh -T git@github.com

# Если не работает, создайте новый ключ
ssh-keygen -t ed25519 -C "your_email@example.com"

# Добавьте в GitHub
# Settings → SSH and GPG keys → New SSH key
```

**C. Проверка настроек Git:**

```bash
# Проверьте конфигурацию Git
git config --global user.name
git config --global user.email

# Если не установлено:
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
```

### 2. Проблемы с доступом к репозиторию

#### Симптомы:
- Репозиторий не открывается
- Ошибки "Repository not found"
- Нет доступа к веткам

#### Решения:

**A. Проверка прав доступа:**

1. Убедитесь, что у вас есть доступ к репозиторию
2. Проверьте, что репозиторий не приватный (или у вас есть права)
3. Если используете организацию, проверьте права в организации

**B. Переподключение репозитория:**

1. В Void: File → Open Folder
2. Выберите папку проекта
3. Если не работает, попробуйте:
   ```bash
   # Клонируйте заново
   git clone https://github.com/utemix-lab/vovaipetrova-core.git
   ```

**C. Проверка remote URL:**

```bash
# Проверьте remote URL
git remote -v

# Если неправильный, исправьте:
git remote set-url origin https://github.com/utemix-lab/vovaipetrova-core.git
# или для SSH:
git remote set-url origin git@github.com:utemix-lab/vovaipetrova-core.git
```

### 3. Проблемы с синхронизацией

#### Симптомы:
- Изменения не отправляются на GitHub
- Ошибки при push/pull
- Конфликты при синхронизации

#### Решения:

**A. Проверка статуса Git:**

```bash
# Проверьте статус
git status

# Проверьте ветку
git branch

# Проверьте remote
git remote show origin
```

**B. Очистка и переподключение:**

```bash
# Очистите кэш
git gc --prune=now

# Проверьте подключение
git fetch origin

# Попробуйте pull
git pull origin main
```

**C. Проверка конфликтов:**

```bash
# Если есть конфликты, разрешите их:
git status  # покажет конфликтующие файлы
# Отредактируйте файлы, затем:
git add .
git commit -m "Resolve conflicts"
git push
```

### 4. Проблемы с GitHub Actions/Workflows

#### Симптомы:
- Workflows не запускаются
- Ошибки в GitHub Actions
- Не видит workflows

#### Решения:

**A. Проверка файлов workflows:**

Убедитесь, что файлы в `.github/workflows/` существуют:
- `.github/workflows/docs-ci.yml`
- `.github/workflows/pages.yml`
- `.github/workflows/normalize.yml`
- `.github/workflows/notion-import.yml`

**B. Проверка прав токена:**

Токен должен иметь права:
- `repo` (полный доступ к репозиториям)
- `workflow` (для работы с GitHub Actions)

**C. Проверка в GitHub:**

1. Откройте репозиторий на GitHub
2. Перейдите в Actions
3. Проверьте, запускаются ли workflows
4. Посмотрите логи ошибок

### 5. Проблемы с AI интеграцией и GitHub

#### Симптомы:
- AI не видит файлы из GitHub
- Ошибки при работе с GitHub через AI

#### Решения:

**A. Настройка GitHub интеграции в Void:**

1. Settings → AI → GitHub Integration
2. Убедитесь, что токен установлен
3. Проверьте, что репозиторий указан правильно

**B. Проверка переменных окружения:**

Создайте файл `.env` в корне проекта:

```env
GITHUB_TOKEN=ghp_ваш_токен
GITHUB_REPO=utemix-lab/vovaipetrova-core
```

**C. Перезапуск Void:**

После изменения настроек перезапустите Void полностью.

## Диагностика

### Шаг 1: Проверка базового подключения

```bash
# Проверьте Git
git --version

# Проверьте подключение к GitHub
git ls-remote https://github.com/utemix-lab/vovaipetrova-core.git

# Проверьте SSH (если используете)
ssh -T git@github.com
```

### Шаг 2: Проверка логов Void

1. В Void: Help → Toggle Developer Tools
2. Откройте Console
3. Ищите ошибки, связанные с GitHub

### Шаг 3: Проверка настроек Void

1. Settings → GitHub
2. Проверьте все настройки:
   - Authentication token
   - Repository URL
   - Branch
   - Sync settings

## Частые ошибки

### "Repository not found"
- Проверьте права доступа
- Убедитесь, что репозиторий существует
- Проверьте правильность URL

### "Authentication failed"
- Проверьте токен GitHub
- Убедитесь, что токен не истёк
- Проверьте права токена

### "Permission denied"
- Проверьте права доступа к репозиторию
- Убедитесь, что токен имеет нужные права
- Проверьте SSH ключи (если используете SSH)

### "Failed to push"
- Проверьте, что у вас есть права на запись
- Убедитесь, что нет конфликтов
- Попробуйте `git pull` перед `git push`

## Альтернативные решения

### Если ничего не помогает:

1. **Используйте GitHub CLI:**
   ```bash
   # Установите GitHub CLI
   gh auth login
   gh repo clone utemix-lab/vovaipetrova-core
   ```

2. **Используйте Git напрямую:**
   ```bash
   git clone https://github.com/utemix-lab/vovaipetrova-core.git
   cd vovaipetrova-core
   # Работайте через командную строку
   ```

3. **Вернитесь к Cursor:**
   - Cursor имеет встроенную интеграцию с GitHub
   - Может быть более стабильной для вашего случая

## Полезные ссылки

- [Voideditor GitHub](https://github.com/voideditor/void)
- [Voideditor Discord](https://discord.gg/voideditor)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [GitHub SSH Keys](https://github.com/settings/keys)

## Связанные документы

- [CodeGPT Setup](codegpt-setup.md)
- [Cursor MCP Setup](cursor-mcp-openrouter-setup.md)

