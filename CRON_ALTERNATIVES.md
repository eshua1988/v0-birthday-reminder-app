# Альтернативы Vercel Cron для уведомлений о днях рождения

## Проблема

Бесплатный план Vercel (Hobby) позволяет создать только 2 cron jobs, и если вы уже используете этот лимит, деплой проекта завершится ошибкой.

## Решения

### 1. Клиентские уведомления (Реализовано)

Приложение автоматически проверяет дни рождения при каждом открытии и показывает браузерные уведомления для именинников сегодняшнего дня. Это работает без серверных cron jobs.

**Как работает:**
- Компонент `NotificationManager` проверяет дни рождения при загрузке приложения
- Если сегодня чей-то день рождения, показывается браузерное уведомление
- Работает только когда пользователь открывает приложение

**Ограничения:**
- Требует чтобы пользователь открыл приложение
- Работает только при наличии разрешений браузера на уведомления

### 2. Внешние Cron сервисы (Рекомендуется для автоматических уведомлений)

Используйте бесплатные внешние cron сервисы для вызова API endpoint:

#### EasyCron (https://www.easycron.com)
- **Бесплатно:** До 1 cron job
- **Минимальный интервал:** 1 час
- **Настройка:**
  1. Зарегистрируйтесь на EasyCron
  2. Создайте новый cron job с URL: `https://ваш-домен.vercel.app/api/cron/check-birthdays`
  3. Установите расписание: `0 9 * * *` (каждый день в 9:00)
  4. Добавьте заголовок `Authorization: Bearer ${CRON_SECRET}` если настроена аутентификация

#### Cron-job.org (https://cron-job.org)
- **Бесплатно:** До 3 cron jobs
- **Минимальный интервал:** 1 минута
- **Настройка:** аналогично EasyCron

#### GitHub Actions (Бесплатно для публичных репозиториев)
```yaml
# .github/workflows/birthday-notifications.yml
name: Birthday Notifications
on:
  schedule:
    - cron: '0 9 * * *' # Каждый день в 9:00 UTC
  workflow_dispatch: # Ручной запуск

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cron Endpoint
        run: |
          curl -X GET "https://ваш-домен.vercel.app/api/cron/check-birthdays" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 3. Upgrade Vercel Plan

Если вам нужны серверные cron jobs:
- **Pro Plan ($20/мес):** Unlimited cron jobs
- **Ссылка:** https://vercel.com/pricing

### 4. Firebase Cloud Functions (Альтернативная платформа)

Используйте Firebase Scheduled Functions (бесплатно до определенного лимита):
```typescript
import { onSchedule } from "firebase-functions/v2/scheduler";

export const checkBirthdays = onSchedule("0 9 * * *", async (event) => {
  // Логика проверки дней рождения
});
```

## Рекомендация

Для большинства пользователей **комбинация клиентских уведомлений + внешний cron сервис** будет оптимальным решением:
- Клиентские уведомления работают когда пользователь в приложении
- Внешний cron для Firebase push-уведомлений когда пользователь не в приложении

## Безопасность

Если используете внешний cron сервис, обязательно защитите API endpoint:

1. Добавьте `CRON_SECRET` в переменные окружения Vercel
2. Проверяйте секрет в `/api/cron/check-birthdays/route.ts`:

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Логика проверки дней рождения
}
