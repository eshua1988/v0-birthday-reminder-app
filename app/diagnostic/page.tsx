"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertCircle, Clock, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface NotificationTimeDiagnostic {
  id: number
  name: string
  birth_date: string
  notification_enabled: boolean
  user_id: string
  timezone: string
  current_time_in_user_tz: string
  notification_times: string[]
  will_notify_now: boolean
}

interface DiagnosticData {
  server_time: {
    iso: string
    formatted: string
    timezone: string
  }
  total_birthdays: number
  total_users_with_settings: number
  birthdays: NotificationTimeDiagnostic[]
  user_settings: any[]
}

export default function DiagnosticPage() {
  const [status, setStatus] = useState({
    auth: false,
    notifications: false,
    serviceWorker: false,
    fcmToken: false,
    fcmTokenValue: "",
    firebaseConfigured: false,
  })
  const [timeDiagnostic, setTimeDiagnostic] = useState<DiagnosticData | null>(null)
  const [loadingTimeDiagnostic, setLoadingTimeDiagnostic] = useState(false)

  useEffect(() => {
    checkStatus()
    loadTimeDiagnostic()
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

  const loadTimeDiagnostic = async () => {
    setLoadingTimeDiagnostic(true)
    try {
      const response = await fetch("/api/diagnostic/notification-times")
      if (response.ok) {
        const data = await response.json()
        setTimeDiagnostic(data)
      }
    } catch (error) {
      console.error("Failed to load time diagnostic:", error)
    } finally {
      setLoadingTimeDiagnostic(false)
    }
  }

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
    <div className="container max-w-4xl mx-auto p-8 space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Диагностика времени уведомлений
          </CardTitle>
          <CardDescription>
            Проверка правильности настройки времени и часовых поясов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadTimeDiagnostic} disabled={loadingTimeDiagnostic} variant="outline" size="sm">
            {loadingTimeDiagnostic ? "Загрузка..." : "Обновить"}
          </Button>

          {timeDiagnostic && (
            <>
              <div className="p-4 border rounded bg-muted/50">
                <h3 className="font-medium mb-2">Серверное время</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Время:</span> {timeDiagnostic.server_time.formatted}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Зона:</span> {timeDiagnostic.server_time.timezone}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">ISO:</span> {timeDiagnostic.server_time.iso}
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded bg-muted/50">
                <h3 className="font-medium mb-2">Статистика</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Всего дней рождений:</span> {timeDiagnostic.total_birthdays}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Пользователей с настройками:</span> {timeDiagnostic.total_users_with_settings}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Дни рождения с уведомлениями</h3>
                {timeDiagnostic.birthdays.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 border rounded">
                    Нет активных дней рождений с включенными уведомлениями
                  </p>
                ) : (
                  <div className="space-y-2">
                    {timeDiagnostic.birthdays.map((birthday) => (
                      <div key={birthday.id} className="p-4 border rounded space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{birthday.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {birthday.birth_date}
                            </p>
                          </div>
                          {birthday.will_notify_now && (
                            <Badge variant="default" className="bg-green-500">
                              Сработает сейчас!
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Часовой пояс:</span>
                            <br />
                            <code className="text-xs">{birthday.timezone}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Время в зоне пользователя:</span>
                            <br />
                            <code className="text-xs font-bold">{birthday.current_time_in_user_tz}</code>
                          </div>
                        </div>

                        <div>
                          <span className="text-sm text-muted-foreground">Времена уведомлений:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {birthday.notification_times.length === 0 ? (
                              <Badge variant="outline" className="text-yellow-600">
                                Не установлены
                              </Badge>
                            ) : (
                              birthday.notification_times.map((time, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant={time === birthday.current_time_in_user_tz ? "default" : "outline"}
                                  className={time === birthday.current_time_in_user_tz ? "bg-green-500" : ""}
                                >
                                  {time}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {timeDiagnostic.user_settings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Глобальные настройки пользователей</h3>
                  <div className="space-y-2">
                    {timeDiagnostic.user_settings.map((setting, idx) => (
                      <div key={idx} className="p-3 border rounded text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">User ID:</span>
                            <br />
                            <code className="text-xs">{setting.user_id.substring(0, 8)}...</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Timezone:</span>
                            <br />
                            <code className="text-xs">{setting.timezone}</code>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Глобальные времена уведомлений:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {setting.notification_times.length === 0 ? (
                                <Badge variant="outline" className="text-xs">Не установлены</Badge>
                              ) : (
                                setting.notification_times.map((time: string, tidx: number) => (
                                  <Badge key={tidx} variant="secondary" className="text-xs">
                                    {time}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
