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
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
  })
  const [defaultNotificationTimes, setDefaultNotificationTimes] = useState<string[]>(() => {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    return [currentTime]
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(checkNotificationSupport())
  const [firebaseConfigured, setFirebaseConfigured] = useState(false)
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false)
  const [timezone, setTimezone] = useState(() => {
    // Auto-detect timezone on initial load
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (e) {
      console.error("[v0] Error detecting timezone:", e)
      return "Europe/Warsaw"
    }
  })

  const timezones = [
    { value: "auto", label: "🌍 Автоматически (определить)", offset: "auto" },
    { value: "disabled", label: "❌ Отключить часовой пояс (UTC)", offset: "+00:00" },
    { value: "Europe/Warsaw", label: "Warsaw (UTC+1)", offset: "+01:00" },
    { value: "Europe/Moscow", label: "Moscow (UTC+3)", offset: "+03:00" },
    { value: "Europe/Kiev", label: "Kyiv (UTC+2)", offset: "+02:00" },
    { value: "Europe/London", label: "London (UTC+0)", offset: "+00:00" },
    { value: "Europe/Berlin", label: "Berlin (UTC+1)", offset: "+01:00" },
    { value: "Europe/Paris", label: "Paris (UTC+1)", offset: "+01:00" },
    { value: "America/New_York", label: "New York (UTC-5)", offset: "-05:00" },
    { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)", offset: "-08:00" },
    { value: "America/Chicago", label: "Chicago (UTC-6)", offset: "-06:00" },
    { value: "Asia/Dubai", label: "Dubai (UTC+4)", offset: "+04:00" },
    { value: "Asia/Tokyo", label: "Tokyo (UTC+9)", offset: "+09:00" },
    { value: "Australia/Sydney", label: "Sydney (UTC+11)", offset: "+11:00" },
  ]

  useEffect(() => {
    loadSettings()
    checkFirebaseConfiguration()
    setBrowserPermission(checkNotificationSupport())
  }, [])

  const applyScheduledTheme = useCallback(() => {
    const now = new Date()
    
    // Use user's timezone from settings for theme scheduling
    const timeInUserTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const currentTime = `${timeInUserTimezone.getHours().toString().padStart(2, '0')}:${timeInUserTimezone.getMinutes().toString().padStart(2, '0')}`
    
    const [startHour, startMin] = scheduledThemeStart.split(':').map(Number)
    const [endHour, endMin] = scheduledThemeEnd.split(':').map(Number)
    const [currentHour, currentMin] = currentTime.split(':').map(Number)
    
    const currentMinutes = currentHour * 60 + currentMin
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    let isDarkTime = false
    if (startMinutes < endMinutes) {
      // Normal case: e.g., 18:00 to 23:00
      isDarkTime = currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Overnight case: e.g., 18:00 to 08:00
      isDarkTime = currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    
    console.log('[Theme] Scheduled theme check:', {
      timezone,
      currentTime,
      scheduledThemeStart,
      scheduledThemeEnd,
      isDarkTime,
      willApply: isDarkTime ? 'dark' : 'light'
    })
    
    setTheme(isDarkTime ? 'dark' : 'light')
  }, [timezone, scheduledThemeStart, scheduledThemeEnd, setTheme])

  useEffect(() => {
    // Apply theme based on mode
    if (themeMode === 'scheduled') {
      applyScheduledTheme()
      const interval = setInterval(applyScheduledTheme, 60000) // Check every minute
      return () => clearInterval(interval)
    } else {
      setTheme(themeMode)
    }
  }, [themeMode, applyScheduledTheme, setTheme])

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
          description: t.notAuthenticated,
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
          title: t.sendTestNotification,
          description: data.message || t.checkYourDevices,
        })
      } else {
        toast({
          title: t.error,
          description: data.error || t.failedToSaveSettings,
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

      // Load timezone from settings
      const { data: timezoneData } = await supabase
        .from("settings")
        .select("value")
        .eq("user_id", user.id)
        .eq("key", "timezone")
        .maybeSingle()

      if (timezoneData && timezoneData.value) {
        const savedTimezone = timezoneData.value
        if (savedTimezone === 'auto') {
          // Auto-detect timezone
          const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
          setTimezone(detectedTimezone)
        } else if (savedTimezone === 'disabled') {
          // Use UTC
          setTimezone('UTC')
        } else {
          setTimezone(savedTimezone)
        }
      } else {
        // Auto-detect timezone if not set
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        setTimezone(detectedTimezone)
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
        timezone,
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

      // Save timezone
      await supabase.from("settings").upsert(
        {
          user_id: user.id,
          key: "timezone",
          value: timezone,
        },
        { onConflict: "user_id,key" },
      )

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
      setDefaultNotificationTimes([...defaultNotificationTimes, "09:00"])
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

              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? t.saving : t.saveSettings}
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
                    onClick={() => setThemeMode('light')}
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
                    onClick={() => setThemeMode('dark')}
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
                    onClick={() => setThemeMode('system')}
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
                    onClick={() => setThemeMode('scheduled')}
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
                        value={scheduledThemeStart}
                        onChange={(e) => setScheduledThemeStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="theme-end">
                        До:
                      </Label>
                      <Input
                        id="theme-end"
                        type="time"
                        value={scheduledThemeEnd}
                        onChange={(e) => setScheduledThemeEnd(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Темная тема будет включаться автоматически в указанное время.
                      {scheduledThemeStart > scheduledThemeEnd && ' (через полночь)'}
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? t.saving : t.saveSettings}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.timezoneSettings}</CardTitle>
              <CardDescription>{t.timezoneSettingsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">{t.selectTimezone}</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {t.currentTimezone}: {timezone}
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{t.timezoneInfo}</AlertTitle>
                <AlertDescription>
                  {t.timezoneInfoDescription}
                </AlertDescription>
              </Alert>

              <Button onClick={handleSaveSettings} disabled={isLoading}>
                {isLoading ? t.saving : t.saveSettings}
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
