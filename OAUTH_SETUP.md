# Настройка OAuth провайдеров в Supabase

Для работы входа через социальные сети необходимо настроить OAuth провайдеры в Supabase Dashboard.

## Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в "APIs & Services" → "Credentials"
4. Нажмите "Create Credentials" → "OAuth client ID"
5. Выберите тип приложения: "Web application"
6. Добавьте разрешенные URI перенаправления:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
7. Скопируйте Client ID и Client Secret

8. Откройте Supabase Dashboard
9. Перейдите в Authentication → Providers
10. Включите Google provider
11. Вставьте Client ID и Client Secret
12. Сохраните изменения

## Facebook OAuth

1. Перейдите в [Facebook Developers](https://developers.facebook.com/)
2. Создайте новое приложение
3. Добавьте продукт "Facebook Login"
4. В настройках Facebook Login добавьте Valid OAuth Redirect URIs:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. Скопируйте App ID и App Secret

6. В Supabase Dashboard:
7. Authentication → Providers → Facebook
8. Включите Facebook provider
9. Вставьте App ID и App Secret
10. Сохраните изменения

## Apple OAuth

1. Перейдите в [Apple Developer](https://developer.apple.com/)
2. Sign in with your Apple ID
3. Certificates, Identifiers & Profiles → Keys
4. Создайте новый Key с "Sign in with Apple" enabled
5. Скопируйте Key ID и скачайте .p8 файл
6. Создайте Service ID для вашего приложения
7. Добавьте Return URLs:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

8. В Supabase Dashboard:
9. Authentication → Providers → Apple
10. Включите Apple provider
11. Заполните необходимые поля (Service ID, Team ID, Key ID, Private Key)
12. Сохраните изменения

## Важно

После настройки OAuth провайдеров в Supabase Dashboard:
- Убедитесь, что все redirect URLs правильно настроены
- Проверьте, что приложение находится в режиме production (не sandbox)
- Протестируйте вход через каждого провайдера

## Отладка

Если OAuth не работает:
1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что redirect URLs совпадают точно (включая https://)
3. Проверьте, что провайдер включен в Supabase Dashboard
4. Убедитесь, что credentials правильно скопированы
