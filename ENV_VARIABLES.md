# Полный список переменных окружения для Vercel

## 📋 Быстрая справка

| Переменная | Обязательна | Где получить | Пример |
|-----------|-------------|--------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project Settings | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Project Settings | `eyJhbGciOiJIUzI1...` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Project Settings | `AIzaSyC...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase Project Settings | `project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase Project Settings | `my-project-123` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Project Settings | `project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase Project Settings | `123456789` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase Project Settings | `1:123:web:abc` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | ⚠️ | Firebase Analytics | `G-ABC123` |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ✅ | Firebase Cloud Messaging | `BN5x...` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ✅ | Firebase Service Account | `{"type":"service_account"...}` |
| `CRON_SECRET` | ✅ | Сгенерировать самостоятельно | `random-secret-key-123` |
| `GOOGLE_CLIENT_ID` | ⚠️ | Google Cloud Console | `123.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Google Cloud Console | `GOCSPX-...` |
| `GOOGLE_REFRESH_TOKEN` | ⚠️ | OAuth Flow | `1//0gF...` |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | @BotFather в Telegram | `6841458983:AAGy...` |

**Легенда:**
- ✅ **Обязательна** - приложение не будет работать без неё
- ⚠️ **Опциональна** - для дополнительных функций (Google Drive бэкап, Telegram, Analytics)

---

## 🔧 Подробная настройка

### 1. Supabase (база данных и авторизация)

