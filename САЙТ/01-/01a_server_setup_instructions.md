# 🚀 Настройка сервера Ubuntu (Selectel VPS)
## Шаги по установке и настройке

---
## ✅ Обновление системы
```bash
apt update && apt upgrade -y
```
- Обновляем список пакетов и устанавливаем последние версии.

---
## 🔥 Настройка firewall (ufw)
```bash
apt install ufw -y
ufw allow OpenSSH
ufw allow http
ufw allow https
ufw enable
ufw status
```
- Устанавливаем ufw, разрешаем SSH, HTTP и HTTPS, включаем firewall и проверяем статус.

---
## 🌐 Установка nginx
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```
- Устанавливаем nginx, запускаем и добавляем в автозагрузку.

---
## 🐳 Установка Docker и Docker Compose
### Docker
```bash
apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo   "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg]   https://download.docker.com/linux/ubuntu   $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install docker-ce docker-ce-cli containerd.io -y
docker --version
usermod -aG docker $USER
```
- Устанавливаем Docker и добавляем пользователя в группу docker (после чего нужен повторный вход в SSH).

### Docker Compose
```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```
- Скачиваем последнюю версию Docker Compose и делаем исполняемым.
