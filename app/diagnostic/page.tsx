"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export default function DiagnosticPage() {
  const [status, setStatus] = useState({
    auth: false,
    notifications: false,
    serviceWorker: false,
    fcmToken: false,
    fcmTokenValue: "",
    firebaseConfigured: false,
  })

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const supabase = createClient()
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    const authStatus = !!user

    // Check notifications permission
    const notificationStatus = typeof Notification !== 'undefined' && Notification.permission === 'granted'

    // Check service worker
    let swStatus = false
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      swStatus = !!registration?.active
    }

    // Check FCM token in database
    let fcmStatus = false
    let fcmValue = ""
    if (user) {
      const { data: tokens } = await supabase
        .from("fcm_tokens")
        .select("token")
        .eq("user_id", user.id)
        .limit(1)
      
      if (tokens && tokens.length > 0) {
        fcmStatus = true
        fcmValue = tokens[0].token.substring(0, 20) + "..."
      }
    }

    // Check Firebase configured
    const firebaseStatus = !!(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    )

    setStatus({
      auth: authStatus,
      notifications: notificationStatus,
      serviceWorker: swStatus,
      fcmToken: fcmStatus,
      fcmTokenValue: fcmValue,
      firebaseConfigured: firebaseStatus,
    })
  }

  const StatusIcon = ({ ok }: { ok: boolean }) => 
    ok ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />

  const sendTest = async () => {
    try {
      const response = await fetch("/api/send-test-notification", {
        method: "POST",
      })
      const data = await response.json()
      alert(data.message || data.error)
    } catch (error) {
      alert("Ошибка отправки: " + error)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Диагностика Push уведомлений</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 border rounded">
            <StatusIcon ok={status.auth} />
            <div className="flex-1">
              <p className="font-medium">Авторизация</p>
              <p className="text-sm text-muted-foreground">
                {status.auth ? "Пользователь авторизован" : "Требуется авторизация"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded">
            <StatusIcon ok={status.notifications} />
            <div className="flex-1">
              <p className="font-medium">Разрешение на уведомления</p>
              <p className="text-sm text-muted-foreground">
                {status.notifications ? "Разрешено" : "Не разрешено"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded">
            <StatusIcon ok={status.serviceWorker} />
            <div className="flex-1">
              <p className="font-medium">Service Worker</p>
              <p className="text-sm text-muted-foreground">
                {status.serviceWorker ? "Активен" : "Не активен"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded">
            <StatusIcon ok={status.fcmToken} />
            <div className="flex-1">
              <p className="font-medium">FCM токен</p>
              <p className="text-sm text-muted-foreground">
                {status.fcmToken ? `Зарегистрирован: ${status.fcmTokenValue}` : "Не найден в базе данных"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 border rounded">
            <StatusIcon ok={status.firebaseConfigured} />
            <div className="flex-1">
              <p className="font-medium">Firebase Client настроен</p>
              <p className="text-sm text-muted-foreground">
                {status.firebaseConfigured ? "Переменные окружения установлены" : "Отсутствуют переменные"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={checkStatus} variant="outline">
              Обновить
            </Button>
            <Button onClick={sendTest} disabled={!status.fcmToken}>
              Отправить тест
            </Button>
          </div>

          {!status.fcmToken && status.notifications && (
            <div className="p-4 border border-yellow-500 rounded bg-yellow-50 dark:bg-yellow-950">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    FCM токен не зарегистрирован
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Откройте главную страницу приложения - токен зарегистрируется автоматически.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
