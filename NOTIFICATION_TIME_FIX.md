# Исправление времени уведомлений

## Проблема
Пуш-уведомления не приходили в установленное время из-за несоответствия форматов времени и отсутствия учета часовых поясов.

## Исправленные проблемы

### 1. Несоответствие форматов времени
**Проблема:**
- HTML `<input type="time">` сохраняет время в формате `HH:MM` (например, `09:00`)
- Cron проверял время в формате `HH:MM:SS` (например, `09:00:00`)
- Legacy поле `notification_time` не нормализовалось и оставалось как `HH:MM`

**Решение:**
- Добавлена нормализация для всех источников времени:
  - `notification_times` (массив) - нормализуется
  - `notification_time` (legacy) - **теперь тоже нормализуется**
  - `default_notification_times` (глобальные настройки) - нормализуется

### 2. Отсутствие учета часовых поясов
**Проблема:**
- Cron использовал серверное время (UTC)
- Пользователи устанавливали локальное время своего часового пояса
- Уведомления приходили в неправильное время

**Решение:**
- Добавлена загрузка timezone для каждого пользователя из таблицы `settings`
- Время проверяется в часовом поясе пользователя
- День рождения проверяется по дате в часовом поясе пользователя
- Если timezone не установлен или "auto"/"disabled", используется UTC

## Изменения в коде

### `/app/api/cron/check-birthdays/route.ts`

1. **Загрузка timezone**:
```typescript
// Добавлен 'timezone' в запрос настроек
const { data: globalSettings } = await supabase
  .from("settings")
  .select("*")
  .in("key", ["default_notification_time", "default_notification_times", "timezone"])

// Создана Map для хранения timezone пользователей
const userTimezonesMap = new Map<string, string>()
```

2. **Нормализация legacy notification_time**:
```typescript
// Раньше: не нормализовалось
if (birthday.notification_time) {
  notificationTimes.push(birthday.notification_time)
}

// Теперь: нормализуется к формату HH:MM:SS
if (birthday.notification_time) {
  const time = birthday.notification_time
  notificationTimes.push(time.length === 5 ? `${time}:00` : time)
}
```

3. **Проверка времени с учетом timezone**:
```typescript
// Получаем timezone пользователя
let userTimezone = userTimezonesMap.get(birthday.user_id) || "UTC"
if (userTimezone === "auto" || userTimezone === "disabled") {
  userTimezone = "UTC"
}

// Вычисляем текущее время в timezone пользователя
let userNow: Date
try {
  userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }))
} catch (e) {
  console.error("[v0] Cron: Invalid timezone", userTimezone, "using UTC")
  userNow = now
  userTimezone = "UTC"
}

const userCurrentTime = `${userNow.getHours()...}:${userNow.getMinutes()...}:00`

// Проверяем день рождения по дате в timezone пользователя
const userCurrentMonth = userNow.getMonth()
const userCurrentDay = userNow.getDate()
const isBirthdayToday = birthDate.getMonth() === userCurrentMonth && 
                        birthDate.getDate() === userCurrentDay
```

## Тестирование

### 1. Проверка форматов времени
```bash
# Убедитесь, что все времена нормализованы к HH:MM:SS
# Проверьте логи cron:
# [v0] Cron: Birthday TODAY: ... {
#   notificationTimes: ['09:00:00', '12:00:00'],
#   userCurrentTime: '09:00:00'
# }
```

### 2. Проверка timezone
```bash
# Убедитесь, что timezone загружается для каждого пользователя
# Проверьте логи cron:
# [v0] Cron: Birthday TODAY: ... {
#   userTimezone: 'Europe/Warsaw',
#   userCurrentTime: '09:00:00'
# }
```

### 3. Ручная проверка
1. Установите время уведомления на текущее время + 2 минуты
2. Дождитесь срабатывания cron
3. Проверьте, что уведомление пришло

## Что проверить в базе данных

### Проверка форматов времени
```sql
-- Проверить форматы времени в таблице birthdays
SELECT 
  id, 
  first_name, 
  last_name, 
  notification_time,
  notification_times,
  notification_enabled
FROM birthdays 
WHERE notification_enabled = true;

-- Должны быть либо:
-- notification_time: '09:00' или '09:00:00'
-- notification_times: ['09:00'] или ['09:00:00']
```

### Проверка timezone в настройках
```sql
-- Проверить timezone пользователей
SELECT 
  user_id,
  key,
  value
FROM settings
WHERE key IN ('timezone', 'default_notification_time', 'default_notification_times');
```

## Возможные проблемы

### 1. Старые данные в неправильном формате
Если в базе данных есть времена в формате `HH:MM:SS.mmm` или другом нестандартном формате, нужно будет их нормализовать:

```sql
-- Нормализация времени в таблице birthdays (если нужно)
UPDATE birthdays
SET notification_time = LEFT(notification_time, 5)
WHERE LENGTH(notification_time) > 5;
```

### 2. Timezone не установлен
Если у пользователя не установлен timezone, используется UTC. Пользователь должен установить свой timezone в настройках.

### 3. Firebase не настроен
Проверьте, что Firebase Admin SDK правильно настроен. См. `FIREBASE_ADMIN_SETUP.md`.

## Что должен сделать пользователь

1. **Установить timezone в настройках**:
   - Перейти в Settings
   - Выбрать свой часовой пояс
   - Сохранить настройки

2. **Проверить времена уведомлений**:
   - Для каждого именинника: проверить время в карточке
   - В общих настройках: проверить глобальное время уведомлений

3. **Протестировать**:
   - Установить время уведомления на +2 минуты от текущего
   - Дождаться уведомления

## Логи для отладки

При срабатывании cron в логах будет:
```
[v0] ========== CRON JOB STARTED ==========
[v0] Cron: Checking birthdays at: 09:00:00 Date: 2026-01-01T09:00:00.000Z
[v0] Cron: Found 5 birthdays with notifications enabled
[v0] Cron: Loaded global notification times for 3 users
[v0] Cron: Loaded timezones for 3 users
[v0] Cron: Birthday TODAY: John Doe {
  userTimezone: 'Europe/Warsaw',
  userCurrentTime: '09:00:00',
  notificationTimes: ['09:00:00', '12:00:00'],
  shouldNotify: true
}
[v0] Cron: TIME MATCH! Sending notification
[v0] Cron: Sending notification for: John Doe to 2 devices
[v0] Cron: FCM sent successfully: { birthday: 'John Doe', successCount: 2, failureCount: 0 }
[v0] ========== CRON JOB COMPLETED ==========
```
