# Диагностика пуш-уведомлений

## Проблема: Уведомления не приходят при установке индивидуального времени

### Шаги для диагностики:

#### 1. Проверьте данные в браузере

1. Откройте **DevTools** (F12) → вкладка **Console**
2. Откройте форму именинника и установите время уведомления
3. Нажмите "Сохранить"
4. Проверьте логи в консоли:
   ```
   [v0] BirthdayForm: Submitting data: {
     notification_times: ["09:00", "12:00"],
     notification_time: "09:00",
     ...
   }
   [v0] Saving birthday data: {...}
   [v0] notification_times: ["09:00", "12:00"]
   [v0] notification_time: "09:00"
   [v0] Final birthdayData to save: {...}
   ```

5. **Что проверить:**
   - ✅ `notification_times` должен быть массивом времен
   - ✅ `notification_time` должен совпадать с первым временем из массива
   - ✅ Не должно быть ошибок при сохранении

#### 2. Проверьте данные в Supabase

1. Откройте **Supabase Dashboard** → **Table Editor** → таблица `birthdays`
2. Найдите нужного именинника
3. Проверьте колонки:
   - `notification_times` - должен быть массив `["09:00", "12:00"]`
   - `notification_time` - должно быть `09:00` (первое время)
   - `notification_enabled` - должно быть `true`
   - `notification_repeat_count` - должно быть количество времен (например, `2`)

**Если данные не сохранились:**
- Проверьте RLS (Row Level Security) политики
- Проверьте, что пользователь авторизован
- Проверьте логи Supabase

#### 3. Проверьте cron логи

1. Откройте **Vercel Dashboard** → **Functions** → найдите `/api/cron/check-birthdays`
2. Проверьте логи cron (должны быть каждую минуту):
   ```
   [v0] ========== CRON JOB STARTED ==========
   [v0] Cron: Checking birthdays at: 09:00:00 Date: 2026-01-01T09:00:00.000Z
   [v0] Cron: Found 5 birthdays with notifications enabled
   [v0] Cron: Processing birthday: {
     id: "...",
     name: "John Doe",
     notification_times_raw: ["09:00", "12:00"],
     notification_time_raw: "09:00",
     notification_enabled: true
   }
   [v0] Cron: Added notification_times array: ["09:00", "12:00"]
   [v0] Cron: Birthday TODAY: John Doe {
     userTimezone: 'Europe/Warsaw',
     userCurrentTime: '09:00:00',
     notificationTimes: ['09:00:00', '12:00:00'],
     shouldNotify: true
   }
   [v0] Cron: TIME MATCH! Sending notification
   ```

**Что проверить:**
- ✅ Cron запускается каждую минуту
- ✅ `notification_times_raw` не пустой и содержит времена
- ✅ Времена нормализуются к формату `HH:MM:SS`
- ✅ `userCurrentTime` совпадает с одним из времен
- ✅ `shouldNotify: true`
- ✅ Сообщение "TIME MATCH! Sending notification"

**Если cron не запускается:**
- Проверьте `CRON_SECRET` в переменных окружения
- Проверьте настройки Vercel Cron в `vercel.json`
- Проверьте, что у вас есть внешний cron (например, cron-job.org)

#### 4. Проверьте Firebase

1. Откройте **Firebase Console** → **Cloud Messaging**
2. Проверьте логи отправки уведомлений
3. В Vercel логах должно быть:
   ```
   [v0] Cron: Sending notification for: John Doe to 2 devices
   [v0] Cron: FCM sent successfully: { birthday: 'John Doe', successCount: 2, failureCount: 0 }
   ```

**Если уведомления не отправляются:**
- ✅ Проверьте `FIREBASE_SERVICE_ACCOUNT_KEY` в Vercel
- ✅ Проверьте, что FCM токены есть в таблице `fcm_tokens`
- ✅ Откройте `/diagnostic` и проверьте статус FCM

#### 5. Используйте диагностическую страницу

1. Откройте [/diagnostic](http://localhost:3000/diagnostic)
2. Прокрутите до раздела **"Диагностика времени уведомлений"**
3. Нажмите "Обновить"
4. Проверьте:
   - Часовой пояс пользователя
   - Текущее время в часовом поясе
   - Список времен уведомлений
   - Статус "Сработает сейчас!" (должен появиться, когда время совпадет)

### Частые проблемы и решения

#### Проблема 1: notification_times пустой в базе данных
**Причина:** Данные не сохраняются из формы
**Решение:**
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что в форме есть хотя бы одно время
3. Проверьте RLS политики в Supabase

#### Проблема 2: Времена в неправильном формате
**Причина:** Не происходит нормализация
**Решение:**
- Времена должны быть `HH:MM` в базе (например, `09:00`)
- Cron автоматически добавляет `:00` для секунд
- Если в базе формат другой (например, `9:00`), пересохраните

#### Проблема 3: Cron не находит именинников
**Причина:** Проверка даты или времени не срабатывает
**Решение:**
1. Проверьте часовой пояс пользователя в Settings
2. Убедитесь, что дата рождения установлена правильно
3. Проверьте, что `notification_enabled = true`

#### Проблема 4: FCM токен не зарегистрирован
**Причина:** Service Worker не запустился
**Решение:**
1. Откройте главную страницу приложения
2. Разрешите уведомления в браузере
3. Проверьте DevTools → Application → Service Workers
4. Откройте `/diagnostic` и проверьте статус FCM токена

### Тестовый сценарий

1. **Создайте тестового именинника:**
   - Имя: "Тест Пуш"
   - Дата рождения: сегодняшняя дата
   - Время уведомления: текущее время + 2 минуты
   - Уведомления: включены

2. **Проверьте в Supabase:**
   - Данные сохранились корректно
   - `notification_times` содержит установленное время

3. **Проверьте часовой пояс:**
   - Settings → установлен правильный timezone

4. **Дождитесь срабатывания:**
   - Через 2 минуты должно прийти уведомление

5. **Проверьте логи:**
   - Vercel Functions → `/api/cron/check-birthdays`
   - Должен быть лог "TIME MATCH! Sending notification"

### Полезные команды

#### Проверить данные в Supabase (SQL)
```sql
-- Проверить данные именинников с уведомлениями
SELECT 
  id,
  first_name,
  last_name,
  birth_date,
  notification_time,
  notification_times,
  notification_enabled,
  notification_repeat_count,
  user_id
FROM birthdays 
WHERE notification_enabled = true
ORDER BY birth_date;

-- Проверить FCM токены
SELECT 
  user_id,
  token,
  created_at
FROM fcm_tokens;

-- Проверить настройки пользователя
SELECT 
  user_id,
  key,
  value
FROM settings
WHERE key IN ('timezone', 'default_notification_time', 'default_notification_times');
```

### Контакты для поддержки

Если проблема не решается:
1. Соберите логи из консоли браузера
2. Соберите логи из Vercel Functions
3. Проверьте данные в Supabase
4. Создайте issue с подробным описанием
