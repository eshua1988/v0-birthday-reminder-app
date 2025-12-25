"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { checkNotificationSupport, requestNotificationPermission, sendNotification } from "@/lib/notifications"
import { requestFirebaseNotificationPermission } from "@/lib/firebase"
import { getFirebaseVapidKey } from "@/app/actions/firebase-config"
import { Bell, BellOff, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { BackupManager } from "@/components/backup-manager"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const supabase = createClient()

const APP_VERSION = "0.1.0"
const LAST_UPDATED = "2025-12-22"

export default function SettingsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [defaultNotificationTime, setDefaultNotificationTime] = useState("09:00")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(checkNotificationSupport())
  const [firebaseConfigured, setFirebaseConfigured] = useState(false)
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false)

  useEffect(() => {
    loadSettings()
    checkFirebaseConfiguration()
    setBrowserPermission(checkNotificationSupport())
  }, [])

  const checkFirebaseConfiguration = () => {
    const hasFirebaseConfig =
      !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID

    setFirebaseConfigured(hasFirebaseConfig)
    console.log("[v0] Firebase configured:", hasFirebaseConfig)
  }

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setBrowserPermission(checkNotificationSupport())

    if (granted) {
      toast({
        title: t.notificationsAllowed,
        description: "Теперь вы будете получать напоминания о днях рождения",
      })

      if (firebaseConfigured) {
        try {
          const vapidKey = await getFirebaseVapidKey()

          if (vapidKey) {
            const token = await requestFirebaseNotificationPermission(vapidKey)
            if (token) {
              setFcmToken(token)
              toast({
                title: "Firebase подключен",
                description: "Push-уведомления будут работать даже когда приложение закрыто",
              })
            }
          } else {
            console.log("[v0] VAPID key not configured")
          }
        } catch (error) {
          console.error("[v0] Error getting FCM token:", error)
        }
      }

      sendNotification("🎉 Уведомления включены!", {
        body: "Вы будете получать напоминания о днях рождения",
      })
    } else {
      toast({
        title: t.notificationsBlocked,
        description: "Пожалуйста, разрешите уведомления в настройках браузера",
        variant: "destructive",
      })
    }
  }

  const handleTestNotification = () => {
    sendNotification("🎂 Тестовое уведомление", {
      body: "Так будут выглядеть напоминания о днях рождения",
    })

    toast({
      title: "Тестовое уведомление отправлено",
      description: "Проверьте уведомления вашего устройства",
    })
  }

  const handleSendTestFirebaseNotification = async () => {
    setIsSendingTestNotification(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Ошибка",
          description: "Вы не авторизованы",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/send-test-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Тестовое уведомление отправлено",
          description: data.message || "Проверьте ваши устройства",
        })
      } else {
        toast({
          title: "Ошибка",
          description: data.error || "Не удалось отправить уведомление",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error sending test notification:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось отправить тестовое уведомление",
        variant: "destructive",
      })
    } finally {
      setIsSendingTestNotification(false)
    }
  }

  const loadSettings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: timeData } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("key", "default_notification_time")
      .maybeSingle()

    if (timeData) {
      setDefaultNotificationTime(timeData.value)
    }

    const { data: enabledData } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("key", "notifications_enabled")
      .maybeSingle()

    if (enabledData) {
      setNotificationsEnabled(enabledData.value === "true")
    }

    const { data: browserNotifData } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("key", "browser_notifications_enabled")
      .maybeSingle()

    if (browserNotifData) {
      setBrowserNotificationsEnabled(browserNotifData.value === "true")
    }
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      console.log("[v0] Saving settings:", {
        defaultNotificationTime,
        notificationsEnabled,
        browserNotificationsEnabled,
      })

      // Save default notification time
      const { data: existingTime, error: checkTimeError } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", user.id)
        .eq("key", "default_notification_time")
        .maybeSingle()

      if (checkTimeError) {
        console.error("[v0] Error checking existing time setting:", checkTimeError)
        throw checkTimeError
      }

      if (existingTime) {
        const { error: updateTimeError } = await supabase
          .from("settings")
          .update({ value: defaultNotificationTime, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("key", "default_notification_time")

        if (updateTimeError) {
          console.error("[v0] Error updating time:", updateTimeError)
          throw updateTimeError
        }
      } else {
        const { error: insertTimeError } = await supabase.from("settings").insert({
          user_id: user.id,
          key: "default_notification_time",
          value: defaultNotificationTime,
        })

        if (insertTimeError) {
          console.error("[v0] Error inserting time:", insertTimeError)
          throw insertTimeError
        }
      }

      // Save notifications enabled
      const { data: existingEnabled, error: checkEnabledError } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", user.id)
        .eq("key", "notifications_enabled")
        .maybeSingle()

      if (checkEnabledError) {
        console.error("[v0] Error checking existing enabled setting:", checkEnabledError)
        throw checkEnabledError
      }

      if (existingEnabled) {
        const { error: updateEnabledError } = await supabase
          .from("settings")
          .update({ value: notificationsEnabled ? "true" : "false", updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("key", "notifications_enabled")

        if (updateEnabledError) {
          console.error("[v0] Error updating notifications_enabled:", updateEnabledError)
          throw updateEnabledError
        }
      } else {
        const { error: insertEnabledError } = await supabase.from("settings").insert({
          user_id: user.id,
          key: "notifications_enabled",
          value: notificationsEnabled ? "true" : "false",
        })

        if (insertEnabledError) {
          console.error("[v0] Error inserting notifications_enabled:", insertEnabledError)
          throw insertEnabledError
        }
      }

      // Save browser notifications enabled
      const { data: existingBrowser, error: checkBrowserError } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", user.id)
        .eq("key", "browser_notifications_enabled")
        .maybeSingle()

      if (checkBrowserError) {
        console.error("[v0] Error checking existing browser setting:", checkBrowserError)
        throw checkBrowserError
      }

      if (existingBrowser) {
        const { error: updateBrowserError } = await supabase
          .from("settings")
          .update({ value: browserNotificationsEnabled ? "true" : "false", updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("key", "browser_notifications_enabled")

        if (updateBrowserError) {
          console.error("[v0] Error updating browser_notifications_enabled:", updateBrowserError)
          throw updateBrowserError
        }
      } else {
        const { error: insertBrowserError } = await supabase.from("settings").insert({
          user_id: user.id,
          key: "browser_notifications_enabled",
          value: browserNotificationsEnabled ? "true" : "false",
        })

        if (insertBrowserError) {
          console.error("[v0] Error inserting browser_notifications_enabled:", insertBrowserError)
          throw insertBrowserError
        }
      }

      console.log("[v0] Settings saved successfully")

      toast({
        title: t.settingsSaved,
        description: t.notificationTimeUpdated,
      })
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast({
        title: t.error,
        description: t.failedToSaveSettings,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrowserNotificationsToggle = async (enabled: boolean) => {
    setBrowserNotificationsEnabled(enabled)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Save to database
      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key: "browser_notifications_enabled",
          value: enabled ? "true" : "false",
        },
        { onConflict: "user_id,key" },
      )

      if (enabled) {
        // If enabling, request permission
        const granted = await requestNotificationPermission()
        setBrowserPermission(checkNotificationSupport())

        if (granted) {
          toast({
            title: t.notificationsAllowed,
            description: "Теперь вы будете получать напоминания о днях рождения",
          })

          // Try to initialize Firebase
          if (firebaseConfigured) {
            try {
              const vapidKey = await getFirebaseVapidKey()
              if (vapidKey) {
                const token = await requestFirebaseNotificationPermission(vapidKey)
                if (token) {
                  setFcmToken(token)
                }
              }
            } catch (error) {
              console.error("[v0] Error getting FCM token:", error)
            }
          }
        } else {
          // If permission denied, disable the toggle
          setBrowserNotificationsEnabled(false)
          await supabase.from("settings").upsert(
            {
              user_id: user.id,
              key: "browser_notifications_enabled",
              value: "false",
            },
            { onConflict: "user_id,key" },
          )

          toast({
            title: t.notificationsBlocked,
            description: "Пожалуйста, разрешите уведомления в настройках браузера",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Уведомления отключены",
          description: "Вы не будете получать напоминания о днях рождения",
        })
      }
    } catch (error) {
      console.error("[v0] Error toggling browser notifications:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось изменить настройки уведомлений",
        variant: "destructive",
      })
    }
  }

  const handleCopyFcmToken = async () => {
    if (fcmToken) {
      try {
        await navigator.clipboard.writeText(fcmToken)
        toast({
          title: "Токен скопирован",
          description: "FCM токен скопирован в буфер обмена",
        })
      } catch (error) {
        console.error("[v0] Error copying token:", error)
        toast({
          title: "Ошибка",
          description: "Не удалось скопировать токен",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className={cn("flex-1", isMobile ? "p-4 pt-20" : "p-8 ml-16 pt-8 md:ml-16")}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>{t.settings}</h1>
            <p className="text-muted-foreground mt-1">{t.settingsDescription}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Статус уведомлений</CardTitle>
              <CardDescription>Проверка конфигурации системы уведомлений</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {browserPermission.supported && browserPermission.granted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Браузерные уведомления</p>
                    <p className="text-xs text-muted-foreground">
                      {browserPermission.supported && browserPermission.granted
                        ? "Разрешены"
                        : browserPermission.denied
                          ? "Заблокированы"
                          : "Не настроены"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {firebaseConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Firebase Cloud Messaging</p>
                    <p className="text-xs text-muted-foreground">
                      {firebaseConfigured ? "Настроен" : "Не настроен (опционально)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Firebase Cloud Messaging Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">{t.firebaseCloudMessaging}</h3>
                  <p className="text-sm text-muted-foreground">{t.firebaseAdvancedFeatures}</p>
                </div>

                {!fcmToken && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Требуется разрешение на уведомления</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-sm">
                        Для получения push-уведомлений на телефон необходимо разрешить уведомления в браузере.
                      </p>
                      <div className="text-sm space-y-2 mt-3">
                        <p className="font-semibold">Инструкция для Android (Chrome):</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Нажмите на значок замка слева от адресной строки</li>
                          <li>Найдите "Уведомления" или "Notifications"</li>
                          <li>Выберите "Разрешить" (Allow)</li>
                          <li>Обновите страницу</li>
                        </ol>
                        <p className="font-semibold mt-3">Альтернативный способ:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Откройте Настройки Chrome (три точки)</li>
                          <li>Перейдите в "Настройки сайтов" → "Уведомления"</li>
                          <li>Найдите этот сайт и переключите на "Разрешить"</li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {fcmToken && (
                  <div className="space-y-2">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>FCM Токен успешно получен!</AlertTitle>
                      <AlertDescription>Ваше устройство готово к получению push-уведомлений.</AlertDescription>
                    </Alert>
                    <div className="rounded-lg border p-3 bg-muted/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium mb-1">FCM Token для мобильных уведомлений:</p>
                          <p className="text-xs font-mono break-all text-muted-foreground">{fcmToken}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCopyFcmToken} className="shrink-0">
                          Копировать
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Этот токен используется для отправки push-уведомлений на ваше устройство. См. MOBILE_FCM_SETUP.md
                      для инструкций.
                    </p>
                  </div>
                )}
              </div>

              {!firebaseConfigured && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <Bell className="inline h-4 w-4 mr-2" />
                    Для расширенных функций push-уведомлений настройте Firebase Cloud Messaging. См. FIREBASE_SETUP.md
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.browserPermissions}</CardTitle>
              <CardDescription>{t.manageNotificationPermissions}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="browser_notifications" className="cursor-pointer font-medium">
                    Разрешения браузера на уведомления
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Автоматически запрашивать и управлять разрешениями на уведомления
                  </p>
                </div>
                <Switch
                  id="browser_notifications"
                  checked={browserNotificationsEnabled}
                  onCheckedChange={handleBrowserNotificationsToggle}
                />
              </div>

              {!browserPermission.supported && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <BellOff className="inline h-4 w-4 mr-2" />
                    {t.browserNotSupported}
                  </p>
                </div>
              )}

              {browserPermission.supported && browserPermission.denied && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <BellOff className="inline h-4 w-4 mr-2" />
                    {t.notificationsBlocked}
                  </p>
                </div>
              )}

              {browserPermission.supported && browserPermission.granted && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                    <Bell className="inline h-4 w-4 mr-2" />
                    {t.notificationsAllowed}
                  </p>
                  <Button variant="outline" onClick={handleTestNotification}>
                    {t.sendTestNotification}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {firebaseConfigured && browserPermission.granted && fcmToken && (
            <Card>
              <CardHeader>
                <CardTitle>{t.firebasePushNotifications}</CardTitle>
                <CardDescription>{t.testingServerPush}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                    <Bell className="inline h-4 w-4 mr-2" />
                    {t.firebaseConfiguredReady}
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleSendTestFirebaseNotification}
                    disabled={isSendingTestNotification}
                  >
                    {isSendingTestNotification ? "Отправка..." : t.sendTestFirebaseNotification}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Тестовое уведомление будет отправлено через Firebase Cloud Messaging и придет даже если приложение
                  закрыто
                </p>
              </CardContent>
            </Card>
          )}

          <BackupManager />

          <Card>
            <CardHeader>
              <CardTitle>Оповещения</CardTitle>
              <CardDescription>Настройте время оповещения о днях рождения</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications_enabled" className="cursor-pointer font-medium">
                    Включить все оповещения
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Глобальное включение/отключение всех напоминаний о днях рождения
                  </p>
                </div>
                <Switch
                  id="notifications_enabled"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_time">Время оповещения по умолчанию</Label>
                <Input
                  id="default_time"
                  type="time"
                  value={defaultNotificationTime}
                  onChange={(e) => setDefaultNotificationTime(e.target.value)}
                  disabled={!notificationsEnabled}
                  className={cn(!notificationsEnabled && "opacity-50 cursor-not-allowed")}
                />
                <p className="text-sm text-muted-foreground">
                  Это время будет использоваться для всех новых записей. Для каждого именинника можно установить
                  индивидуальное время при добавлении или редактировании.
                </p>
              </div>

              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? "Сохранение..." : "Сохранить настройки"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t.appVersion}
              </CardTitle>
              <CardDescription>{t.appVersionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">{t.currentVersion}</p>
                  <p className="text-2xl font-bold">v{APP_VERSION}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-1">{t.lastUpdated}</p>
                  <p className="text-lg font-semibold">{LAST_UPDATED}</p>
                </div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <Info className="inline h-4 w-4 mr-2" />
                  {t.appName} - Birthday Reminder App with Firebase Cloud Messaging
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
