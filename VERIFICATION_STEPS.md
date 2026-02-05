# Телеграм Уведомления — Проверка Исправления

## Проблема и Исправление

**Проблема:** Телеграм уведомления не приходили на iPhone (и вообще никому не приходили).

**Корень проблемы:** Код в `cron/check-birthdays/route.ts` и `telegram/test/route.ts` неправильно читал `telegram_chat_id` из таблицы settings.
- Файл `link/route.ts` сохраняет `telegram_chat_id` как **прямой столбец** в таблице settings
- Но `cron` и `test` пытались найти его как **key-value пару** (с ключом 'telegram_chat_id')

**Исправление:** Коммит 802a675
- Изменен `cron/check-birthdays/route.ts`: теперь читает ВСЕ настройки и извлекает `telegram_chat_id` прямо из столбца
- Изменен `telegram/test/route.ts`: упрощен запрос для прямого чтения столбца

---

## Шаги Верификации

### 1. Проверить Webhook (✅ DONE)
```powershell
$token = "8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg"
Invoke-WebRequest "https://api.telegram.org/bot$token/getWebhookInfo" -UseBasicParsing | ConvertFrom-Json
```
**Результат:** ✅ Webhook установлен на https://v0-birthday-reminder-app-liart.vercel.app/api/telegram/webhook

### 2. Проверить, что Бот Доступен (✅ DONE)
```powershell
$token = "8353344725:AAFXx51rHiiaFgSMF_8VuVkR_6rHq7WNtzg"
Invoke-WebRequest "https://api.telegram.org/bot$token/getMe" -UseBasicParsing | ConvertFrom-Json
```
**Результат:** ✅ Bot "Birthday Reminder" работает

### 3. Протестировать Связь Пользователя в БД

Зайдите в Supabase Dashboard и проверьте таблицу `settings`:
- Найдите пользователя, который выполнил `/start` в боте
- Убедитесь, что есть **строки** с:
  - `key='telegram_username'` и значение = `@username_пользователя`
  - Или проверьте, что в столбце `telegram_chat_id` есть значение (прямой столбец)

### 4. Создать Тестовый День Рождения НА СЕГОДНЯ

1. Откройте Birthday Reminder App
2. Добавьте новый день рождения с датой **СЕГОДНЯ**
3. Установите время уведомления на **текущий час** (например, если сейчас 10:30, установите 10:00)
4. Сохраните

### 5. Дождитесь Срабатывания Крона ИЛИ Вызовите Вручную

**Вариант A: Дождитесь минутного крона (работает каждую минуту)**
- Просто подождите до начала следующей минуты
- Кром должен сработать автоматически

**Вариант B: Вызовите вручную (для немедленной проверки)**
```bash
curl -X GET "https://v0-birthday-reminder-app-liart.vercel.app/api/cron/check-birthdays" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```
(Где `YOUR_CRON_SECRET` = значение из Vercel environment variables `CRON_SECRET`)

### 6. Проверить Логи Vercel

Перейдите на https://vercel.com и откройте:
- Проект "v0-birthday-reminder-app"
- Вкладка "Deployments"
- Текущее развертывание
- Runtime Logs или Function Logs

**Ищите строки:**
```
[v0] Cron: Found Telegram chat_id for user USER_ID : CHAT_ID
[v0] Cron: Sending Telegram notification to chat: CHAT_ID
[v0] Cron: Telegram notification sent successfully
```

Если видите эти строки — **исправление работает!**

### 7. Проверить Тестовое Уведомление

Если вы связали Telegram в приложении:
```bash
curl -X POST "https://v0-birthday-reminder-app-liart.vercel.app/api/telegram/test" \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","testBirthday":true}'
```

Должны получить уведомление в Telegram сразу.

---

## Ожидаемые Результаты

✅ **Если исправление работает:**
1. В логах Vercel видны строки о найденном `telegram_chat_id`
2. В Telegram приходит уведомление "🎂 День рождения!" с именем и возрастом
3. Уведомление приходит **ровно в установленное время** в часовом поясе пользователя
4. Работает на **iPhone, Android и Web**

❌ **Если уведомления не приходят:**
- Проверьте Vercel логи на наличие ошибок
- Убедитесь, что `telegram_chat_id` сохранен в таблице settings (прямой столбец, не key-value)
- Проверьте, что день рождения имеет `notification_enabled = true`
- Убедитесь, что время уведомления установлено правильно

---

## Коммиты Исправления

```
802a675 - fix(telegram): read telegram_chat_id from settings table directly, not as key-value pair
4dd02b5 - fix(cron): correctly read telegram_chat_id from settings table
```

Обе изменения интегрированы в main ветку.
