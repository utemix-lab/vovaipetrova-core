## Войти на сервер по SSH

```
ssh -i C:\Users\Администратор\sshkeys\id_ed25519 root@87.228.88.243
```
## Чтобы **перейти в папку `/opt/n8n`**, просто напиши:

```
cd /opt/n8n
```

и нажми **Enter**.
После этого твой приглашение командной строки поменяется с:
root@vovaipetrova:~#
на
root@vovaipetrova:/opt/n8n#

## Чтобы зайти в nano:

После root@vovaipetrova:/opt/n8n#
Нужно вставить:

## Чтобы зайти в nano в файл docker-compose.yml:
После root@vovaipetrova:/opt/n8n#
Вставить:

```
nano docker-compose.yml
```

## Подтянули образ ...

образ N8N c Hagging Faces, распаковали, запаролли.

## Пароль

## ✅ Твои данные для входа в n8n сейчас такие:

- **Логин:** `admin`
    
- **Пароль:** `superpass123`

(мы их вместе прописали в `docker-compose.yml` вот так):

```
environment:
  - N8N_BASIC_AUTH_ACTIVE=true
  - N8N_BASIC_AUTH_USER=admin
  - N8N_BASIC_AUTH_PASSWORD=superpass123
```

