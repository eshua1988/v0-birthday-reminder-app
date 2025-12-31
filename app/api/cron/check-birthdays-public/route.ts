import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"

/**
 * Convert local time to UTC based on user's timezone
 * @param localTime - Time in HH:MM or HH:MM:SS format
 * @param timezone - IANA timezone string (e.g., "Europe/Warsaw")
 * @returns UTC time in HH:MM:SS format
 */
function convertLocalTimeToUTC(localTime: string, timezone: string): string {
  try {
    // Parse local time
    const parts = localTime.split(':')
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    
    // Get current date
    const now = new Date()
    
    // Create a date string in the user's timezone
    // Format: "2025-12-29 23:10" in timezone "Europe/Warsaw"
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
    
    // Parse this as a date in UTC, then adjust for timezone offset
    // This is a workaround: we create a Date as if it's in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    // Get timezone offset by comparing same moment in UTC and local timezone
    const nowUTC = new Date()
    const nowLocal = new Date(nowUTC.toLocaleString('en-US', { timeZone: timezone }))
    const offsetMs = nowUTC.getTime() - nowLocal.getTime()
    
    // Create target time in UTC
    const targetLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0)
    const targetUTC = new Date(targetLocal.getTime() - offsetMs)
    
    const result = `${targetUTC.getUTCHours().toString().padStart(2, '0')}:${targetUTC.getUTCMinutes().toString().padStart(2, '0')}:00`
    
    console.log('[v0] Cron: Converting', localTime, 'in', timezone, 'to UTC:', result, '| Offset:', Math.floor(offsetMs / 60000), 'min')
    
    return result
  } catch (error) {
    console.error('[v0] Cron: Error converting time from', timezone, ':', error)
    // Fallback to original time if conversion fails
    const normalized = localTime.length === 5 ? `${localTime}:00` : localTime
    console.log('[v0] Cron: Using fallback time:', normalized)
    return normalized
  }
}

/**
 * Public endpoint for testing birthday notifications
 * Can be called from any cron service without authorization
 * Use this URL in cron-job.org: /api/cron/check-birthdays-public
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ========== PUBLIC CRON JOB STARTED ==========")
    
    const supabase = createServiceRoleClient()

    // Get current date and time
    const now = new Date()
    
    // Format time as HH:MM:SS for exact matching
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    console.log("[v0] Cron: Checking birthdays at:", currentTime, "Date:", now.toISOString())

    // Get all birthdays that match today and have notifications enabled
    const { data: birthdays, error } = await supabase.from("birthdays").select("*").eq("notification_enabled", true)

    if (error) {
      console.error("[v0] Cron: Error fetching birthdays:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("[v0] Cron: Found", birthdays?.length || 0, "birthdays with notifications enabled")

    // Get all global notification time settings AND user timezones
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
      
      // Get user's timezone (default to UTC if not set)
      const userTimezone = userTimezonesMap.get(birthday.user_id) || 'UTC'
      
      // Get current date in user's timezone
      const nowInUserTimezone = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
      const userMonth = nowInUserTimezone.getMonth()
      const userDay = nowInUserTimezone.getDate()
      
      const birthDate = new Date(birthday.birth_date)
      const isBirthdayToday = birthDate.getMonth() === userMonth && birthDate.getDate() === userDay

      if (!isBirthdayToday) {
        continue
      }

      birthdaysMatched++
      
      // Collect all notification times for this birthday
      const notificationTimes: string[] = []

      // 1. Individual notification times (notification_times array)
      if (birthday.notification_times && Array.isArray(birthday.notification_times)) {
        // Convert each time from user's local timezone to UTC
        notificationTimes.push(...birthday.notification_times.map((t: string) => {
          const normalizedTime = t.length === 5 ? `${t}:00` : t
          return convertLocalTimeToUTC(normalizedTime, userTimezone)
        }))
      }

      // 2. Individual notification time (legacy single time)
      if (birthday.notification_time) {
        notificationTimes.push(convertLocalTimeToUTC(birthday.notification_time, userTimezone))
      }

      // 3. Global notification times for this user
      const globalTimes = globalTimesMap.get(birthday.user_id)
      if (globalTimes && globalTimes.length > 0) {
        // Convert each time from user's local timezone to UTC
        notificationTimes.push(...globalTimes.map(t => {
          const normalizedTime = t.length === 5 ? `${t}:00` : t
          return convertLocalTimeToUTC(normalizedTime, userTimezone)
        }))
      }

      // Remove duplicates
      const uniqueTimes = [...new Set(notificationTimes)]

      console.log("[v0] Cron: Birthday TODAY:", birthday.first_name, birthday.last_name, {
        birthDate: birthday.birth_date,
        userTimezone,
        individualTimes: birthday.notification_times || [],
        individualTimeLegacy: birthday.notification_time || null,
        globalTimes: globalTimes || [],
        notificationTimesUTC: uniqueTimes,
        currentTimeUTC: currentTime,
        shouldNotify: uniqueTimes.includes(currentTime),
      })

      // Check if current time matches any notification time (now in UTC)
      if (!uniqueTimes.includes(currentTime)) {
        console.log("[v0] Cron: Skipping - time doesn't match. Current:", currentTime, "Expected one of:", uniqueTimes)
        continue
      }
      
      console.log("[v0] Cron: TIME MATCH! Sending notification")
      
      // Get FCM tokens for this user
      const { data: tokens } = await supabase.from("fcm_tokens").select("token").eq("user_id", birthday.user_id)

      if (tokens && tokens.length > 0) {
        const fcmTokens = (tokens as { token: string }[]).map((t) => t.token)

        console.log(
          "[v0] Cron: Sending notification for:",
          birthday.first_name,
          birthday.last_name,
          "to",
          fcmTokens.length,
          "devices",
        )

        if (isFirebaseAdminConfigured()) {
          try {
            const messaging = getFirebaseMessaging()
            const age = now.getFullYear() - birthDate.getFullYear()

            const message = {
              notification: {
                title: "🎂 День рождения!",
                body: `${birthday.first_name} ${birthday.last_name} отмечает ${age} день рождения сегодня!`,
              },
              data: {
                birthdayId: birthday.id.toString(),
                firstName: birthday.first_name,
                lastName: birthday.last_name,
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
              birthday: `${birthday.first_name} ${birthday.last_name}`,
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
              birthday: `${birthday.first_name} ${birthday.last_name}`,
              sent: response.successCount,
              failed: response.failureCount,
            })
          } catch (firebaseError) {
            console.error("[v0] Cron: Firebase error:", firebaseError)
            notifications.push({
              birthday: `${birthday.first_name} ${birthday.last_name}`,
              error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
            })
          }
        } else {
          console.log("[v0] Cron: Firebase Admin SDK not configured, skipping")
          notifications.push({
            birthday: `${birthday.first_name} ${birthday.last_name}`,
            status: "Firebase not configured",
          })
        }
      } else {
        console.log("[v0] Cron: No FCM tokens found for user:", birthday.user_id)
        notifications.push({
          birthday: `${birthday.first_name} ${birthday.last_name}`,
          status: "No FCM tokens",
        })
      }
    }

    console.log("[v0] ========== PUBLIC CRON JOB COMPLETED ==========")
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
    console.error("[v0] ========== PUBLIC CRON JOB ERROR ==========")
    console.error("[v0] Cron: Error in cron job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
