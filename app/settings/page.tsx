"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { checkNotificationSupport, requestNotificationPermission, sendNotification } from "@/lib/notifications"
import { Bell, BellOff, AlertCircle, Info, Plus, X, Languages, Moon, Sun, Clock } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { BackupManager } from "@/components/backup-manager"
import { useTheme } from "next-themes"

const supabase = createClient()

export default function SettingsPage() {
  const { t, setLocale, locale } = useLocale()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system' | 'scheduled'>('system')
  const [scheduledThemeStart, setScheduledThemeStart] = useState('18:00')
  const [scheduledThemeEnd, setScheduledThemeEnd] = useState('08:00')
  
  const languages: { value: Locale; label: string; flag: string }[] = [
    { value: "ru", label: "Русский", flag: "🇷🇺" },
    { value: "pl", label: "Polski", flag: "🇵🇱" },
    { value: "uk", label: "Українська", flag: "🇺🇦" },
    { value: "en", label: "English", flag: "🇬🇧" },
  ]

  const currentLanguage = languages.find((lang) => lang.value === locale)
  const [defaultNotificationTime, setDefaultNotificationTime] = useState(() => {
    // Текущее время по умолчанию (только часы)
    const now = new Date()
    return now.getHours().toString().padStart(2, "0")
  })
  const [defaultNotificationTimes, setDefaultNotificationTimes] = useState<string[]>(() => {
    const now = new Date()
    const currentHour = now.getHours().toString().padStart(2, "0")
    return [currentHour]
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isLoadingTheme, setIsLoadingTheme] = useState(false)
  const [isLoadingTimezone, setIsLoadingTimezone] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(checkNotificationSupport())

  useEffect(() => {
    loadSettings()
    setBrowserPermission(checkNotificationSupport())
  }, [])

  const applyScheduledTheme = useCallback(() => {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const [startHour, startMin] = scheduledThemeStart.split(':').map(Number)
    const [endHour, endMin] = scheduledThemeEnd.split(':').map(Number)
    const [currentHour, currentMin] = currentTime.split(':').map(Number)
    
    const currentMinutes = currentHour * 60 + currentMin
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    let isDarkTime = false
    if (startMinutes < endMinutes) {
      isDarkTime = currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      isDarkTime = currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    
    setTheme(isDarkTime ? 'dark' : 'light')
  }, [scheduledThemeStart, scheduledThemeEnd, setTheme])

  useEffect(() => {
    // Apply theme based on mode
    if (themeMode === 'scheduled') {
      applyScheduledTheme();
      const interval = setInterval(applyScheduledTheme, 60000); // Check every minute
      return () => clearInterval(interval);
    } else {
      setTheme(themeMode);
    }
  }, [themeMode, applyScheduledTheme, setTheme])

  // Auto-save theme settings when changed
  const saveThemeSettings = async (mode: 'light' | 'dark' | 'system' | 'scheduled') => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key: "theme_mode",
          value: mode,
        },
        { onConflict: "user_id,key" },
      )

      console.log("[v0] Theme mode saved:", mode)
    } catch (error) {
      console.error("[v0] Error saving theme mode:", error)
    }
  }

  const saveScheduledThemeTime = async (key: 'theme_scheduled_start' | 'theme_scheduled_end', value: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key,
          value,
        },
        { onConflict: "user_id,key" },
      )

      console.log("[v0] Scheduled theme time saved:", key, value)
    } catch (error) {
      console.error("[v0] Error saving scheduled theme time:", error)
    }
  }

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'system' | 'scheduled') => {
    setThemeMode(mode)
    saveThemeSettings(mode)
  }

  const handleScheduledThemeStartChange = (time: string) => {
    setScheduledThemeStart(time)
    saveScheduledThemeTime('theme_scheduled_start', time)
  }

  const handleScheduledThemeEndChange = (time: string) => {
    setScheduledThemeEnd(time)
    saveScheduledThemeTime('theme_scheduled_end', time)
  }

  const [isTestingFCM, setIsTestingFCM] = useState(false)
  const [fcmTestResult, setFcmTestResult] = useState<string | null>(null)
  const [fcmTokenCount, setFcmTokenCount] = useState<number>(0)

  const handleTestNotification = () => {
    sendNotification("🎂 Тестовое уведомление", {
      body: "Так будут выглядеть напоминания о днях рождения",
    })

    toast({
      title: t.sendTestNotification,
      description: t.checkYourDevices,
    })
  }

  const handleClearOldTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Удаляем все токены кроме самого нового
      const { data: tokens } = await supabase
        .from("fcm_tokens")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (tokens && tokens.length > 1) {
        // Оставляем только самый новый токен
        const tokensToDelete = tokens.slice(1).map((t: { token: string }) => t.token)
        await supabase
          .from("fcm_tokens")
          .delete()
          .in("token", tokensToDelete)
        
        toast({
          title: "Очищено",
          description: `Удалено ${tokensToDelete.length} старых токенов`,
        })
        setFcmTokenCount(1)
      } else {
        toast({
          title: "Нет старых токенов",
          description: "Только 1 активный токен",
        })
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleTestFCMNotification = async () => {
    setIsTestingFCM(true)
    setFcmTestResult(null)
    
    try {
      const response = await fetch('/api/send-test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const details = data.details || {}
        setFcmTestResult(`✅ Уведомление отправлено! 📱 Успешно: ${details.successCount || 0} ❌ Ошибок: ${details.failureCount || 0}`)
        setFcmTokenCount(details.totalTokens || 0)
        toast({
          title: "Успешно",
          description: data.message || "Push-уведомление отправлено через FCM",
        })
      } else {
        setFcmTestResult(`❌ ${data.error}: ${data.message || ''}`)
        toast({
          title: "Ошибка",
          description: data.message || data.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      setFcmTestResult(`❌ Ошибка: ${error.message}`)
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsTestingFCM(false)
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

    // Load settings
    if (user) {
      // Load default notification times from settings
      const { data: timesData } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "default_notification_times")
        .maybeSingle()

      if (timesData && timesData.value) {
        try {
          const times = JSON.parse(timesData.value)
          if (Array.isArray(times) && times.length > 0) {
            // Извлекаем только часы из строки "HH:00:00"
            const hours = times.map((t: string) => t.split(":")[0])
            setDefaultNotificationTimes(hours)
            setDefaultNotificationTime(hours[0])
          }
        } catch (e) {
          console.error("[v0] Error parsing default notification times:", e)
        }
      }

      // Load theme settings
      const { data: themeData } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "theme_mode")
        .maybeSingle()

      if (themeData && themeData.value) {
        setThemeMode(themeData.value as 'light' | 'dark' | 'system' | 'scheduled')
      }

      const { data: themeStartData } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "theme_scheduled_start")
        .maybeSingle()

      if (themeStartData && themeStartData.value) {
        setScheduledThemeStart(themeStartData.value)
      }

      const { data: themeEndData } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "theme_scheduled_end")
        .maybeSingle()

      if (themeEndData && themeEndData.value) {
        setScheduledThemeEnd(themeEndData.value)
      }
    }
  }

  const handleSaveSettings = async (e?: React.MouseEvent<HTMLButtonElement>, section?: 'notifications' | 'theme' | 'timezone') => {
    e?.preventDefault()
    e?.stopPropagation()
    
    // Set loading state based on section
    if (section === 'notifications') {
      setIsLoadingNotifications(true)
    } else if (section === 'theme') {
      setIsLoadingTheme(true)
    } else if (section === 'timezone') {
      setIsLoadingTimezone(true)
    }

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

      // Save default notification times array
      const { data: existingTimes, error: checkTimesError } = await supabase
        .from("settings")
        .select("id")
        .eq("user_id", user.id)
        .eq("key", "default_notification_times")
        .maybeSingle()

      if (checkTimesError) {
        console.error("[v0] Error checking existing times setting:", checkTimesError)
        throw checkTimesError
      }

      // Сохраняем только часы, но для обратной совместимости формируем строку "HH:00:00"
      const timesValue = JSON.stringify(defaultNotificationTimes.map((h) => `${h}:00:00`))

      if (existingTimes) {
        const { error: updateTimesError } = await supabase
          .from("settings")
          .update({ value: timesValue, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("key", "default_notification_times")

        if (updateTimesError) {
          console.error("[v0] Error updating times:", updateTimesError)
          throw updateTimesError
        }
      } else {
        const { error: insertTimesError } = await supabase.from("settings").insert({
          user_id: user.id,
          key: "default_notification_times",
          value: timesValue,
        })

        if (insertTimesError) {
          console.error("[v0] Error inserting times:", insertTimesError)
          throw insertTimesError
        }
      }

      // Save theme settings
      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key: "theme_mode",
          value: themeMode,
        },
        { onConflict: "user_id,key" },
      )

      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key: "theme_scheduled_start",
          value: scheduledThemeStart,
        },
        { onConflict: "user_id,key" },
      )

      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key: "theme_scheduled_end",
          value: scheduledThemeEnd,
        },
        { onConflict: "user_id,key" },
      )

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
      setIsLoadingNotifications(false)
      setIsLoadingTheme(false)
      setIsLoadingTimezone(false)
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
          title: t.notificationsBlocked,
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

  const addDefaultNotificationTime = () => {
    if (defaultNotificationTimes.length < 4) {
      setDefaultNotificationTimes([...defaultNotificationTimes, "09"])
    }
  }

  const removeDefaultNotificationTime = (index: number) => {
    if (defaultNotificationTimes.length > 1) {
      const newTimes = defaultNotificationTimes.filter((_, i) => i !== index)
      setDefaultNotificationTimes(newTimes)
      if (index === 0) {
        setDefaultNotificationTime(newTimes[0])
      }
    }
  }

  const updateDefaultNotificationTime = (index: number, hour: string) => {
    const newTimes = [...defaultNotificationTimes]
    newTimes[index] = hour
    setDefaultNotificationTimes(newTimes)
    if (index === 0) {
      setDefaultNotificationTime(hour)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className={cn("flex-1", isMobile ? "p-4 pt-20" : "p-8 pt-24 md:ml-16")}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>{t.settings}</h1>
              <p className="text-muted-foreground mt-1">{t.settingsDescription}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size={isMobile ? "icon" : "sm"} className="gap-2 bg-transparent h-9">
                  <Languages className="h-4 w-4" />
                  {!isMobile && <span>{currentLanguage?.label}</span>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang.value} onClick={() => setLocale(lang.value)} className="cursor-pointer">
                    <span className="mr-2 text-lg">{lang.flag}</span>
                    <span className="flex-1">{lang.label}</span>
                    {locale === lang.value && <span className="ml-2 text-xs">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.browserPermissions}</CardTitle>
              <CardDescription>{t.manageNotificationPermissions}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="browser_notifications" className="cursor-pointer font-medium">
                    {t.browserPermissions}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t.autoRequestPermissions}</p>
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
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="flex items-center justify-between">
                  <Label>{t.notificationTime}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addDefaultNotificationTime}
                    disabled={!notificationsEnabled || defaultNotificationTimes.length >= 4}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.addNotificationTime}
                  </Button>
                </div>

                <div className="flex flex-row flex-wrap gap-2 items-center">
                  {defaultNotificationTimes.map((hour, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={hour}
                        onChange={(e) => updateDefaultNotificationTime(index, e.target.value)}
                        disabled={!notificationsEnabled}
                        className={cn("border rounded px-2 py-1", !notificationsEnabled && "opacity-50 cursor-not-allowed")}
                      >
                        {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")).map((h) => (
                          <option key={h} value={h}>{h}:00</option>
                        ))}
                      </select>
                      {defaultNotificationTimes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDefaultNotificationTime(index)}
                          disabled={!notificationsEnabled}
                          className="h-10 w-10 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  {t.notificationTimeDescription} ({t.maxNotificationTimes})
                </p>
              </div>

              <Button type="button" onClick={(e) => handleSaveSettings(e, 'notifications')} disabled={isLoadingNotifications}>
                {isLoadingNotifications ? t.saving : t.saveSettings}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Тема оформления
              </CardTitle>
              <CardDescription>
                Выберите цветовую тему приложения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleThemeModeChange('light')}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      themeMode === 'light'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Sun className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Светлая</p>
                      <p className="text-xs text-muted-foreground">Всегда светлая тема</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeModeChange('dark')}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      themeMode === 'dark'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Moon className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Темная</p>
                      <p className="text-xs text-muted-foreground">Всегда темная тема</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeModeChange('system')}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      themeMode === 'system'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <AlertCircle className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">Системная</p>
                      <p className="text-xs text-muted-foreground">Как в системе</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeModeChange('scheduled')}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      themeMode === 'scheduled'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Clock className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">По времени</p>
                      <p className="text-xs text-muted-foreground">Автоматически</p>
                    </div>
                  </button>
                </div>

                {themeMode === 'scheduled' && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                    <div className="space-y-2">
                      <Label htmlFor="theme-start">
                        Темная тема с:
                      </Label>
                      <Input
                        id="theme-start"
                        type="time"
                        step="1"
                        value={scheduledThemeStart}
                        onChange={(e) => handleScheduledThemeStartChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="theme-end">
                        До:
                      </Label>
                      <Input
                        id="theme-end"
                        type="time"
                        step="1"
                        value={scheduledThemeEnd}
                        onChange={(e) => handleScheduledThemeEndChange(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Темная тема будет включаться автоматически в указанное время.
                      {scheduledThemeStart > scheduledThemeEnd && ' (через полночь)'}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                Настройки темы сохраняются автоматически
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  )
}
