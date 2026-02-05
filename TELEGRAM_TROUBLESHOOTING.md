# Telegram Notifications Troubleshooting Guide

## Проблема: Уведомления не приходят на iPhone в Telegram

### Шаг 1: Проверить, что webhook установлен правильно

Замените `YOUR_BOT_TOKEN` на: `8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg`

```bash
curl -X GET "https://api.telegram.org/bot8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg/getWebhookInfo"
```

Должен быть ответ вроде:
```json
{
  "ok": true,
  "result": {
    "url": "https://ваш-домен.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "1.2.3.4",
    "last_error_date": 0
  }
}
```

Если `url` пуста или неправильная, установите webhook:

```bash
curl -X POST "https://api.telegram.org/bot8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ваш-домен.vercel.app/api/telegram/webhook"
  }'
```

### Шаг 2: Проверить, что пользователь привязан

В Vercel Dashboard → Logs проверьте:
1. Отправил ли пользователь `/start` боту?
2. Получил ли код привязки?
3. Ввел ли код в приложении и нажал "Привязать"?

Проверить в Supabase:
- Таблица `settings` → строки где `key = 'telegram_chat_id'` и `value` = ID чата (число)

### Шаг 3: Проверить, что Telegram включен в боковой панели

В приложении:
1. Откройте боковое меню (☰)
2. Перейдите в **Уведомления**
3. Убедитесь, что Telegram **включен** (переключатель синий)

### Шаг 4: Отправить тестовое сообщение

```bash
curl -X GET "https://ваш-домен.vercel.app/api/telegram/test"
```

Должно прийти сообщение в Telegram от бота.

### Шаг 5: Проверить логи

В Vercel Dashboard → Function Logs смотрите:

1. **При /start в боте:**
   ```
   [Telegram Webhook] Received update
   [Telegram Webhook] Stored pending link with code
   ```

2. **При привязке в приложении:**
   ```
   [Telegram Webhook] Link code validated
   ```

3. **При запуске кроны (каждую минуту):**
   ```
   [v0] CRON JOB STARTED
   [v0] Cron: Found Telegram chat_id for user <USER_ID>: <CHAT_ID>
   [v0] Cron: Sending Telegram notification
   ```

### Шаг 6: Проверить правильность параметров

Убедитесь что в `.env` или в Vercel Settings есть:

```env
TELEGRAM_BOT_TOKEN=8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg
CRON_SECRET=ваш-крон-секрет
```

## Распространенные проблемы

### "telegram_chat_id не найден"
- Пользователь не завершил привязку аккаунта
- Код истек (действует 10 минут)
- Попросить пользователя отправить `/start` еще раз

### Webhook не установлен
- Проверьте URL в `setWebhook` (должен быть HTTPS и доступен из интернета)
- Убедитесь что Vercel приложение развернуто

### Cron не работает
- Проверьте `CRON_SECRET` в `.env`
- Убедитесь что кроны включены в `vercel.json`
- Проверьте логи в Vercel Dashboard

### Сообщения отправляются но не видны
- Проверьте уведомления в Telegram (Settings → Notifications)
- Убедитесь что чат с ботом не заблокирован

## Быстрая диагностика

Вставьте в браузер адресную строку (замените домен):

```
https://ваш-домен.vercel.app/api/telegram/test
```

Если есть ошибка — смотрите error в ответе.

Если успешно — должно прийти сообщение в чат с ботом.

## Помощь в диагностике

Напишите мне:
1. Скриншот боковой панели "Уведомления" (Telegram включен/выключен?)
2. Результат `/status` команды боту в Telegram
3. Ошибки из Vercel Logs
4. ID пользователя (в приложении где-то отображается?)
