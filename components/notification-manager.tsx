"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { checkNotificationSupport, sendNotification } from "@/lib/notifications"
import type { Birthday } from "@/types/birthday"
import { useLocale } from "@/lib/locale-context"

export function NotificationManager() {
  const { t } = useLocale()
  const [lastCheck, setLastCheck] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check for birthdays every minute
    const interval = setInterval(() => {
      checkBirthdayNotifications()
    }, 60000) // 60 seconds

    // Initial check
    checkBirthdayNotifications()

    return () => clearInterval(interval)
  }, [])

  const checkBirthdayNotifications = async () => {
    console.log("[v0] Checking birthday notifications...")

    const support = checkNotificationSupport()
    if (!support.supported || !support.granted) {
      console.log("[v0] Notifications not supported or not granted - Firebase will handle notifications via cron")
      return
    }

    // Check if global notifications are enabled
    const { data: globalSettings } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "notifications_enabled")
      .maybeSingle()

    if (globalSettings?.value !== "true") {
      console.log("[v0] Global notifications disabled")
      return
    }

    const now = new Date()
    // Use system timezone for time comparison
    const currentTime = now.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    const currentDate = now.toISOString().split("T")[0]

    // Prevent duplicate notifications within the same minute
    const checkKey = `${currentDate}-${currentTime}`
    if (lastCheck === checkKey) {
      return
    }
    setLastCheck(checkKey)

    console.log(
      "[v0] Browser notification check:",
      currentTime,
      "Date:",
      currentDate,
      "Timezone:",
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    )

    // Get today's birthdays with notification enabled
    const { data: birthdays, error } = await supabase.from("birthdays").select("*").eq("notification_enabled", true)

    if (error) {
      console.error("[v0] Error fetching birthdays:", error)
      return
    }

    if (!birthdays || birthdays.length === 0) {
      console.log("[v0] No birthdays with notifications enabled")
      return
    }

    // Check each birthday
    birthdays.forEach((birthday: Birthday) => {
      const birthDate = new Date(birthday.birth_date)
      const isBirthdayToday = birthDate.getMonth() === now.getMonth() && birthDate.getDate() === now.getDate()

      // Match time including seconds
      if (isBirthdayToday && birthday.notification_time === currentTime) {
        const age = now.getFullYear() - birthDate.getFullYear()
        const message = `${birthday.first_name} ${birthday.last_name} отмечает ${age} день рождения сегодня!`

        console.log("[v0] Browser: Sending notification for:", birthday.first_name, birthday.last_name)

        sendNotification("🎂 День рождения!", {
          body: message,
          tag: `birthday-${birthday.id}`,
          requireInteraction: true,
        })
      }
    })
  }

  return null
}
