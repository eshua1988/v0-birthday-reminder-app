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
import { requestFirebaseNotificationPermission } from "@/lib/firebase"
import { getFirebaseVapidKey } from "@/app/actions/firebase-config"
import { Bell, BellOff, CheckCircle2, XCircle, AlertCircle, Info, Plus, X, Languages, Moon, Sun, Clock } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { BackupManager } from "@/components/backup-manager"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useTheme } from "next-themes"

const supabase = createClient()

const APP_VERSION = "0.1.0"
const LAST_UPDATED = "2025-12-22"

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
    // Get current time as default
    const now = new Date()
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
  })
  const [defaultNotificationTimes, setDefaultNotificationTimes] = useState<string[]>(() => {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
    return [currentTime]
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isLoadingTheme, setIsLoadingTheme] = useState(false)
  const [isLoadingTimezone, setIsLoadingTimezone] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(checkNotificationSupport())
  const [firebaseConfigured, setFirebaseConfigured] = useState(false)
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false)
  const [cronTestResult, setCronTestResult] = useState<any>(null)
  const [isLoadingCronTest, setIsLoadingCronTest] = useState(false)
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null)
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false)
  const [diagnosticFilter, setDiagnosticFilter] = useState<'all' | 'today' | 'willFire'>('today')

  useEffect(() => {
    loadSettings()
    checkFirebaseConfiguration()
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
        description: t.notificationsEnabledDescription,
      })

      if (firebaseConfigured) {
        try {
          const vapidKey = await getFirebaseVapidKey()

          if (vapidKey) {
            const token = await requestFirebaseNotificationPermission(vapidKey)
            if (token) {
              setFcmToken(token)
              toast({
                title: t.fcmConnectedTitle,
                description: t.fcmConnectedDescription,
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
      title: t.sendTestNotification,
      description: t.checkYourDevices,
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
          title: t.error,
          description: "Требуется авторизация",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/send-test-notification", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: t.success,
          description: data.message || "Тестовое уведомление отправлено",
        })
      } else {
        toast({
          title: t.error,
          description: data.error || "Не удалось отправить уведомление",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error sending test notification:", error)
      toast({
        title: t.error,
        description: t.failedToSaveSettings,
        variant: "destructive",
      })
    } finally {
      setIsSendingTestNotification(false)
    }
  }

  const handleTestCron = async () => {
    setIsLoadingCronTest(true)
    try {
      const response = await fetch("/api/test-cron-now")
      const data = await response.json()
      setCronTestResult(data)
      console.log("[v0] Cron test result:", data)
    } catch (error) {
      console.error("[v0] Test error:", error)
      setCronTestResult({ error: String(error) })
      toast({
        title: t.error,
        description: "Ошибка тестирования",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCronTest(false)
    }
  }

  const loadDiagnosticInfo = async () => {
    setIsLoadingDiagnostic(true)
    try {
      const response = await fetch("/api/firebase-diagnostic")
      if (response.ok) {
        const data = await response.json()
        setDiagnosticInfo(data)
      } else {
        console.error("Failed to load diagnostic info")
      }
    } catch (error) {
      console.error("Error loading diagnostic info:", error)
    } finally {
      setIsLoadingDiagnostic(false)
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
            setDefaultNotificationTimes(times)
            setDefaultNotificationTime(times[0])
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

      const timesValue = JSON.stringify(defaultNotificationTimes)

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

  const handleCopyFcmToken = async () => {
    if (fcmToken) {
      try {
        await navigator.clipboard.writeText(fcmToken)
        toast({
          title: t.tokenCopied,
          description: t.fcmTokenCopiedDescription,
        })
      } catch (error) {
        console.error("[v0] Error copying token:", error)
        toast({
          title: "Ошибка",
          description: t.failedToCopyToken || "Не удалось скопировать токен",
          variant: "destructive",
        })
      }
    }
  }

  const addDefaultNotificationTime = () => {
    if (defaultNotificationTimes.length < 5) {
      setDefaultNotificationTimes([...defaultNotificationTimes, "09:00:00"])
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

  const updateDefaultNotificationTime = (index: number, time: string) => {
    const newTimes = [...defaultNotificationTimes]
    newTimes[index] = time
    setDefaultNotificationTimes(newTimes)
    if (index === 0) {
      setDefaultNotificationTime(time)
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
                  <CardTitle>{t.notificationStatus}</CardTitle>
                  <CardDescription>{t.notificationStatusDescription}</CardDescription>
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
                    <p className="text-sm font-medium">{t.browserNotifications}</p>
                    <p className="text-xs text-muted-foreground">
                      {browserPermission.supported && browserPermission.granted
                        ? t.allowed
                        : browserPermission.denied
                          ? t.blocked
                          : t.notConfigured}
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
                    <p className="text-sm font-medium">{t.firebaseCloudMessaging}</p>
                    <p className="text-xs text-muted-foreground">
                      {firebaseConfigured ? t.configured : t.notConfiguredOptional}
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

                {fcmToken && (
                  <div className="space-y-2">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>{t.fcmTokenSuccess}</AlertTitle>
                      <AlertDescription>{t.fcmTokenSuccessDescription}</AlertDescription>
                    </Alert>
                    <div className="rounded-lg border p-3 bg-muted/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium mb-1">{t.fcmTokenForMobile}</p>
                          <p className="text-xs font-mono break-all text-muted-foreground">{fcmToken}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCopyFcmToken} className="shrink-0">
                          {t.copyToken}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.fcmTokenForMobile} {t.seeDocumentation}
                    </p>
                  </div>
                )}
              </div>

              {!firebaseConfigured && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                        <Bell className="inline h-4 w-4 mr-2" />
                        {t.firebaseAdvancedFeatures}
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
                  <Button variant="outline" onClick={handleTestNotification}>
                    {t.sendTestNotification}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {browserPermission.granted && (
            <Card>
              <CardHeader>
                <CardTitle>{t.firebasePushNotifications}</CardTitle>
                <CardDescription>{t.testingServerPush}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fcmToken ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                    <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                      <Bell className="inline h-4 w-4 mr-2" />
                      {t.firebaseConfiguredReady}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSendTestFirebaseNotification}
                        disabled={isSendingTestNotification}
                      >
                        {isSendingTestNotification ? "Отправка..." : t.sendTestFirebaseNotification}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={loadDiagnosticInfo}
                        disabled={isLoadingDiagnostic}
                      >
                        {isLoadingDiagnostic ? "Загрузка..." : "Показать диагностику"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                      <Info className="inline h-4 w-4 mr-2" />
                      Firebase токен не получен. Нажмите кнопку ниже для регистрации.
                    </p>
                    <Button 
                      variant="default" 
                      onClick={async () => {
                        await handleRequestPermission()
                        await loadDiagnosticInfo()
                      }}
                      disabled={isLoadingDiagnostic}
                    >
                      {isLoadingDiagnostic ? "Загрузка..." : "Получить Firebase токен"}
                    </Button>
                  </div>
                )}

                {diagnosticInfo && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border bg-card p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Диагностическая информация
                      </h3>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-muted-foreground">Текущее серверное время:</span>
                          <span className="font-mono font-semibold">{diagnosticInfo.serverTime}</span>
                        </div>

                        <div className={cn(
                          "flex items-center justify-between p-2 rounded",
                          diagnosticInfo.hasFCMTokens 
                            ? "bg-green-50 dark:bg-green-950" 
                            : "bg-red-50 dark:bg-red-950"
                        )}>
                          <span className={cn(
                            "text-sm",
                            diagnosticInfo.hasFCMTokens 
                              ? "text-green-800 dark:text-green-200" 
                              : "text-red-800 dark:text-red-200"
                          )}>
                            {diagnosticInfo.hasFCMTokens 
                              ? `✓ FCM токены активны (${diagnosticInfo.fcmTokenCount})` 
                              : "⚠️ FCM токены отсутствуют - уведомления не будут отправляться!"}
                          </span>
                        </div>

                        <Alert className="mb-4">
                          <Info className="h-4 w-4" />
                          <AlertTitle>Важно: Cron запускается каждую минуту</AlertTitle>
                          <AlertDescription>
                            Уведомления отправляются автоматически каждую минуту через Vercel Cron. 
                            Если время совпадает и есть FCM токены, уведомление будет отправлено.
                          </AlertDescription>
                        </Alert>

                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">
                              Фильтр именинников
                            </h4>
                            <ToggleGroup type="single" value={diagnosticFilter} onValueChange={(value) => value && setDiagnosticFilter(value as 'all' | 'today' | 'willFire')}>
                              <ToggleGroupItem value="all" aria-label="Все" className="text-xs px-3">
                                Все ({diagnosticInfo.totalBirthdays})
                              </ToggleGroupItem>
                              <ToggleGroupItem value="today" aria-label="Сегодня" className="text-xs px-3">
                                Сегодня ({diagnosticInfo.todayBirthdays})
                              </ToggleGroupItem>
                              <ToggleGroupItem value="willFire" aria-label="Сработает" className="text-xs px-3">
                                Сработает ({diagnosticInfo.willFireNow})
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                          
                          {(() => {
                            const filteredBirthdays = diagnosticInfo.birthdays.filter((birthday: any) => {
                              if (diagnosticFilter === 'today') return birthday.isBirthdayToday
                              if (diagnosticFilter === 'willFire') return birthday.shouldFireNow
                              return true // 'all'
                            })
                            
                            return filteredBirthdays.length > 0 ? (
                            <div className="space-y-2">
                              {filteredBirthdays.map((birthday: any) => (
                                <div 
                                  key={birthday.id} 
                                  className="border rounded p-3 space-y-2 bg-background"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{birthday.name}</span>
                                      {birthday.isBirthdayToday && (
                                        <Badge variant="secondary" className="text-xs">
                                          🎂 Сегодня
                                        </Badge>
                                      )}
                                    </div>
                                    {birthday.shouldFireNow && (
                                      <Badge className="bg-green-500 hover:bg-green-600">
                                        Сработает! ✓
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Часовой пояс:</span>
                                      <span className="font-mono">{birthday.timezone}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Текущее время:</span>
                                      <span className="font-mono font-semibold">{birthday.currentTimeInTZ}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Времена уведомлений:</span>
                                      <span className={cn("font-mono", birthday.notificationTimes.length === 0 && "text-yellow-600")}>
                                        {birthday.notificationTimes.length > 0 
                                          ? birthday.notificationTimes.join(", ")
                                          : "⚠️ Не настроено"}
                                      </span>
                                    </div>
                                    {birthday.isBirthdayToday && !birthday.shouldFireNow && birthday.notificationTimes.length > 0 && (
                                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded text-yellow-800 dark:text-yellow-200">
                                        <span className="font-medium">ℹ️ Не сработает сейчас:</span>
                                        <br />
                                        Текущее время {birthday.currentTimeInTZ.substring(0, 5)} не совпадает с временами уведомлений: {birthday.notificationTimes.join(", ")}
                                      </div>
                                    )}
                                    {birthday.isBirthdayToday && birthday.notificationTimes.length === 0 && (
                                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-red-800 dark:text-red-200">
                                        <span className="font-medium">⚠️ Уведомления не настроены!</span>
                                        <br />
                                        Добавьте время уведомления в настройках или для этого именинника.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm mt-2">
                              {diagnosticFilter === 'today' && 'Сегодня нет именинников'}
                              {diagnosticFilter === 'willFire' && 'Сейчас нет уведомлений, которые сработают'}
                              {diagnosticFilter === 'all' && 'Нет именинников с включенными уведомлениями'}
                            </p>
                          )
                          })()}
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadDiagnosticInfo}
                        disabled={isLoadingDiagnostic}
                        className="mt-4"
                      >
                        {isLoadingDiagnostic ? "Обновление..." : "Обновить"}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Тестовое уведомление будет отправлено через Firebase Cloud Messaging и придет даже если приложение
                  закрыто
                </p>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleTestCron}
                    disabled={isLoadingCronTest}
                    className="w-full"
                  >
                    {isLoadingCronTest ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Проверка...
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Проверить логику уведомлений сейчас
                      </>
                    )}
                  </Button>

                  {cronTestResult && (
                    <div className="mt-4 space-y-3">
                      {cronTestResult.error ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Ошибка</AlertTitle>
                          <AlertDescription className="text-xs">{cronTestResult.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div className="p-3 border rounded bg-muted/50">
                            <p className="text-xs font-medium mb-2">Серверное время</p>
                            <p className="text-sm"><code className="font-bold">{cronTestResult.server_time?.formatted}</code></p>
                            <p className="text-xs text-muted-foreground">{cronTestResult.server_time?.iso}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 border rounded">
                              <div className="text-lg font-bold">{cronTestResult.total_birthdays}</div>
                              <p className="text-xs text-muted-foreground">Всего</p>
                            </div>
                            <div className="p-2 border rounded">
                              <div className="text-lg font-bold">{cronTestResult.birthdays_today}</div>
                              <p className="text-xs text-muted-foreground">Сегодня</p>
                            </div>
                            <div className="p-2 border rounded bg-green-50 dark:bg-green-950">
                              <div className="text-lg font-bold text-green-600">{cronTestResult.should_notify_now}</div>
                              <p className="text-xs text-muted-foreground">Сработает</p>
                            </div>
                          </div>

                          {cronTestResult.results && cronTestResult.results.length > 0 && (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {cronTestResult.results.map((birthday: any, idx: number) => (
                                <div 
                                  key={idx}
                                  className={`p-3 border rounded text-xs space-y-2 ${
                                    birthday.should_notify_now ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium">{birthday.name}</p>
                                    {birthday.should_notify_now && (
                                      <Badge className="bg-green-500 text-xs">Сработает!</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Timezone:</span>
                                      <br />
                                      <code className="text-xs">{birthday.timezone}</code>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Время:</span>
                                      <br />
                                      <code className="text-xs font-bold">{birthday.user_current_time}</code>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-muted-foreground">Времена уведомлений:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {birthday.all_notification_times?.length === 0 ? (
                                        <Badge variant="outline" className="text-xs text-yellow-600">Не установлены</Badge>
                                      ) : (
                                        birthday.all_notification_times?.map((time: string, tidx: number) => (
                                          <Badge 
                                            key={tidx}
                                            variant={time === birthday.user_current_time ? "default" : "outline"}
                                            className={`text-xs ${time === birthday.user_current_time ? "bg-green-500" : ""}`}
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
                        </>
                      )}
                    </div>
                  )}
                </div>
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
                <div className="flex items-center justify-between">
                  <Label>{t.notificationTime}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addDefaultNotificationTime}
                    disabled={!notificationsEnabled || defaultNotificationTimes.length >= 5}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t.addNotificationTime}
                  </Button>
                </div>

                <div className="space-y-2">
                  {defaultNotificationTimes.map((time, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        type="time"
                        step="1"
                        value={time}
                        onChange={(e) => updateDefaultNotificationTime(index, e.target.value)}
                        disabled={!notificationsEnabled}
                        className={cn(!notificationsEnabled && "opacity-50 cursor-not-allowed")}
                      />
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
