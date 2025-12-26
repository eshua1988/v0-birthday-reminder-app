# Настройка автоматического развертывания на Vercel

## Шаги для включения автоматического развертывания:

### 1. Подключение репозитория к Vercel

1. Перейти на [vercel.com](https://vercel.com)
2. Войти в аккаунт (или создать новый)
3. Нажать **"Add New..."** → **"Project"**
4. Выбрать **"Import Git Repository"**
5. Авторизовать Vercel в GitHub
6. Найти и выбрать репозиторий `v0-birthday-reminder-app`
7. Нажать **"Import"**

### 2. Настройка переменных окружения

На странице импорта проекта:

1. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` - ваш URL Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ваш anon ключ Supabase
   - Другие переменные (Firebase, Google Drive и т.д.)

2. Нажать **"Deploy"**

### 3. Автоматическое развертывание

После подключения, Vercel **автоматически**:
- 🔄 Развертывает приложение при каждом push в ветку `main`
- 📝 Создает preview версию для Pull Request
- ✅ Запускает автоматические проверки

### 4. GitHub статусы проверок

Vercel будет автоматически добавлять статусы в GitHub:
- ✅ Successful - развертывание прошло успешно
- ⏳ Building - идет сборка проекта
- ❌ Failed - ошибка при развертывании

### 5. Настройки в Vercel Dashboard

В настройках проекта на Vercel:

1. **Settings** → **Git**
   - ✅ **Production Deployments**: Main branch enabled
   - ✅ **Preview Deployments**: All branches enabled (опционально)
   - ✅ **Automatic deployments**: Enabled

2. **Settings** → **Build & Development Settings**
   - Framework: **Next.js** (автоматически определяется)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

## Текущая конфигурация

В файле `vercel.json` уже настроено:
- ✅ Framework: Next.js
- ✅ Build command
- ✅ Environment variables
- ✅ Git deployment для main ветки

## Как это работает

```
GitHub (push) → Webhook → Vercel → Build & Deploy → Live
```

Когда вы делаете `git push` в основную ветку:
1. GitHub отправляет webhook в Vercel
2. Vercel автоматически клонирует репозиторий
3. Запускает `npm install` и `npm run build`
4. Развертывает приложение на CDN
5. Обновляет preview URL

## Полезные ссылки

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js на Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Deployments](https://vercel.com/docs/deployments/overview)

## Отключение автодеплоя (если нужно)

В Vercel Dashboard:
1. **Settings** → **Git** → **Production Deployments**
2. Отключить нужную ветку
