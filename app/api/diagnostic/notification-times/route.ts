import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Get all birthdays with notifications enabled
    const { data: birthdays, error: birthdaysError } = await supabase
      .from("birthdays")
      .select("*")
      .eq("notification_enabled", true)

    if (birthdaysError) {
      return NextResponse.json({ error: "Failed to fetch birthdays" }, { status: 500 })
    }

    // Get all settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .in("key", ["default_notification_time", "default_notification_times", "timezone"])

    if (settingsError) {
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    // Get current server time
    const now = new Date()
    const serverTime = {
      iso: now.toISOString(),
      formatted: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`,
      timezone: "UTC (server)",
    }

    // Group settings by user
    const userSettings = new Map<string, any>()
    for (const setting of settings || []) {
      if (!userSettings.has(setting.user_id)) {
        userSettings.set(setting.user_id, {
          user_id: setting.user_id,
          timezone: "UTC",
          notification_times: [],
        })
      }

      const userSetting = userSettings.get(setting.user_id)!
      if (setting.key === "timezone") {
        userSetting.timezone = setting.value
      } else if (setting.key === "default_notification_time") {
        userSetting.notification_times.push(setting.value)
      } else if (setting.key === "default_notification_times") {
        try {
          const times = JSON.parse(setting.value)
          if (Array.isArray(times)) {
            userSetting.notification_times.push(...times)
          }
        } catch (e) {
          console.error("Error parsing notification times:", e)
        }
      }
    }

    // Process birthdays with timezone info
    const birthdaysWithTimezone = (birthdays || []).map((birthday) => {
      const userSetting = userSettings.get(birthday.user_id)
      const timezone = userSetting?.timezone || "UTC"
      
      // Get current time in user's timezone
      let userTime
      try {
        const userNow = new Date(now.toLocaleString("en-US", { timeZone: timezone === "auto" || timezone === "disabled" ? "UTC" : timezone }))
        userTime = `${userNow.getHours().toString().padStart(2, "0")}:${userNow.getMinutes().toString().padStart(2, "0")}:00`
      } catch (e) {
        userTime = serverTime.formatted
      }

      // Collect all notification times
      const notificationTimes: string[] = []
      
      if (birthday.notification_times && Array.isArray(birthday.notification_times)) {
        notificationTimes.push(...birthday.notification_times.map((t: string) => 
          t.length === 5 ? `${t}:00` : t
        ))
      }
      
      if (birthday.notification_time) {
        const time = birthday.notification_time
        notificationTimes.push(time.length === 5 ? `${time}:00` : time)
      }
      
      if (userSetting?.notification_times) {
        notificationTimes.push(...userSetting.notification_times.map((t: string) => 
          t.length === 5 ? `${t}:00` : t
        ))
      }

      const uniqueTimes = [...new Set(notificationTimes)]

      return {
        id: birthday.id,
        name: `${birthday.first_name} ${birthday.last_name}`,
        birth_date: birthday.birth_date,
        notification_enabled: birthday.notification_enabled,
        user_id: birthday.user_id,
        timezone,
        current_time_in_user_tz: userTime,
        notification_times: uniqueTimes,
        will_notify_now: uniqueTimes.includes(userTime),
      }
    })

    return NextResponse.json({
      server_time: serverTime,
      total_birthdays: birthdays?.length || 0,
      total_users_with_settings: userSettings.size,
      birthdays: birthdaysWithTimezone,
      user_settings: Array.from(userSettings.values()),
    }, { status: 200 })
  } catch (error) {
    console.error("Diagnostic error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
