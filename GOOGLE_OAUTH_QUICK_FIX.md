# 🎯 БЫСТРОЕ РЕШЕНИЕ: Google OAuth "Доступ заблокирован"

## 🚨 Ошибка
```
Доступ заблокирован: недопустимый запрос от этого приложения
```

---

## ⚡ БЫСТРОЕ РЕШЕНИЕ (5 минут)

### ✅ Шаг 1: OAuth Consent Screen
1. Откройте: https://console.cloud.google.com/apis/credentials/consent
2. Если не настроен - выберите **External** → **Create**
3. Заполните минимум:
   - **App name**: Birthday Reminder
   - **User support email**: ваш email
   - **Developer contact**: ваш email
4. **Save and Continue**

### ✅ Шаг 2: Scopes (ВАЖНО!)
1. На странице Scopes нажмите **Add or Remove Scopes**
2. Найдите и отметьте:
   ```
   ☑️ .../auth/userinfo.email
   ☑️ .../auth/userinfo.profile  
   ☑️ openid
   ```
3. **Update** → **Save and Continue**

### ✅ Шаг 3: Test Users (ОБЯЗАТЕЛЬНО!)
1. На странице Test users нажмите **Add Users**
2. Добавьте ваш Google email
3. **Add** → **Save and Continue**

### ✅ Шаг 4: OAuth Client ID
1. Откройте: https://console.cloud.google.com/apis/credentials
2. **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. **Authorized redirect URIs**:
   ```
   https://bwgzkqnnubawzvuxijjf.supabase.co/auth/v1/callback
   ```
5. **Create** → Скопируйте Client ID и Secret

### ✅ Шаг 5: Supabase
1. Откройте: https://supabase.com/dashboard/project/bwgzkqnnubawzvuxijjf/auth/providers
2. Найдите **Google** → включите
3. Вставьте Client ID и Client Secret
4. **Save**

---

## 🧪 Тест

```bash
cd /workspaces/v0-birthday-reminder-app
pnpm dev
```

Откройте: http://localhost:3000/auth/login

Нажмите **"Войти через Google"** → должно работать! ✅

---

## 💡 Если все еще не работает

### Вариант 1: Опубликуйте приложение
1. OAuth consent screen → **Publish App**
2. Подтвердите → теперь работает для всех

### Вариант 2: Подождите 5 минут
Google может потребоваться время для обновления настроек

### Вариант 3: Проверьте email
Убедитесь, что входите под email, который добавлен в Test users

---

## 📖 Полная документация

Если нужны подробности → [GOOGLE_OAUTH_FIX.md](./GOOGLE_OAUTH_FIX.md)

---

## ✅ Чеклист

- [ ] OAuth consent screen настроен
- [ ] App name заполнен
- [ ] Scopes добавлены (email, profile, openid)
- [ ] Test users - добавлен ваш email
- [ ] OAuth Client ID создан
- [ ] Redirect URI: `https://bwgzkqnnubawzvuxijjf.supabase.co/auth/v1/callback`
- [ ] Client ID и Secret скопированы
- [ ] В Supabase Google включен
- [ ] Client ID и Secret вставлены в Supabase
- [ ] Протестировано

**Готово! 🎉**