#### Где взять:
1. Откройте [Supabase Dashboard](https://app.supabase.com/)
2. Выберите ваш проект
3. **Settings ⚙️** → **API**

#### Переменные:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Важно:**
- `anon key` - публичный, безопасен для клиента
- RLS (Row Level Security) защищает данные на уровне базы
- См. [DATABASE_SETUP.md](DATABASE_SETUP.md) для настройки таблиц

---

### 2. Firebase Client (веб push-уведомления)

#### Где взять:
1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект или создайте новый
3. **Project Settings ⚙️** → **General** → **Your apps**
4. Выберите веб-приложение или создайте новое

#### Переменные:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC1234567890abcdefghijklmnop
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=my-birthday-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-birthday-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=my-birthday-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123XYZ
```

**Где найти каждую переменную:**
- Все значения в разделе **Firebase SDK snippet** → **Config**
- Скопируйте из объекта `firebaseConfig`

---

### 3. Firebase VAPID Key (для Web Push)

#### Где взять:
1. Firebase Console → ваш проект
2. **Project Settings ⚙️** → **Cloud Messaging**
3. Прокрутите до **Web Push certificates**
4. Нажмите **Generate key pair** (если ключа нет)

#### Переменная:
```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN5x1234567890abcdefghijklmnopqrstuvwxyz...
```

**Важно:**
- Длина ~170 символов
- Начинается с `B`
- Нужен для регистрации Service Worker

См. [FIREBASE_FCM_SETUP.md](FIREBASE_FCM_SETUP.md) для подробностей.

---

### 4. Firebase Admin SDK (серверная отправка уведомлений)

#### Где взять:
1. Firebase Console → ваш проект
2. **Project Settings ⚙️** → **Service Accounts**
3. Нажмите **Generate new private key**
4. Скачается JSON файл

#### Переменная:
```env
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"my-birthday-app","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQ...=\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk@my-birthday-app.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40my-birthday-app.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

**Важно:**
- Это **приватный ключ** - храните в секрете!
- Копируйте **весь JSON** как одну строку
- `\n` в `private_key` должны остаться как есть
- Не коммитьте в Git!

**Проверка:**
```javascript
// В Vercel Functions можно проверить:
const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
console.log(key.project_id); // должен вывести project_id
```

См. [FIREBASE_ADMIN_SETUP.md](FIREBASE_ADMIN_SETUP.md) для подробной инструкции.

---

### 5. CRON_SECRET (защита cron endpoint)

#### Как создать:
Сгенерируйте случайную строку любым способом:

**Вариант 1 - OpenSSL:**
```bash
openssl rand -base64 32
```

**Вариант 2 - PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Вариант 3 - Node.js:**
```javascript
require('crypto').randomBytes(32).toString('base64')
```

**Вариант 4 - Онлайн генератор:**
https://www.random.org/strings/?num=1&len=32&digits=on&upperalpha=on&loweralpha=on

#### Переменная:
```env
CRON_SECRET=j8Kd9mP2qR5tW7xY0aB3cE6fH8iL1nO4pS
```

**Зачем нужна:**
- Защищает `/api/cron/check-birthdays` от несанкционированного доступа
- Vercel Cron автоматически передает этот заголовок
- Без неё кто угодно может вызвать cron endpoint

**Как используется:**
```typescript
// В /api/cron/check-birthdays/route.ts
const authHeader = request.headers.get("authorization");
const token = authHeader?.replace("Bearer ", "");

if (token !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### 6. Google Drive (опционально - для бэкапов)

#### Где взять:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или используйте существующий
3. **APIs & Services** → **Credentials**
4. Create Credentials → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `https://developers.google.com/oauthplayground`

#### Переменные:
```env
GOOGLE_CLIENT_ID=123456789012-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx
GOOGLE_REFRESH_TOKEN=1//0gFrN8X...
```

**Получение Refresh Token:**
1. Откройте [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Настройки (шестеренка) → Use your own OAuth credentials
3. Введите Client ID и Client Secret
4. Step 1: Select Google Drive API v3 → `https://www.googleapis.com/auth/drive.file`
5. Authorize APIs
6. Step 2: Exchange authorization code for tokens
7. Скопируйте **Refresh token**

См. [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md) для деталей.

---

## 🚀 Добавление в Vercel

### Через веб-интерфейс:

1. Откройте [Vercel Dashboard](https://vercel.com/)
2. Выберите ваш проект
3. **Settings** → **Environment Variables**
4. Нажмите **Add New**
5. Заполните:
   - **Key**: название переменной (например, `CRON_SECRET`)
   - **Value**: значение переменной
   - **Environment**: выберите `Production`, `Preview`, `Development`
6. Нажмите **Save**

**Важно:**
- Для production всегда выбирайте **Production**
- Для `NEXT_PUBLIC_*` переменных также выбирайте все окружения
- После добавления переменных **передеплойте приложение**

### Через Vercel CLI:

```bash
# Установить Vercel CLI
npm install -g vercel

# Логин
vercel login

# Добавить переменную
vercel env add CRON_SECRET production
# Введите значение когда появится запрос

# Добавить из файла .env
vercel env pull .env.production
```

---

## 📝 Проверка переменных

### 1. Локально (перед деплоем):

Создайте файл `.env.local` в корне проекта:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN5x...

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Cron
CRON_SECRET=random-secret-key

# Google Drive (опционально)
GOOGLE_CLIENT_ID=123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REFRESH_TOKEN=1//0g...
```

**Важно:**
- Добавьте `.env.local` в `.gitignore`
- Никогда не коммитьте секретные ключи!
- Для командной работы используйте `.env.example` с пустыми значениями

### 2. В продакшене (Vercel):

#### Проверка через логи:
```typescript
// Добавьте в любой API route:
console.log("Environment check:", {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  hasCronSecret: !!process.env.CRON_SECRET
});
```

#### Тест через API:
```bash
# Тест cron endpoint
curl https://your-app.vercel.app/api/cron/check-birthdays \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Ожидается JSON ответ, а не 401 Unauthorized
```

---

## ⚠️ Безопасность

### ✅ Что безопасно делать:
- Коммитить `NEXT_PUBLIC_*` переменные в Git
- Показывать `SUPABASE_URL` и `SUPABASE_ANON_KEY` в клиенте
- Использовать Firebase config в браузере

### ❌ Никогда не делайте:
- **Не коммитьте** `FIREBASE_SERVICE_ACCOUNT_KEY` в Git
- **Не коммитьте** `CRON_SECRET` в Git
- **Не коммитьте** Google OAuth секреты
- **Не показывайте** private keys в клиентском коде
- **Не используйте** production ключи в публичных примерах

### 🔒 Лучшие практики:
1. Используйте `.gitignore` для `.env*` файлов
2. Храните секреты только в Vercel Environment Variables
3. Регулярно ротируйте `CRON_SECRET`
4. При утечке немедленно перегенерируйте ключи Firebase
5. Используйте разные ключи для development/production

---

## 🐛 Устранение неполадок

### "Environment variable not found"

**Симптомы:**
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```

**Решение:**
1. Проверьте что переменная добавлена в Vercel
2. Убедитесь что выбрано правильное окружение (Production)
3. **Передеплойте приложение** после добавления переменных
4. Очистите кэш: Settings → Data Cache → Clear Cache

### "Invalid Firebase configuration"

**Симптомы:**
```
Firebase: Error (auth/invalid-api-key)
```

**Решение:**
1. Проверьте что все `NEXT_PUBLIC_FIREBASE_*` переменные заполнены
2. Убедитесь что нет лишних пробелов в начале/конце
3. API Key должен начинаться с `AIza`
4. Проверьте что Firebase Authentication включен

### "FIREBASE_SERVICE_ACCOUNT_KEY parsing failed"

**Симптомы:**
```
SyntaxError: Unexpected token in JSON at position 0
```

**Решение:**
1. Убедитесь что скопирован **весь JSON** (начинается с `{`, заканчивается `}`)
2. Не добавляйте кавычки вокруг JSON
3. Проверьте что `\n` в `private_key` сохранены
4. Попробуйте минифицировать JSON (удалить переносы строк везде кроме `private_key`)

**Правильный формат:**
```json
{"type":"service_account","project_id":"my-app","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",...}
```

### "Cron job not triggered"

**Симптомы:**
- Уведомления не приходят
- В логах нет записей о cron выполнении

**Решение:**
1. Проверьте что `vercel.json` задеплоен
2. Убедитесь что `CRON_SECRET` настроен
3. Проверьте Settings → Cron Jobs - должна быть запись
4. Попробуйте вручную вызвать endpoint с curl

---

## 📚 Связанные документы

- [WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md) - Настройка веб push-уведомлений
- [FIREBASE_ADMIN_SETUP.md](FIREBASE_ADMIN_SETUP.md) - Firebase Admin SDK
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Supabase база данных
- [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md) - Google Drive бэкапы
- [VERCEL_GITHUB_DEPLOYMENT_GUIDE.md](VERCEL_GITHUB_DEPLOYMENT_GUIDE.md) - Деплой на Vercel

---

## ✅ Финальный чеклист

Перед деплоем убедитесь:

### Обязательные переменные:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Все 8 переменных `NEXT_PUBLIC_FIREBASE_*`
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` (полный JSON)
- [ ] `CRON_SECRET` (случайная строка)

### Проверки:
- [ ] `.env.local` добавлен в `.gitignore`
- [ ] Все переменные добавлены в Vercel Environment Variables
- [ ] Выбрано окружение: Production
- [ ] Приложение передеплоено после добавления переменных
- [ ] `vercel.json` содержит cron конфигурацию
- [ ] Тестовое уведомление работает

### Опциональные (для дополнительных функций):
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (Google Drive)
- [ ] `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (Analytics)

**Всё готово!** Теперь приложение работает в продакшене 🚀
