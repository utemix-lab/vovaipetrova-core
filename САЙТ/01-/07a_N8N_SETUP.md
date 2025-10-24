
# 🚀 Шпаргалка по установке и настройке n8n на Ubuntu через Docker

## 📌 Что сделано
- Подключились по SSH к Ubuntu серверу
- Установили Docker и Docker Compose
- Настроили фаервол UFW для открытия порта 5678
- Создали docker-compose.yml для n8n
- Запустили контейнер n8n с авторизацией
- Открыли интерфейс в браузере

## 🐧 Основные понятия
- **Ubuntu** — Linux-дистрибутив, твоя ОС
- **SSH** — удалённое управление сервером
- **Docker** — запускает программы в контейнерах
- **docker-compose.yml** — файл для описания сервисов Docker
- **n8n** — визуальный автоматизатор задач
- **UFW** — фаервол для управления доступом к портам

## 🔥 Установка Docker и Compose
```bash
apt update
apt install -y docker.io
systemctl start docker
systemctl enable docker

mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

## 🔥 Настройка UFW
```bash
ufw allow 5678/tcp
ufw reload
ufw status verbose
```

## 📂 Подготовка docker-compose.yml
```bash
mkdir -p /opt/n8n
cd /opt/n8n
nano docker-compose.yml
```

## ✍️ Содержимое docker-compose.yml
```yaml
version: "3.1"

services:
  n8n:
    image: n8nio/n8n:0.230.0
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=superpass123
      - N8N_HOST=0.0.0.0
    volumes:
      - ./n8n_data:/home/node/.n8n
```

## 🚀 Запуск
```bash
docker compose up -d
docker ps
docker logs n8n-n8n-1
ss -tulpn | grep 5678
```

## 🌐 Интерфейс в браузере
```
http://87.228.88.243:5678
Логин: admin
Пароль: superpass123
```

## ⚙ Полезные команды
```bash
docker compose down
docker compose up -d
docker logs n8n-n8n-1
docker ps
ufw status verbose
ss -tulpn | grep 5678
```

---
✅ Готово! Теперь у тебя на сервере рабочий n8n для автоматизаций.
