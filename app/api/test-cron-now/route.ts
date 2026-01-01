import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"

// Manual test endpoint - call this to test cron logic right now
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ========== MANUAL TEST STARTED ==========")
    
    const supabase = createServiceRoleClient()

    // Get current date and time
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    console.log("[v0] Test: Current server time:", currentTime, "Date:", now.toISOString())

    // Get all birthdays with notifications enabled
    const { data: birthdays, error } = await supabase
      .from("birthdays")
      .select("*")
      .eq("notification_enabled", true)

    if (error) {
      console.error("[v0] Test: Error fetching birthdays:", error)
      return NextResponse.json({ error: "Database error", details: error }, { status: 500 })
    }

    console.log("[v0] Test: Found", birthdays?.length || 0, "birthdays with notifications enabled")

    // Get all settings
    const { data: globalSettings } = await supabase
      .from("settings")
      .select("*")
      .in("key", ["default_notification_time", "default_notification_times", "timezone"])

    const globalTimesMap = new Map<string, string[]>()
    const userTimezonesMap = new Map<string, string>()
    
    if (globalSettings) {
      for (const setting of globalSettings) {
        if (setting.key === "timezone") {
          userTimezonesMap.set(setting.user_id, setting.value)
        } else {
          if (!globalTimesMap.has(setting.user_id)) {
            globalTimesMap.set(setting.user_id, [])
          }
          
          if (setting.key === "default_notification_time") {
            globalTimesMap.get(setting.user_id)!.push(setting.value)
          } else if (setting.key === "default_notification_times") {
            try {
              const times = JSON.parse(setting.value)
              if (Array.isArray(times)) {
                globalTimesMap.get(setting.user_id)!.push(...times)
              }
            } catch (e) {
              console.error("[v0] Test: Error parsing default_notification_times:", e)
            }
          }
        }
      }
    }

    console.log("[v0] Test: Loaded timezones for", userTimezonesMap.size, "users")
    console.log("[v0] Test: User timezones:", Object.fromEntries(userTimezonesMap))

    const results: any[] = []

    for (const birthday of birthdays || []) {
      const birthDate = new Date(birthday.birth_date)
      
      // Get user's timezone
      let userTimezone = userTimezonesMap.get(birthday.user_id) || "UTC"
      if (userTimezone === "auto" || userTimezone === "disabled") {
        userTimezone = "UTC"
      }
      
      // Get current time in user's timezone
      let userNow: Date
      try {
        userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }))
      } catch (e) {
        console.error("[v0] Test: Invalid timezone", userTimezone, "using UTC")
        userNow = now
        userTimezone = "UTC"
      }
      
      const userCurrentTime = `${userNow.getHours().toString().padStart(2, "0")}:${userNow.getMinutes().toString().padStart(2, "0")}:00`
      const userCurrentMonth = userNow.getMonth()
      const userCurrentDay = userNow.getDate()
      
      const isBirthdayToday = birthDate.getMonth() === userCurrentMonth && birthDate.getDate() === userCurrentDay

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

      const globalTimes = globalTimesMap.get(birthday.user_id)
      if (globalTimes && globalTimes.length > 0) {
        notificationTimes.push(...globalTimes.map(t => 
          t.length === 5 ? `${t}:00` : t
        ))
      }

      const uniqueTimes = [...new Set(notificationTimes)]
      const shouldNotify = uniqueTimes.includes(userCurrentTime)

      const result = {
        id: birthday.id,
        name: `${birthday.first_name} ${birthday.last_name}`,
        birth_date: birthday.birth_date,
        is_birthday_today: isBirthdayToday,
        user_timezone: userTimezone,
        user_current_time: userCurrentTime,
        server_current_time: currentTime,
        notification_times_raw: birthday.notification_times,
        notification_time_raw: birthday.notification_time,
        all_notification_times: uniqueTimes,
        should_notify_now: shouldNotify,
        notification_enabled: birthday.notification_enabled,
      }

      results.push(result)

      console.log("[v0] Test: Birthday:", result)
    }

    console.log("[v0] ========== MANUAL TEST COMPLETED ==========")

    return NextResponse.json({
      success: true,
      server_time: {
        iso: now.toISOString(),
        formatted: currentTime,
        date: now.toDateString(),
      },
      firebase_configured: isFirebaseAdminConfigured(),
      total_birthdays: birthdays?.length || 0,
      birthdays_today: results.filter(r => r.is_birthday_today).length,
      should_notify_now: results.filter(r => r.should_notify_now).length,
      results,
    })
  } catch (error) {
    console.error("[v0] Test: Error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
