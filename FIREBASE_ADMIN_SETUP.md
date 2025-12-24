# Настройка Firebase Admin SDK для Push-уведомлений

## Текущая реализация

Приложение уже использует **современный Firebase Admin SDK** с безопасной инициализацией через переменные окружения:

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Используется переменная окружения вместо файла
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

initializeApp({
  credential: cert(serviceAccount)
});
```

## Почему НЕ используется файловый путь?

**Устаревший способ** (не безопасный):
```javascript
var serviceAccount = require("path/to/serviceAccountKey.json");
```

**Современный способ** (используется в приложении):
```typescript
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
```

**Преимущества переменной окружения:**
- Ключи не хранятся в репозитории (безопасность)
- Легко менять для разных окружений (dev/production)
- Работает в Vercel без дополнительных файлов
- Соответствует best practices

## Шаг 1: Получить Service Account Key

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Project Settings** (⚙️ Настройки)
4. Откройте вкладку **Service Accounts**
5. Нажмите **Generate New Private Key**
6. Сохраните JSON файл

## Шаг 2: Добавить ключ в переменные окружения

### Локальная разработка

Создайте файл `.env.local` в корне проекта:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Важно:**
- Весь JSON должен быть в одной строке
- Используйте одинарные кавычки снаружи
- Сохраните `\n` в private_key как есть

### Vercel Production

1. Откройте ваш проект на [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменную:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value**: Вставьте весь JSON (в одну строку)
   - **Environments**: Production, Preview, Development

## Шаг 3: Включить Firebase Cloud Messaging API

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш Firebase проект
3. Перейдите в **APIs & Services** → **Library**
4. Найдите **Firebase Cloud Messaging API**
5. Нажмите **Enable**

## Шаг 4: Настроить CRON_SECRET

Для работы cron job нужен секретный ключ:

```bash
# Локально (.env.local)
CRON_SECRET=your-random-secret-key-here

# В Vercel
# Settings → Environment Variables → Add
# Name: CRON_SECRET
# Value: любая длинная случайная строка
```

## Шаг 5: Проверка работы

### 1. Проверить инициализацию

Откройте логи Vercel и найдите:
```
[Firebase Admin] Успешно инициализирован для проекта: your-project-id
```

### 2. Проверить cron job

Cron запускается каждую минуту и проверяет:
- Совпадает ли сегодня день рождения
- Совпадает ли текущее время с временем уведомления

Логи cron:
```
[v0] Cron: Checking birthdays at: 13:53:00 Date: 2024-12-21T...
[v0] Cron: Found X birthdays with notifications enabled
[v0] Cron: Sending notification for: John Doe to 2 devices
[v0] Cron: FCM sent successfully: { successCount: 2, failureCount: 0 }
```

### 3. Протестировать вручную

Отправьте тестовое уведомление через настройки:
1. Откройте **Настройки** в приложении
2. Прокрутите до "Firebase Cloud Messaging"
3. Нажмите **Отправить тестовое уведомление**

## Как работает система уведомлений

### 1. Регистрация FCM токена

Когда пользователь разрешает уведомления:
```typescript
// Клиент получает FCM токен
const token = await getToken(messaging);
// Сохраняет в базу данных
await supabase.from('fcm_tokens').insert({ user_id, token });
```

### 2. Проверка дней рождения (Cron)

Каждую минуту Vercel Cron запускает `/api/cron/check-birthdays`:
```typescript
// Получает все дни рождения на сегодня
const birthdays = await supabase
  .from('birthdays')
  .select('*')
  .eq('notification_enabled', true);

// Для каждого совпадения времени
if (isBirthdayToday && birthday.notification_time === currentTime) {
  // Получает FCM токены пользователя
  const tokens = await supabase
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', birthday.user_id);
  
  // Отправляет через Firebase Admin SDK
  await messaging.sendEachForMulticast({
    notification: { title, body },
    tokens: fcmTokens
  });
}
```

### 3. Получение уведомления

Пользователь получает push-уведомление на все свои устройства где:
- Установлено приложение
- Разрешены уведомления
- Зарегистрирован FCM токен

## Устранение проблем

### Уведомления не приходят

**Проблема 1: Разрешения заблокированы**
- Решение: Разрешите уведомления в браузере
- Проверьте: Настройки → статус разрешений

**Проблема 2: FIREBASE_SERVICE_ACCOUNT_KEY не настроен**
- Решение: Добавьте переменную окружения
- Проверьте логи: `[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY не настроен`

**Проблема 3: FCM API не включен**
- Решение: Включите Firebase Cloud Messaging API в Google Cloud Console
- Ошибка: `messaging/invalid-project-id` или `403 Forbidden`

**Проблема 4: Время не совпадает**
- Cron запускается каждую минуту
- Время должно ТОЧНО совпадать: `13:53:00` === `13:53:00`
- Проверьте: Логи cron показывают "match: false" если не совпадает

**Проблема 5: FCM токен не сохранен**
- Решение: Разрешите уведомления и перезагрузите страницу
- Проверьте: Настройки → FCM Token должен отображаться

### Логи для отладки

Все логи начинаются с `[v0]`:
```
[v0] Cron: Checking birthdays at: HH:MM:SS
[v0] Cron: Found N birthdays with notifications enabled
[v0] Cron: Sending notification for: Name to X devices
[v0] Cron: FCM sent successfully
[Firebase Admin] Успешно инициализирован
```

## Безопасность

**Что делать с Service Account Key:**
- ✅ Хранить в переменных окружения
- ✅ Добавить `.env.local` в `.gitignore`
- ✅ Использовать разные ключи для dev/prod
- ❌ НЕ коммитить в Git
- ❌ НЕ публиковать в коде
- ❌ НЕ сохранять в файлах проекта

**Permissions Service Account:**
- Firebase Admin SDK использует service account
- Service account имеет полные права на проект
- Ключ должен быть защищен как пароль
- Регулярно ротируйте ключи (раз в 90 дней)

## Дополнительные возможности

### Отправка пользовательских уведомлений

```typescript
import { getFirebaseMessaging } from '@/lib/firebase-admin';

const messaging = getFirebaseMessaging();

await messaging.send({
  notification: {
    title: 'Заголовок',
    body: 'Текст уведомления'
  },
  token: userFcmToken
});
```

### Отправка на несколько устройств

```typescript
await messaging.sendEachForMulticast({
  notification: { title, body },
  tokens: [token1, token2, token3]
});
```

### С данными и действиями

```typescript
await messaging.send({
  notification: { title, body },
  data: {
    type: 'birthday',
    birthdayId: '123',
    customField: 'value'
  },
  webpush: {
    notification: {
      icon: '/icon.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      requireInteraction: true
    },
    fcmOptions: {
      link: '/birthdays/123'
    }
  },
  token: userFcmToken
});
```

## Проверочный список

- [ ] Service Account Key скачан из Firebase Console
- [ ] FIREBASE_SERVICE_ACCOUNT_KEY добавлен в переменные окружения
- [ ] Firebase Cloud Messaging API включен в Google Cloud Console
- [ ] CRON_SECRET настроен в Vercel
- [ ] Cron job настроен в vercel.json
- [ ] Разрешения на уведомления даны в браузере
- [ ] FCM токен отображается в настройках
- [ ] Тестовое уведомление успешно отправляется
- [ ] Время уведомления для именинника установлено
- [ ] Проверены логи Vercel на ошибки

## Полезные ссылки

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
