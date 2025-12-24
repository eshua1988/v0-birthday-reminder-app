import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { birthdayId, fcmTokens } = body

    console.log("[v0] Birthday notification: Sending for birthday ID:", birthdayId)

    // Get birthday details
    const { data: birthday, error: birthdayError } = await supabase
      .from("birthdays")
      .select("*")
      .eq("id", birthdayId)
      .single()

    if (birthdayError || !birthday) {
      console.error("[v0] Birthday notification: Birthday not found:", birthdayError)
      return NextResponse.json({ error: "Birthday not found" }, { status: 404 })
    }

    if (!isFirebaseAdminConfigured()) {
      console.log("[v0] Birthday notification: Simulating (no Firebase Admin SDK)")
      console.log("[v0] Would send:", {
        title: "🎂 День рождения!",
        body: `${birthday.first_name} ${birthday.last_name} отмечает день рождения сегодня!`,
        tokens: fcmTokens?.length || 0,
      })

      return NextResponse.json({
        success: true,
        message: "Notification queued (Firebase Admin SDK not configured)",
      })
    }

    try {
      const messaging = getFirebaseMessaging()

      // FCM v1 API message format
      const message = {
        notification: {
          title: "🎂 День рождения!",
          body: `${birthday.first_name} ${birthday.last_name} отмечает день рождения сегодня!`,
        },
        data: {
          birthdayId: birthdayId.toString(),
          firstName: birthday.first_name,
          lastName: birthday.last_name,
          type: "birthday_reminder",
        },
        webpush: {
          notification: {
            icon: "/icon-192x192.png",
            badge: "/badge-72x72.png",
            vibrate: [200, 100, 200],
            tag: `birthday-${birthdayId}`,
            requireInteraction: true,
          },
          fcmOptions: {
            link: "/",
          },
        },
        tokens: fcmTokens,
      }

      console.log("[v0] Birthday notification: Sending to", fcmTokens.length, "devices via FCM v1 API")

      // Send to multiple tokens using sendEachForMulticast
      const response = await messaging.sendEachForMulticast(message)

      console.log("[v0] Birthday notification: FCM Response:", {
        successCount: response.successCount,
        failureCount: response.failureCount,
      })

      // Handle failed tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            console.error(`[v0] Birthday notification: Failed token ${idx}:`, resp.error?.message)

            // Remove invalid tokens from database
            if (
              resp.error?.code === "messaging/invalid-registration-token" ||
              resp.error?.code === "messaging/registration-token-not-registered"
            ) {
              supabase
                .from("fcm_tokens")
                .delete()
                .eq("token", fcmTokens[idx])
                .then(() => console.log(`[v0] Removed invalid FCM token from database`))
            }
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: "Birthday notification sent via FCM v1 API",
        successCount: response.successCount,
        failureCount: response.failureCount,
      })
    } catch (firebaseError) {
      console.error("[v0] Birthday notification: Firebase error:", firebaseError)
      return NextResponse.json(
        {
          error: "Failed to send Firebase notification",
          details: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Birthday notification: Internal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
