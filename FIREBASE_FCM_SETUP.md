# Настройка Firebase Cloud Messaging для Push-уведомлений

## Шаг 1: Создание Service Account Key

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект (или создайте новый)
3. Перейдите в **Project Settings** (⚙️ иконка)
4. Откройте вкладку **Service accounts**
5. Нажмите **Generate new private key**
6. Подтвердите и скачайте JSON файл

## Шаг 2: Добавление Service Account Key в v0

В v0, в разделе **Vars** (переменные окружения), добавьте:

**Имя переменной:**
```
FIREBASE_SERVICE_ACCOUNT_KEY
```

**Значение:**
Вставьте **весь** содержимое скачанного JSON файла как одну строку:
```json
{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

⚠️ **Важно**: JSON должен быть в одну строку, без переносов внутри значений.

## Шаг 3: Включение FCM API

1. В Firebase Console перейдите в **Project Settings**
2. Перейдите на вкладку **Cloud Messaging**
3. Если появится кнопка **Enable**, нажмите её для активации Cloud Messaging API
4. Убедитесь, что Cloud Messaging API включен

## Шаг 4: Проверка настройки

1. Перейдите в **Settings** (Настройки) приложения
2. В секции **Push-уведомления** нажмите **"Отправить тестовое уведомление"**
3. Проверьте логи в консоли браузера (F12 → Console)

### Ожидаемые логи при успехе:
```
[v0] Test notification: Authenticated user: <user_id>
[v0] Test notification: Found X FCM tokens
[v0] Test notification: Service account parsed successfully
[v0] Test notification: Project ID: your-project-id
[v0] Test notification: Firebase Admin SDK initialized
[v0] Test notification: Sending via FCM v1 API to X device(s)...
[v0] Test notification: FCM Response received
[v0] Success: X / Failure: 0
```

## Возможные проблемы

### "FIREBASE_SERVICE_ACCOUNT_KEY not configured"
Добавьте переменную окружения как описано в Шаге 2.

### "Invalid service account JSON"
Убедитесь что JSON файл скопирован полностью и не поврежден.

### "Firebase error: permission-denied"
Убедитесь что Cloud Messaging API включен в Firebase Console.

### "No FCM tokens found"
Сначала разрешите уведомления в браузере. После разрешения обновите страницу.

## Тестирование

После успешной настройки:
1. ✅ Нажмите кнопку "Отправить тестовое уведомление" в настройках
2. ✅ Вы должны увидеть push-уведомление даже если вкладка неактивна
3. ✅ Уведомления о днях рождения будут приходить автоматически

## API Endpoints

- **POST /api/send-test-notification** - Отправка тестового уведомления
- **POST /api/send-notification** - Отправка уведомления о дне рождения
- **GET /api/cron/check-birthdays** - Проверка дней рождения (cron)

## Документация

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [FCM v1 API Documentation](https://firebase.google.com/docs/cloud-messaging/send-message)
- [Firebase Service Accounts](https://firebase.google.com/docs/admin/setup#initialize_the_sdk)
