# Настройка PowerShell 7 для работы с проектом

## Введение

Проект использует PowerShell 7 (pwsh) для всех операций в терминале. PowerShell 7 поддерживает UTF-8 по умолчанию и обеспечивает правильную работу с кириллицей.

## Установка PowerShell 7

### Способ 1: Через winget (рекомендуется)

```powershell
winget install --id Microsoft.PowerShell --source winget
```

### Способ 2: Через MSI установщик

1. Скачайте установщик с [официального сайта](https://github.com/PowerShell/PowerShell/releases/latest)
2. Запустите установщик `PowerShell-7.x.x-win-x64.msi`
3. Убедитесь, что выбрана опция "Add PowerShell to PATH"

### Способ 3: Через Chocolatey

```powershell
choco install powershell-core
```

## Проверка установки

После установки перезапустите терминал и выполните:

```powershell
pwsh --version
# Должно показать: PowerShell 7.x.x

$PSVersionTable
# Должно показать PSVersion 7.x.x и PSEdition Core
```

## Настройка кодировки UTF-8

### Для PowerShell 7 (рекомендуется)

PowerShell 7 по умолчанию использует UTF-8, но для гарантии добавьте в профиль:

```powershell
# Откройте профиль
notepad $PROFILE

# Добавьте следующие строки:
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
```

### Для текущей сессии

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

## Настройка Cursor для использования PowerShell 7

### Вариант 1: Изменить терминал по умолчанию в Cursor

1. Откройте настройки Cursor (Ctrl+,)
2. Найдите `terminal.integrated.defaultProfile.windows`
3. Установите значение: `PowerShell` или `pwsh`

Или добавьте в `settings.json`:

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "icon": "terminal-powershell"
    },
    "pwsh": {
      "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      "icon": "terminal-powershell"
    }
  }
}
```

### Вариант 2: Использовать PowerShell 7 в текущей сессии

В терминале Cursor выполните:

```powershell
& "C:\Program Files\PowerShell\7\pwsh.exe"
```

## Преимущества PowerShell 7

1. **UTF-8 по умолчанию** — правильная работа с кириллицей
2. **Кроссплатформенность** — работает на Windows, Linux, macOS
3. **Улучшенная производительность** — быстрее PowerShell 5.1
4. **Современные возможности** — поддержка новых операторов и функций
5. **Лучшая интеграция с современными инструментами** — gh CLI, git и др.

## Тестирование после установки

Выполните следующие команды для проверки:

```powershell
# Проверка версии
pwsh --version

# Проверка кодировки
[Console]::OutputEncoding
# Должно быть: UTF8

# Тест кириллицы
Write-Host "Тест: Привет, мир! 🚀"

# Тест с gh CLI
gh pr list --limit 1 --json title --jq '.[0].title'

# Тест создания PR (без реального создания)
gh pr create --title "Тест: PR с кириллицей" --body "Описание на русском" --dry-run
```

## Решение проблем

### PowerShell 7 не найден после установки

1. Перезапустите терминал
2. Проверьте PATH: `$env:PATH -split ';' | Select-String PowerShell`
3. Добавьте вручную: `C:\Program Files\PowerShell\7\` в PATH

### Кодировка всё ещё неправильная

1. Убедитесь, что используете PowerShell 7 (`pwsh`), а не PowerShell 5.1 (`powershell`)
2. Проверьте настройки терминала Cursor
3. Добавьте настройки кодировки в профиль PowerShell 7

### Команды показывают неправильные символы

1. Убедитесь, что терминал Cursor использует UTF-8
2. Проверьте настройки шрифта терминала (должен поддерживать UTF-8)
3. Убедитесь, что используется PowerShell 7, а не PowerShell 5.1

## Дополнительные ресурсы

- [Официальная документация PowerShell 7](https://docs.microsoft.com/powershell/)
- [Миграция с Windows PowerShell на PowerShell 7](https://docs.microsoft.com/powershell/scripting/whats-new/migrating-from-windows-powershell-51-to-powershell-7)
- [Настройка кодировки в PowerShell](https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding)

