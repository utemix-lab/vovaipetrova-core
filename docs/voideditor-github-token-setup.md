---
title: Настройка GitHub токена в Voideditor
slug: voideditor-github-token-setup
summary: Как настроить GitHub токен для Voideditor через системные настройки Git
status: draft
tags:
  - Автоматизация
  - Кодинг
machine_tags:
  - theme/automation
  - theme/dev
---

# Настройка GitHub токена в Voideditor

## Проблема

В Voideditor может не быть явного поля для ввода GitHub токена в настройках UI. Вместо этого он использует системные настройки Git.

## Решение: Настройка через Git Credential Manager (Windows)

### Вариант 1: Через Git Credential Manager (рекомендуется)

**Windows использует Git Credential Manager для хранения токенов.**

1. **Создайте GitHub токен:**
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Выберите права: `repo`, `workflow`, `read:org`
   - Скопируйте токен (начинается с `ghp_`)

2. **Настройте Git для использования токена:**

   ```powershell
   # Установите токен в Git Credential Manager
   git config --global credential.helper manager-core
   
   # При следующем push/pull Git попросит ввести токен
   # Или используйте URL с токеном:
   git remote set-url origin https://ghp_ВАШ_ТОКЕН@github.com/utemix-lab/vovaipetrova-core.git
   ```

3. **Проверьте:**
   ```powershell
   git remote -v
   # Должно показать URL с токеном (или без, если используете Credential Manager)
   ```

### Вариант 2: Через переменные окружения

1. **Создайте файл `.env` в корне проекта:**

   ```env
   GITHUB_TOKEN=ghp_ваш_токен
   ```

2. **Или установите системную переменную окружения (Windows):**

   ```powershell
   # Временная (для текущей сессии PowerShell)
   $env:GITHUB_TOKEN = "ghp_ваш_токен"
   
   # Постоянная (для всех сессий)
   [System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_ваш_токен", "User")
   ```

3. **Перезапустите Voideditor**, чтобы он подхватил переменную.

### Вариант 3: Через Git URL с токеном

**Внимание:** Этот способ менее безопасен, так как токен будет виден в `.git/config`.

1. **Измените remote URL:**

   ```powershell
   git remote set-url origin https://ghp_ВАШ_ТОКЕН@github.com/utemix-lab/vovaipetrova-core.git
   ```

2. **Проверьте:**

   ```powershell
   git remote -v
   git pull  # Должно работать без запроса пароля
   ```

### Вариант 4: Через SSH ключи (самый безопасный)

1. **Создайте SSH ключ:**

   ```powershell
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Нажмите Enter для всех вопросов (или укажите путь)
   ```

2. **Скопируйте публичный ключ:**

   ```powershell
   cat ~/.ssh/id_ed25519.pub
   # Или
   type $env:USERPROFILE\.ssh\id_ed25519.pub
   ```

3. **Добавьте ключ в GitHub:**
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - Вставьте публичный ключ
   - Сохраните

4. **Измените remote URL на SSH:**

   ```powershell
   git remote set-url origin git@github.com:utemix-lab/vovaipetrova-core.git
   ```

5. **Проверьте:**

   ```powershell
   ssh -T git@github.com
   # Должно показать: "Hi username! You've successfully authenticated..."
   ```

## Проверка работы

После настройки проверьте:

```powershell
# Проверьте remote URL
git remote -v

# Попробуйте pull
git pull origin main

# Попробуйте push (если есть изменения)
git push origin main
```

Если всё работает без запроса пароля/токена — настройка успешна!

## Где искать настройки в Voideditor

Если всё же хотите проверить настройки Void:

1. **Settings / Preferences** (Ctrl+, или File → Preferences)
2. Ищите разделы:
   - `Git`
   - `Source Control`
   - `GitHub`
   - `Authentication`
   - `Credentials`

3. **Или через Command Palette** (Ctrl+Shift+P):
   - `Git: Clone`
   - `Git: Pull`
   - `Git: Push`
   - `Git: Show Git Output`

## Troubleshooting

### Git всё равно просит пароль

1. Проверьте, что токен правильный:
   ```powershell
   git remote -v
   ```

2. Очистите кэш credentials:
   ```powershell
   git credential-manager-core erase
   # Или
   git credential reject https://github.com
   ```

3. Попробуйте снова:
   ```powershell
   git pull
   ```

### Void не видит изменения

1. Перезапустите Void полностью
2. Откройте папку проекта заново: File → Open Folder
3. Проверьте, что Git работает в терминале Void

### Ошибка "Permission denied"

1. Проверьте права токена (должны быть `repo`, `workflow`)
2. Убедитесь, что токен не истёк
3. Создайте новый токен, если нужно

## Рекомендации

**Лучший вариант для Windows:**
1. Используйте **Git Credential Manager** (Вариант 1)
2. Или **SSH ключи** (Вариант 4) — самый безопасный

**Быстрый вариант:**
- Используйте **URL с токеном** (Вариант 3), но помните о безопасности

## Связанные документы

- [Voideditor GitHub Troubleshooting](voideditor-github-troubleshooting.md)
- [CodeGPT Setup](codegpt-setup.md)

