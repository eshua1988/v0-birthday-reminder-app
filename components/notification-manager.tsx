"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { checkNotificationSupport, sendNotification } from "@/lib/notifications"
import type { Birthday } from "@/types/birthday"
import { useLocale } from "@/lib/locale-context"
import { formatAge } from "@/lib/utils"

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
      .in("key", ["notifications_enabled", "default_notification_time", "default_notification_times"])

    const notificationsEnabled = globalSettings?.find((setting: { key: string; value: string }) => setting.key === "notifications_enabled")
    if (notificationsEnabled?.value !== "true") {
      console.log("[v0] Global notifications disabled")
      return
    }

    const configuredTimes: string[] = []
    const defaultTimesSetting = globalSettings?.find((setting: { key: string; value: string }) => setting.key === "default_notification_times")
    if (defaultTimesSetting?.value) {
      try {
        const parsedTimes = JSON.parse(defaultTimesSetting.value)
        if (Array.isArray(parsedTimes)) configuredTimes.push(...parsedTimes.map((time: string) => time.slice(0, 5)))
      } catch (error) {
        console.error("[v0] Error parsing default notification times:", error)
      }
    }
    const defaultTimeSetting = globalSettings?.find((setting: { key: string; value: string }) => setting.key === "default_notification_time")
    if (configuredTimes.length === 0 && defaultTimeSetting?.value) {
      configuredTimes.push(defaultTimeSetting.value.slice(0, 5))
    }

    const now = new Date()
    // Use HH:MM format to match stored notification times
    const currentTimeHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    const currentDate = now.toISOString().split("T")[0]

    // Prevent duplicate notifications within the same minute
    const checkKey = `${currentDate}-${currentTimeHHMM}`
    if (lastCheck === checkKey) {
      return
    }
    setLastCheck(checkKey)

    console.log(
      "[v0] Browser notification check:",
      currentTimeHHMM,
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

      if (!isBirthdayToday) return

      // Check against notification_times array (HH:MM:00) and legacy notification_time (HH:MM)
      const times: string[] = [...configuredTimes]
      if (times.length === 0) {
        if (birthday.notification_times && Array.isArray(birthday.notification_times)) {
          times.push(...birthday.notification_times.map((t: string) => t.slice(0, 5)))
        }
        if (birthday.notification_time) {
          times.push(birthday.notification_time.slice(0, 5))
        }
      }

      if (times.includes(currentTimeHHMM)) {
        const deliveryKey = `birthday-browser-delivery:${currentDate}:${birthday.id}`
        if (localStorage.getItem(deliveryKey)) {
          console.log("[v0] Browser: Skipping duplicate delivery for:", birthday.id)
          return
        }

        const age = now.getFullYear() - birthDate.getFullYear()
        const ageText = formatAge(age)
        const message = `${birthday.first_name} ${birthday.last_name} — сегодня исполняется ${ageText}!`

        console.log("[v0] Browser: Sending notification for:", birthday.first_name, birthday.last_name)

        sendNotification("🎂 День рождения!", {
          body: message,
          tag: `birthday-${birthday.id}`,
          requireInteraction: true,
        })
        localStorage.setItem(deliveryKey, new Date().toISOString())
      }
    })
  }

  return null
}
