# 🔐 Пошаговая настройка OAuth провайдеров

Этот документ содержит подробные инструкции по настройке входа через Google, Facebook и Apple для вашего приложения Birthday Reminder.

## 📋 Содержание

1. [Подготовка Supabase](#1-подготовка-supabase)
2. [Настройка Google OAuth](#2-настройка-google-oauth)
3. [Настройка Facebook OAuth](#3-настройка-facebook-oauth)
4. [Настройка Apple OAuth](#4-настройка-apple-oauth)
5. [Тестирование](#5-тестирование)

---

## 1. Подготовка Supabase

### 1.1. Откройте настройки аутентификации

1. Перейдите в ваш проект Supabase: https://bwgzkqnnubawzvuxijjf.supabase.co
2. В левом меню выберите **Authentication** → **Providers**

### 1.2. Настройте Site URL и Redirect URLs

1. Перейдите в **Authentication** → **URL Configuration**
2. Установите **Site URL**: 
   - Для разработки: `http://localhost:3000`
   - Для продакшена: ваш домен (например, `https://yourapp.vercel.app`)
3. Добавьте **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://yourapp.vercel.app/auth/callback
   ```

---

## 2. Настройка Google OAuth

### 2.1. Создание проекта в Google Cloud Console

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите **Google+ API**:
   - Перейдите в **APIs & Services** → **Library**
   - Найдите "Google+ API"
   - Нажмите **Enable**

### 2.2. Создание OAuth 2.0 учетных данных

1. Перейдите в **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **OAuth client ID**
3. Если требуется, настройте OAuth consent screen:
   - User Type: **External**
   - App name: Birthday Reminder
   - User support email: ваш email
   - Developer contact: ваш email
   - Добавьте scopes: email, profile, openid
4. Выберите тип приложения: **Web application**
5. Добавьте **Authorized redirect URIs**:
   ```
   https://bwgzkqnnubawzvuxijjf.supabase.co/auth/v1/callback
   ```
6. Нажмите **Create**
7. Скопируйте **Client ID** и **Client Secret**

### 2.3. Настройка в Supabase

1. В Supabase откройте **Authentication** → **Providers**
2. Найдите **Google** и включите его
3. Вставьте:
   - **Client ID** (из шага 2.2)
   - **Client Secret** (из шага 2.2)
4. Нажмите **Save**

### 2.4. Обновление .env.local (опционально)

Если вы хотите использовать эти данные в приложении:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_client_secret
```

---

## 3. Настройка Facebook OAuth

### 3.1. Создание приложения в Facebook

1. Перейдите на [Meta for Developers](https://developers.facebook.com/)
2. Нажмите **My Apps** → **Create App**
3. Выберите тип: **Consumer**
4. Введите имя приложения: Birthday Reminder
5. Добавьте контактный email

### 3.2. Настройка Facebook Login

1. В Dashboard вашего приложения найдите **Facebook Login**
2. Нажмите **Set Up**
3. Выберите платформу: **Web**
4. Введите Site URL: `https://bwgzkqnnubawzvuxijjf.supabase.co`
5. В настройках **Facebook Login** → **Settings**:
   - **Valid OAuth Redirect URIs**:
     ```
     https://bwgzkqnnubawzvuxijjf.supabase.co/auth/v1/callback
     ```
   - Включите **Use Strict Mode for Redirect URIs**
   - Сохраните изменения

### 3.3. Получение App ID и App Secret

1. Перейдите в **Settings** → **Basic**
2. Скопируйте **App ID**
3. Нажмите **Show** рядом с **App Secret** и скопируйте его

### 3.4. Настройка в Supabase

1. В Supabase откройте **Authentication** → **Providers**
2. Найдите **Facebook** и включите его
3. Вставьте:
   - **App ID** (из шага 3.3)
   - **App Secret** (из шага 3.3)
4. Нажмите **Save**

### 3.5. Публикация приложения

⚠️ **Важно**: Пока приложение в режиме разработки, войти смогут только тестовые пользователи.

1. Добавьте тестовых пользователей: **Roles** → **Test Users**
2. Для публикации: переведите переключатель в режим **Live** на странице приложения

### 3.6. Обновление .env.local (опционально)

```env
NEXT_PUBLIC_FACEBOOK_APP_ID=ваш_app_id
FACEBOOK_APP_SECRET=ваш_app_secret
```

---

## 4. Настройка Apple OAuth

### 4.1. Регистрация в Apple Developer Program

⚠️ **Требование**: Для использования Sign in with Apple необходима платная подписка Apple Developer ($99/год)

1. Зарегистрируйтесь на [Apple Developer](https://developer.apple.com/)
2. Оплатите подписку

### 4.2. Создание App ID

1. Перейдите в [Apple Developer Console](https://developer.apple.com/account/)
2. Выберите **Certificates, Identifiers & Profiles**
3. Нажмите **Identifiers** → **+**
4. Выберите **App IDs** → **Continue**
5. Выберите **App**
6. Заполните:
   - **Description**: Birthday Reminder
   - **Bundle ID**: com.yourcompany.birthdayreminder (обратный домен)
7. Включите capability: **Sign in with Apple**
8. Нажмите **Continue** → **Register**

### 4.3. Создание Services ID

1. В **Identifiers** нажмите **+**
2. Выберите **Services IDs** → **Continue**
3. Заполните:
   - **Description**: Birthday Reminder Web
   - **Identifier**: com.yourcompany.birthdayreminder.web
4. Включите **Sign in with Apple**
5. Нажмите **Configure**:
   - **Primary App ID**: выберите созданный App ID
   - **Web Domain**: `bwgzkqnnubawzvuxijjf.supabase.co`
   - **Return URLs**: 
     ```
     https://bwgzkqnnubawzvuxijjf.supabase.co/auth/v1/callback
     ```
6. Нажмите **Save** → **Continue** → **Register**

### 4.4. Создание Private Key

1. В **Certificates, Identifiers & Profiles** выберите **Keys**
2. Нажмите **+**
3. Заполните:
   - **Key Name**: Birthday Reminder Sign in with Apple Key
   - Включите **Sign in with Apple**
4. Нажмите **Configure**:
   - Выберите ваш **Primary App ID**
5. Нажмите **Save** → **Continue** → **Register**
6. **Скачайте файл .p8** (его нельзя будет скачать повторно!)
7. Запишите **Key ID**

### 4.5. Настройка в Supabase

1. В Supabase откройте **Authentication** → **Providers**
2. Найдите **Apple** и включите его
3. Вставьте:
   - **Services ID**: com.yourcompany.birthdayreminder.web (из шага 4.3)
   - **Team ID**: найдите в правом верхнем углу Apple Developer Console
   - **Key ID**: из шага 4.4
   - **Private Key**: откройте .p8 файл и скопируйте содержимое
4. Нажмите **Save**

### 4.6. Обновление .env.local (опционально)

```env
NEXT_PUBLIC_APPLE_CLIENT_ID=com.yourcompany.birthdayreminder.web
APPLE_TEAM_ID=ваш_team_id
APPLE_KEY_ID=ваш_key_id
APPLE_PRIVATE_KEY="содержимое .p8 файла"
```

---

## 5. Тестирование

### 5.1. Запуск приложения

```bash
# Установите зависимости (если еще не установлены)
pnpm install

# Запустите dev server
pnpm dev
```

### 5.2. Тестирование входа

1. Откройте http://localhost:3000/auth/login
2. Нажмите на кнопку входа через социальную сеть
3. Авторизуйтесь через выбранный сервис
4. Проверьте, что вы перенаправлены обратно в приложение

### 5.3. Проверка в Supabase

1. Откройте **Authentication** → **Users**
2. Вы должны увидеть нового пользователя с провайдером (google/facebook/apple)

### 5.4. Отладка

Если возникли проблемы:

1. **Проверьте URL колбэка**:
   - В Supabase: `https://bwgzkqnnubawzvuxijjf.supabase.co/auth/v1/callback`
   - Он должен быть добавлен во всех провайдерах

2. **Проверьте консоль браузера** на наличие ошибок

3. **Проверьте логи Supabase**:
   - **Authentication** → **Logs**

4. **Распространенные ошибки**:
   - `redirect_uri_mismatch`: неверный URL колбэка
   - `invalid_client`: неверный Client ID/Secret
   - `unauthorized_client`: приложение не одобрено или в режиме разработки

---

## 📝 Чеклист настройки

### Google OAuth
- [ ] Проект создан в Google Cloud Console
- [ ] OAuth consent screen настроен
- [ ] OAuth 2.0 credentials созданы
- [ ] Redirect URI добавлен
- [ ] Client ID и Secret добавлены в Supabase
- [ ] Провайдер включен в Supabase
- [ ] Тестирование пройдено

### Facebook OAuth
- [ ] Приложение создано в Meta for Developers
- [ ] Facebook Login настроен
- [ ] Valid OAuth Redirect URI добавлен
- [ ] App ID и Secret добавлены в Supabase
- [ ] Провайдер включен в Supabase
- [ ] Тестовые пользователи добавлены (для режима разработки)
- [ ] Тестирование пройдено

### Apple OAuth
- [ ] Подписка Apple Developer активна
- [ ] App ID создан
- [ ] Services ID создан
- [ ] Web Domain и Return URLs настроены
- [ ] Private Key создан и скачан (.p8)
- [ ] Services ID, Team ID, Key ID и Private Key добавлены в Supabase
- [ ] Провайдер включен в Supabase
- [ ] Тестирование пройдено

---

## 🎯 Готово!

После завершения всех настроек:
1. Пользователи смогут входить через Google, Facebook или Apple
2. Данные пользователей будут автоматически синхронизироваться с Supabase
3. Вы сможете управлять пользователями в Supabase Dashboard

## 🆘 Нужна помощь?

- [Документация Supabase OAuth](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
