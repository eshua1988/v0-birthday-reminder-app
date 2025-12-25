# ⚡ Быстрая настройка OAuth - Памятка

Краткое руководство для настройки социальных входов.

---

## 🔑 Общий Redirect URL (для всех провайдеров)

```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

> Замените `[YOUR-PROJECT-REF]` на ваш Project Reference из Supabase Dashboard → Settings → General

---

## 🔵 Google OAuth (5 минут)

### 1. Google Cloud Console
- Перейти: https://console.cloud.google.com/
- Создать проект
- APIs & Services → OAuth consent screen → External → Заполнить форму
- Credentials → Create → OAuth Client ID
- Web application → Добавить redirect URL
- **Копировать:** Client ID + Client Secret

### 2. Supabase
- Authentication → Providers → Google → Enable
- Вставить Client ID и Client Secret
- Save

---

## 🔵 Facebook OAuth (7 минут)

### 1. Facebook Developers
- Перейти: https://developers.facebook.com/
- My Apps → Create App → Consumer
- Add Product: Facebook Login
- Settings → Valid OAuth Redirect URIs → Добавить URL
- Settings → Basic
- **Копировать:** App ID + App Secret

### 2. Supabase
- Authentication → Providers → Facebook → Enable
- Вставить App ID и App Secret
- Save

### 3. Публикация (Опционально)
- Переключить режим на "Live" (для продакшена)

---

## 🍎 Apple OAuth (10 минут)

### 1. Apple Developer
- Перейти: https://developer.apple.com/account/
- Certificates, Identifiers & Profiles

### 2. Создать App ID
- Identifiers → + → App IDs → App
- Bundle ID: `com.yourcompany.appname`
- Enable: Sign in with Apple

### 3. Создать Service ID
- Identifiers → + → Services IDs
- Identifier: `com.yourcompany.appname.service`
- Enable Sign in with Apple → Configure
- Добавить Domain и Return URLs
- **Копировать:** Service ID

### 4. Создать Key
- Keys → + → Sign in with Apple
- Download .p8 file (только раз!)
- **Копировать:** Key ID, Team ID (вверху справа), Private Key (.p8 содержимое)

### 5. Supabase
- Authentication → Providers → Apple → Enable
- Services ID, Team ID, Key ID, Private Key
- Save

---

## ✅ Проверка

### Тест локально:
```bash
npm run dev
# Открыть: http://localhost:3000/auth/login
# Нажать кнопку провайдера
```

### Проверка в Supabase:
- Authentication → Users
- Должен появиться новый пользователь с provider = google/facebook/apple

---

## 🐛 Частые ошибки

| Ошибка | Решение |
|--------|---------|
| "Provider not enabled" | Включить в Supabase Dashboard |
| "Redirect URI mismatch" | Проверить точное совпадение URL |
| "Invalid credentials" | Перепроверить ID/Secret, убрать пробелы |
| Google "Not configured" | Завершить OAuth consent screen |
| Facebook "App not Live" | Переключить в Live mode или добавить тестового пользователя |
| Apple "Invalid client" | Проверить Service ID, Private Key целиком |

---

## 📋 Чек-лист

- [ ] Google: Client ID + Secret → Supabase
- [ ] Facebook: App ID + Secret → Supabase
- [ ] Apple: Service ID + Team ID + Key ID + Private Key → Supabase
- [ ] Redirect URLs добавлены везде
- [ ] Провайдеры включены в Supabase
- [ ] Протестирован вход для каждого провайдера

---

**Подробное руководство**: см. файл `OAUTH_SETUP.md`
