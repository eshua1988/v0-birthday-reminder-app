# Полная инструкция по добавлению переменных окружения

## Обзор всех необходимых переменных

| Переменная | Источник | Обязательна | Описание |
|-----------|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ✅ Да | URL вашего Supabase проекта |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ✅ Да | Публичный ключ Supabase |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase | ✅ Да | Firebase API ключ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase | ✅ Да | Firebase auth домен |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase | ✅ Да | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase | ✅ Да | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase | ✅ Да | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase | ✅ Да | Firebase App ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase | ✅ Да | Firebase VAPID ключ для push |
| `FIREBASE_ADMIN_SDK_KEY` | Firebase | ✅ Да | Firebase Admin SDK JSON |
| `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID` | Google Cloud | ❌ Опцион. | Google Drive Client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Google Cloud | ❌ Опцион. | Google Drive Client Secret |
| `GOOGLE_DRIVE_REDIRECT_URI` | Google Cloud | ❌ Опцион. | Google Drive Redirect URI |

---

## Шаг 1: Получить Supabase переменные

### 1.1 Откройте Supabase Dashboard

1. Перейти на [supabase.com/dashboard](https://supabase.com/dashboard)
2. Выбрать ваш проект (или создать новый)

### 1.2 Получить NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY

**Способ 1: Через Settings**
1. В левом меню выбрать **Settings** → **API**
2. В разделе "Project API keys" увидите:
   - **Project URL** - это ваш `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** - это ваш `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Способ 2: Автоматически из кода**
1. Перейти **Home** в Supabase
2. Нажать **"Get started"** → **"Connect"**
3. Нажать **"JavaScript"**
4. Скопировать URL и anon key из примера кода

### Пример Supabase переменных:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Шаг 2: Получить Firebase переменные

### 2.1 Создать проект Firebase

1. Перейти на [console.firebase.google.com](https://console.firebase.google.com/)
2. Нажать **"Add project"** (Добавить проект)
3. Ввести название: "Birthday Reminder"
4. Нажать **"Create project"**
5. Дождаться завершения создания

### 2.2 Зарегистрировать веб-приложение

1. В Firebase Console нажать иконку **</> (Web)** в "Getting Started"
2. Ввести nickname приложения: "Birthday Reminder Web"
3. **Важно**: Отметить ✅ "Also set up Firebase Hosting"
4. Нажать **"Register app"**

### 2.3 Скопировать Firebase конфигурацию

После регистрации вы увидите:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

Используйте эти значения для:
- `NEXT_PUBLIC_FIREBASE_API_KEY` = apiKey
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = authDomain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = projectId
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = storageBucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = messagingSenderId
- `NEXT_PUBLIC_FIREBASE_APP_ID` = appId

### Пример Firebase переменных:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=birthday-reminder.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=birthday-reminder
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=birthday-reminder.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

### 2.4 Получить VAPID ключ для Push-уведомлений

1. В Firebase Console перейти **Build** → **Cloud Messaging**
2. Перейти на вкладку **"Web configuration"**
3. В разделе **"Web Push certificates"** нажать **"Generate key pair"**
4. Скопировать VAPID ключ:

```
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BBxxxxxxxx...
```

### 2.5 Получить Firebase Admin SDK ключ

1. В Firebase Console перейти **Settings** → **Service Accounts** (иконка шестеренки)
2. Перейти на вкладку **"Service Accounts"**
3. Нажать **"Generate new private key"**
4. Скопировать весь JSON файл

**Важно**: Этот JSON содержит чувствительные данные, не делитесь им!

JSON выглядит так:
```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

Значение всего JSON используется для:
```
FIREBASE_ADMIN_SDK_KEY={"type":"service_account","project_id":"..."}
```

---

## Шаг 3: Получить Google Drive переменные (опционально)

### 3.1 Создать Google Cloud проект

1. Перейти на [console.cloud.google.com](https://console.cloud.google.com/)
2. Нажать на выпадающее меню проектов (вверху слева)
3. Нажать **"NEW PROJECT"**
4. Ввести название: "Birthday Reminder"
5. Нажать **"CREATE"**

### 3.2 Включить Google Drive API

1. В левом меню: **APIs & Services** → **Library**
2. Поиск: "Google Drive API"
3. Нажать на результат
4. Нажать **"ENABLE"**

### 3.3 Создать OAuth 2.0 Client ID

1. В левом меню: **APIs & Services** → **Credentials**
2. Нажать **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Если запросит: настроить **OAuth consent screen**:
   - Выбрать **"External"**
   - Заполнить:
     - App name: "Birthday Reminder"
     - User support email: ваш email
     - Developer contact: ваш email
   - Нажать **"SAVE AND CONTINUE"**
   - На остальных экранах просто нажимать **"SAVE AND CONTINUE"**

4. Вернуться в Credentials и создать новый OAuth Client ID:
   - Application type: **"Web application"**
   - Name: "Birthday App Client"

### 3.4 Добавить URIs

В разделе **"Authorized JavaScript origins"**:
- Для разработки: `http://localhost:3000`
- Для production: `https://your-app.vercel.app`

В разделе **"Authorized redirect URIs"**:
- Для разработки: `http://localhost:3000/api/google/callback`
- Для production: `https://your-app.vercel.app/api/google/callback`

### 3.5 Скопировать Client ID и Secret

После создания вы увидите всплывающее окно:

```
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=123456789-abc...
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-abc...
GOOGLE_DRIVE_REDIRECT_URI=https://your-app.vercel.app/api/google/callback
```

---

## Способ 1: Добавить переменные для локальной разработки

### Создать файл `.env.local`

1. В корне проекта создать файл `.env.local`
2. Добавить все переменные (приватные остаются только локально):

```env
# Supabase (ОБЯЗАТЕЛЬНО)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Firebase (ОБЯЗАТЕЛЬНО)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=birthday-reminder.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=birthday-reminder
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=birthday-reminder.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BBxxxxxxxx...

# Firebase Admin (приватный, не отправлять на GitHub!)
FIREBASE_ADMIN_SDK_KEY={"type":"service_account","project_id":"..."}

# Google Drive (опционально)
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=123456789-abc...
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-abc...
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

3. Файл `.env.local` уже в `.gitignore`, поэтому безопасен
4. После сохранения перезапустить dev сервер: `npm run dev`

---

## Способ 2: Добавить переменные на Vercel (Deployment)

### 2.1 Откройте Vercel Dashboard

1. Перейти на [vercel.com/dashboard](https://vercel.com/dashboard)
2. Выбрать ваш проект "v0-birthday-reminder-app"

### 2.2 Откройте Settings → Environment Variables

1. Нажать **"Settings"** в верхнем меню проекта
2. В левом меню нажать **"Environment Variables"**

### 2.3 Добавить каждую переменную

**Для ПУБЛИЧНЫХ переменных (NEXT_PUBLIC_*):**

Нажать **"+ Add New"**:
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: `https://your-project.supabase.co`
- Выбрать все environment: ✅ Production, ✅ Preview, ✅ Development
- Нажать **"Save"**

**Повторить для всех NEXT_PUBLIC_* переменных:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID`

**Для ПРИВАТНЫХ переменных (без NEXT_PUBLIC_):**

Нажать **"+ Add New"**:
- Name: `FIREBASE_ADMIN_SDK_KEY`
- Value: `{"type":"service_account","project_id":"..."}`
- Выбрать ✅ Production (только Production для приватных ключей!)
- Нажать **"Save"**

**Повторить для:**
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`

### 2.4 Изменить Redirect URI для production

После развертывания на Vercel узнайте ваш URL (например: `https://birthday-reminder.vercel.app`)

Обновить:
- `GOOGLE_DRIVE_REDIRECT_URI=https://birthday-reminder.vercel.app/api/google/callback`

---

## Проверка что всё работает

### Локально
```bash
npm run dev
```
Открыть `http://localhost:3000` и проверить что приложение загружается.

### На Vercel
1. После добавления переменных нажать **"Deploy"** чтобы переразвернуть приложение
2. Перейти на URL вашего Vercel проекта
3. Проверить что приложение работает

---

## Важные замечания

⚠️ **Безопасность:**
- ❌ Никогда не коммитьте `.env.local` в GitHub
- ❌ Никогда не делитесь `FIREBASE_ADMIN_SDK_KEY`
- ❌ Никогда не делитесь `GOOGLE_DRIVE_CLIENT_SECRET`
- ✅ `NEXT_PUBLIC_*` переменные безопасны для публикации

⚠️ **Развертывание:**
- Переменные на Vercel будут использованы при production сборке
- После изменения переменных на Vercel нужно переразвернуть (redeploy)

⚠️ **Problematic Characters:**
- Если значение содержит спецсимволы, может потребоваться экранирование
- Для JSON используйте двойные кавычки

---

## Полезные ссылки

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/auth/quickstart)
- [Firebase Config](https://firebase.google.com/docs/web/setup)
- [Google Cloud Credentials](https://cloud.google.com/docs/authentication/getting-started)
