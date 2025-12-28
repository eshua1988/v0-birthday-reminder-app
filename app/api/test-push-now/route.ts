import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"

/**
 * Force send test notification to current user
 * URL: /api/test-push-now
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[Test Push] User:", user.id)

    // Get user's FCM tokens
    const { data: tokens } = await supabase.from("fcm_tokens").select("token").eq("user_id", user.id)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        {
          error: "No FCM tokens found",
          message: "Please reload the page to register FCM token",
        },
        { status: 404 }
      )
    }

    const fcmTokens = (tokens as { token: string }[]).map((t) => t.token)
    console.log("[Test Push] Found", fcmTokens.length, "tokens")

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error: "Firebase not configured",
          message: "Add FIREBASE_SERVICE_ACCOUNT_KEY to Vercel environment variables",
        },
        { status: 500 }
      )
    }

    try {
      const messaging = getFirebaseMessaging()

      const message = {
        notification: {
          title: "🎉 Тестовое уведомление!",
          body: "Firebase Push работает! Вы получите уведомления о днях рождения.",
        },
        data: {
          type: "test_push",
          timestamp: new Date().toISOString(),
        },
        webpush: {
          notification: {
            icon: "/icon-light-32x32.png",
            badge: "/icon-light-32x32.png",
            vibrate: [200, 100, 200],
            tag: "test-push",
            requireInteraction: false,
          },
          fcmOptions: {
            link: "/",
          },
        },
        tokens: fcmTokens,
      }

      console.log("[Test Push] Sending to", fcmTokens.length, "device(s)...")
      const response = await messaging.sendEachForMulticast(message)

      console.log("[Test Push] Success:", response.successCount, "Failed:", response.failureCount)

      // Handle failed tokens
      const failedTokens: string[] = []
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            console.error(`[Test Push] Token ${idx} failed:`, resp.error?.code, resp.error?.message)
            failedTokens.push(fcmTokens[idx])

            // Remove invalid tokens
            if (
              resp.error?.code === "messaging/invalid-registration-token" ||
              resp.error?.code === "messaging/registration-token-not-registered"
            ) {
              supabase
                .from("fcm_tokens")
                .delete()
                .eq("token", fcmTokens[idx])
                .then(() => console.log(`[Test Push] Removed invalid token`))
            }
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: `✅ Отправлено на ${response.successCount} устройств!`,
        details: {
          totalTokens: fcmTokens.length,
          successCount: response.successCount,
          failureCount: response.failureCount,
          failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
        },
      })
    } catch (firebaseError: any) {
      console.error("[Test Push] Firebase error:", firebaseError)
      return NextResponse.json(
        {
          error: "Firebase error",
          code: firebaseError.code,
          message: firebaseError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[Test Push] Error:", error)
    return NextResponse.json(
      {
        error: "Internal error",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
