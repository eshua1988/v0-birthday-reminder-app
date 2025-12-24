# Настройка Google Drive для резервного копирования

## Важно: В v0 не используются .env файлы!

Все переменные окружения управляются через интерфейс Vercel. Вы уже видите правильный интерфейс на скриншоте.

## Пошаговая инструкция

### Шаг 1: Создайте проект в Google Cloud Console

1. Откройте https://console.cloud.google.com/
2. Нажмите на выпадающее меню проектов (вверху слева)
3. Нажмите **"NEW PROJECT"** (Новый проект)
4. Введите название проекта, например: "Church Birthday Reminders"
5. Нажмите **"CREATE"** (Создать)

### Шаг 2: Включите Google Drive API

1. В левом меню выберите **"APIs & Services"** → **"Library"**
2. В поиске введите **"Google Drive API"**
3. Нажмите на **"Google Drive API"**
4. Нажмите кнопку **"ENABLE"** (Включить)

### Шаг 3: Создайте OAuth 2.0 Client ID

1. В левом меню выберите **"APIs & Services"** → **"Credentials"**
2. Нажмите **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Если появится запрос настроить OAuth consent screen:
   - Нажмите **"CONFIGURE CONSENT SCREEN"**
   - Выберите **"External"** (Внешний)
   - Заполните обязательные поля:
     - App name: "Church Birthday Reminders"
     - User support email: ваш email
     - Developer contact information: ваш email
   - Нажмите **"SAVE AND CONTINUE"**
   - На странице "Scopes" нажмите **"SAVE AND CONTINUE"**
   - На странице "Test users" нажмите **"SAVE AND CONTINUE"**
   - Нажмите **"BACK TO DASHBOARD"**

4. Вернитесь к созданию credentials:
   - **"APIs & Services"** → **"Credentials"**
   - Нажмите **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
   - Application type: выберите **"Web application"**
   - Name: введите "Birthday App Web Client"

5. В разделе **"Authorized JavaScript origins"** нажмите **"+ ADD URI"** и добавьте:
   - Для разработки: `http://localhost:3000`
   - Для production: ваш URL Vercel (например: `https://your-app.vercel.app`)

6. В разделе **"Authorized redirect URIs"** нажмите **"+ ADD URI"** и добавьте:
   - Для разработки: `http://localhost:3000`
   - Для production: ваш URL Vercel

7. Нажмите **"CREATE"**

8. **ВАЖНО**: Скопируйте **"Your Client ID"** - это длинная строка, которая выглядит примерно так:
   ```
   123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

### Шаг 4: Добавьте Client ID в Vercel

1. В интерфейсе v0 (который вы видите на скриншоте):
   - В поле **"NEXT_PUBLIC_GOOGLE_CLIENT_ID"** вставьте скопированный Client ID
   - Нажмите **"Представить на рассмотрение"** (Submit for review)

2. После добавления переменной приложение автоматически пересоберется

### Шаг 5: Проверка работы

1. Откройте приложение
2. Перейдите в **Настройки** (⚙️ иконка в боковой панели)
3. Прокрутите до раздела **"Резервное копирование"**
4. Нажмите **"Подключить Google Drive"**
5. Войдите в свой Google аккаунт
6. Разрешите приложению доступ к Google Drive
7. После успешного подключения кнопка изменится на **"Сохранить в Google Drive"**

## Примечания

- Переменная **NEXT_PUBLIC_GOOGLE_CLIENT_ID** должна начинаться с `NEXT_PUBLIC_`, чтобы быть доступной в браузере
- Client ID является публичным и не требует защиты (в отличие от Client Secret)
- Резервные копии сохраняются в папку "Church Birthdays Backups" в вашем Google Drive
- Только вы сможете видеть и восстанавливать свои резервные копии

## Решение проблем

### "Уведомление об ошибке: popup_closed_by_user"
Пользователь закрыл окно входа. Попробуйте снова.

### "Уведомление об ошибке: access_denied"
Вы не предоставили разрешение на доступ к Google Drive. Для работы функции необходимо предоставить доступ.

### "Client ID не настроен"
Переменная окружения NEXT_PUBLIC_GOOGLE_CLIENT_ID не установлена. Следуйте инструкциям выше.

### Функция не работает после добавления Client ID
Подождите несколько минут пока Vercel пересоберет приложение, затем обновите страницу (F5).
