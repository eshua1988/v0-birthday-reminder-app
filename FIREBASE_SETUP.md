# Настройка Firebase Cloud Messaging

Это руководство поможет вам настроить Firebase Cloud Messaging для отправки push-уведомлений о днях рождения.

## Шаг 1: Создайте проект Firebase

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Нажмите "Добавить проект" (Add project)
3. Введите название проекта (например, "Birthday Reminder")
4. Следуйте инструкциям для завершения создания проекта

## Шаг 2: Зарегистрируйте веб-приложение

1. В панели Firebase выберите свой проект
2. Нажмите на иконку веб-приложения (</>) в разделе "Начать, добавив Firebase в приложение"
3. Введите nickname приложения (например, "Birthday Reminder Web")
4. **Важно:** Отметьте галочку "Also set up Firebase Hosting"
5. Нажмите "Зарегистрировать приложение"
6. Скопируйте конфигурацию Firebase (firebaseConfig)

## Шаг 3: Включите Cloud Messaging

1. В боковом меню Firebase Console выберите "Build" → "Cloud Messaging"
2. Нажмите "Get started" если это ваш первый раз
3. Примите условия использования

## Шаг 4: Получите VAPID ключ

1. В разделе Cloud Messaging перейдите на вкладку "Web configuration"
2. В разделе "Web Push certificates" нажмите "Generate key pair"
3. Скопируйте VAPID ключ (Key pair)

## Шаг 5: Добавьте переменные окружения в Vercel

В интерфейсе v0 перейдите в раздел "Vars" (переменные окружения) и добавьте следующие переменные из Firebase Console:

- `NEXT_PUBLIC_FIREBASE_API_KEY` - из firebaseConfig
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - из firebaseConfig  
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - из firebaseConfig
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - из firebaseConfig
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - из firebaseConfig
- `NEXT_PUBLIC_FIREBASE_APP_ID` - из firebaseConfig

**Важно:** Также необходимо добавить Web Push ключ (VAPID key) из раздела Cloud Messaging → Web Push certificates

## Шаг 6: Обновите Service Worker

Откройте файл `public/firebase-messaging-sw.js` и замените значения конфигурации на ваши:

```js
firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
})
```

## Шаг 7: Создайте серверную функцию для отправки уведомлений

Для отправки уведомлений с сервера вам понадобится:

1. В Firebase Console перейдите в "Project settings" → "Service accounts"
2. Нажмите "Generate new private key"
3. Сохраните JSON файл с приватным ключом в безопасном месте
4. Используйте Firebase Admin SDK для отправки уведомлений

Пример кода для отправки уведомлений (Node.js):

```js
const admin = require('firebase-admin')
const serviceAccount = require('./path/to/serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

async function sendBirthdayNotification(fcmToken, birthdayData) {
  const message = {
    notification: {
      title: '🎂 День рождения!',
      body: `${birthdayData.name} отмечает ${birthdayData.age} день рождения сегодня!`
    },
    data: {
      birthdayId: birthdayData.id,
      type: 'birthday'
    },
    token: fcmToken
  }

  try {
    const response = await admin.messaging().send(message)
    console.log('Successfully sent message:', response)
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
```

## Тестирование

После настройки:

1. Перезагрузите приложение
2. Разрешите уведомления в браузере когда появится запрос
3. Проверьте консоль браузера - вы должны увидеть сообщение с FCM token
4. Токен будет сохранен в таблице `fcm_tokens` в базе данных

## Отправка тестового уведомления

Вы можете отправить тестовое уведомление через Firebase Console:

1. Перейдите в Cloud Messaging → "Send test message"
2. Вставьте ваш FCM token
3. Заполните заголовок и текст уведомления
4. Нажмите "Test"

## Важные замечания

- Push-уведомления работают только по HTTPS (или на localhost для разработки)
- Service Worker должен быть в корне public директории
- После изменений в Service Worker нужно очистить кэш браузера
- Для production вам потребуется серверная функция для автоматической отправки уведомлений по расписанию
