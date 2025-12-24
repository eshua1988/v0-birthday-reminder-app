import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
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
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("[v0] Cron: Unauthorized request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerClient()

    // Get current date and time
    const now = new Date()
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

    let notificationsSent = 0
    const notifications: any[] = []

    for (const birthday of birthdays || []) {
      const birthDate = new Date(birthday.birth_date)
      const isBirthdayToday = birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay

      console.log("[v0] Cron: Checking", birthday.first_name, birthday.last_name, {
        isBirthdayToday,
        birthdayTime: birthday.notification_time,
        currentTime,
        match: birthday.notification_time === currentTime,
      })

      if (isBirthdayToday && birthday.notification_time === currentTime) {
        // Get FCM tokens for this user
        const { data: tokens } = await supabase.from("fcm_tokens").select("token").eq("user_id", birthday.user_id)

        if (tokens && tokens.length > 0) {
          const fcmTokens = tokens.map((t) => t.token)

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
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${birthdays?.length || 0} birthdays, sent ${notificationsSent} notifications`,
      timestamp: now.toISOString(),
      currentTime,
      notifications,
    })
  } catch (error) {
    console.error("[v0] Cron: Error in cron job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
