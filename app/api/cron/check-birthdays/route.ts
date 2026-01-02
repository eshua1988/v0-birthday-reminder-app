import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/check-birthdays",
//     "schedule": "* * * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ========== CRON JOB STARTED ==========")
    
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    console.log("[v0] Cron: Auth check:", {
      hasAuthHeader: !!authHeader,
      hasCronSecret: !!process.env.CRON_SECRET,
      authMatch: authHeader === expectedAuth
    })
    
    if (authHeader !== expectedAuth) {
      console.log("[v0] Cron: Unauthorized request - auth mismatch")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get current date and time
    const now = new Date()
    
    // Format time as HH:MM:SS for exact matching
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    console.log("[v0] Cron: Checking birthdays at:", currentTime, "Date:", now.toISOString())
    console.log("[v0] Cron: Using external cron for minute-by-minute checks")

    // Get all birthdays that match today and have notifications enabled
    const { data: birthdays, error } = await supabase.from("birthdays").select("*").eq("notification_enabled", true)

    if (error) {
      console.error("[v0] Cron: Error fetching birthdays:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("[v0] Cron: Found", birthdays?.length || 0, "birthdays with notifications enabled")

    // Get all global notification time settings and timezones
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
              console.error("[v0] Cron: Error parsing default_notification_times:", e)
            }
          }
        }
      }
    }

    console.log("[v0] Cron: Loaded global notification times for", globalTimesMap.size, "users")
    console.log("[v0] Cron: Loaded timezones for", userTimezonesMap.size, "users")

    let notificationsSent = 0
    let birthdaysChecked = 0
    let birthdaysMatched = 0
    const notifications: any[] = []

    for (const birthday of birthdays || []) {
      birthdaysChecked++
      // Support both 'date' and 'birth_date' fields
      const birthDate = new Date(birthday.date || birthday.birth_date)
      
      // Get birthday's individual timezone first, fallback to user's global timezone
      let birthdayTimezone = birthday.timezone || userTimezonesMap.get(birthday.user_id) || "UTC"
      if (birthdayTimezone === "auto" || birthdayTimezone === "disabled") {
        birthdayTimezone = "UTC"
      }
      
      // Get current time in birthday's timezone
      let userNow: Date
      try {
        userNow = new Date(now.toLocaleString("en-US", { timeZone: birthdayTimezone }))
      } catch (e) {
        console.error("[v0] Cron: Invalid timezone", birthdayTimezone, "for birthday", birthday.id, "using UTC")
        userNow = now
        birthdayTimezone = "UTC"
      }
      
      const userCurrentTime = `${userNow.getHours().toString().padStart(2, "0")}:${userNow.getMinutes().toString().padStart(2, "0")}:00`
      const userCurrentMonth = userNow.getMonth()
      const userCurrentDay = userNow.getDate()
      
      const isBirthdayToday = birthDate.getMonth() === userCurrentMonth && birthDate.getDate() === userCurrentDay

      if (!isBirthdayToday) {
        continue
      }

      birthdaysMatched++
      
      // Collect all notification times for this birthday
      const notificationTimes: string[] = []

      console.log("[v0] Cron: Processing birthday:", {
        id: birthday.id,
        name: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
        birthdayTimezone: birthdayTimezone,
        userCurrentTime: userCurrentTime,
        notification_times_raw: birthday.notification_times,
        notification_time_raw: birthday.notification_time,
        notification_enabled: birthday.notification_enabled,
      })

      // 1. Individual notification times (notification_times array)
      if (birthday.notification_times && Array.isArray(birthday.notification_times)) {
        // Normalize to HH:MM:SS format
        notificationTimes.push(...birthday.notification_times.map((t: string) => 
          t.length === 5 ? `${t}:00` : t
        ))
        console.log("[v0] Cron: Added notification_times array:", birthday.notification_times)
      }

      // 2. Individual notification time (legacy single time)
      if (birthday.notification_time) {
        // Normalize to HH:MM:SS format
        const time = birthday.notification_time
        notificationTimes.push(time.length === 5 ? `${time}:00` : time)
        console.log("[v0] Cron: Added notification_time:", birthday.notification_time)
      }

      // 3. Global notification times for this user
      const globalTimes = globalTimesMap.get(birthday.user_id)
      if (globalTimes && globalTimes.length > 0) {
        // Normalize to HH:MM:SS format
        notificationTimes.push(...globalTimes.map(t => 
          t.length === 5 ? `${t}:00` : t
        ))
        console.log("[v0] Cron: Added global times:", globalTimes)
      }

      // Remove duplicates
      const uniqueTimes = [...new Set(notificationTimes)]

      console.log("[v0] Cron: Birthday TODAY:", birthday.name || `${birthday.first_name} ${birthday.last_name}`, {
        birthdayTimezone,
        userCurrentTime,
        notificationTimes: uniqueTimes,
        shouldNotify: uniqueTimes.includes(userCurrentTime),
      })

      // Check if current time matches any notification time (in user's timezone)
      if (!uniqueTimes.includes(userCurrentTime)) {
        console.log("[v0] Cron: Skipping - time doesn't match")
        continue
      }
      
      console.log("[v0] Cron: TIME MATCH! Sending notification")
      
      // Get FCM tokens for this user
      const { data: tokens } = await supabase.from("fcm_tokens").select("token").eq("user_id", birthday.user_id)

      if (tokens && tokens.length > 0) {
        const fcmTokens = (tokens as { token: string }[]).map((t) => t.token)

        console.log(
          "[v0] Cron: Sending notification for:",
          birthday.name || `${birthday.first_name} ${birthday.last_name}`,
          "to",
          fcmTokens.length,
          "devices",
        )

        if (isFirebaseAdminConfigured()) {
          try {
            const messaging = getFirebaseMessaging()
            const age = userNow.getFullYear() - birthDate.getFullYear()

            const message = {
              notification: {
                title: "🎂 День рождения!",
                body: `${birthday.name || `${birthday.first_name} ${birthday.last_name}`} отмечает ${age} день рождения сегодня!`,
              },
              data: {
                birthdayId: birthday.id.toString(),
                firstName: birthday.first_name || birthday.name?.split(' ')[0] || '',
                lastName: birthday.last_name || birthday.name?.split(' ').slice(1).join(' ') || '',
                age: age.toString(),
                type: "birthday_reminder",
              },
              webpush: {
                notification: {
                  icon: "/icon-192x192.png",
                  badge: "/badge-72x72.png",
                  vibrate: [200, 100, 200],
                  tag: `birthday-${birthday.id}`,
                  requireInteraction: true,
                },
                fcmOptions: {
                  link: "/",
                },
              },
              tokens: fcmTokens,
            }

            const response = await messaging.sendEachForMulticast(message)

            console.log("[v0] Cron: FCM sent successfully:", {
              birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
              successCount: response.successCount,
              failureCount: response.failureCount,
            })

            // Handle failed tokens
            if (response.failureCount > 0) {
              response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                  console.error(`[v0] Cron: Failed token ${idx}:`, resp.error?.message)

                  // Remove invalid tokens from database
                  if (
                    resp.error?.code === "messaging/invalid-registration-token" ||
                    resp.error?.code === "messaging/registration-token-not-registered"
                  ) {
                    supabase
                      .from("fcm_tokens")
                      .delete()
                      .eq("token", fcmTokens[idx])
                      .then(() => console.log(`[v0] Cron: Removed invalid FCM token`))
                  }
                }
              })
            }

            notificationsSent += response.successCount
            notifications.push({
              birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
              sent: response.successCount,
              failed: response.failureCount,
            })
          } catch (firebaseError) {
            console.error("[v0] Cron: Firebase error:", firebaseError)
            notifications.push({
              birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
              error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
            })
          }
        } else {
          console.log("[v0] Cron: Firebase Admin SDK not configured, skipping")
          notifications.push({
            birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
            status: "Firebase not configured",
          })
        }
      } else {
        console.log("[v0] Cron: No FCM tokens found for user:", birthday.user_id)
        notifications.push({
          birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
          status: "No FCM tokens",
        })
      }
    }

    console.log("[v0] ========== CRON JOB COMPLETED ==========")
    console.log("[v0] Summary:", {
      birthdaysChecked,
      birthdaysToday: birthdaysMatched,
      notificationsSent,
      currentTime,
      timestamp: now.toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Checked ${birthdaysChecked} birthdays, found ${birthdaysMatched} today, sent ${notificationsSent} notifications`,
      timestamp: now.toISOString(),
      currentTime,
      birthdaysChecked,
      birthdaysToday: birthdaysMatched,
      notificationsSent,
      notifications,
    })
  } catch (error) {
    console.error("[v0] ========== CRON JOB ERROR ==========")
    console.error("[v0] Cron: Error in cron job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
