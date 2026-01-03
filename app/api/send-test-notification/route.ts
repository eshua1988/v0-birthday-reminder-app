import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Test notification: Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Test notification: Authenticated user:", user.id)

    // Get user's FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", user.id)

    if (tokensError) {
      console.error("[v0] Test notification: Error fetching FCM tokens:", tokensError)
      return NextResponse.json({ error: "Failed to fetch FCM tokens" }, { status: 500 })
    }

    console.log("[v0] Test notification: Found", tokens?.length || 0, "FCM tokens")

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        {
          error: "No FCM tokens found",
          message: "Сначала разрешите уведомления в браузере. Обновите страницу после предоставления разрешения.",
        },
        { status: 404 },
      )
    }

    const fcmTokens = (tokens as { token: string }[]).map((t) => t.token)

    if (!isFirebaseAdminConfigured()) {
      console.log("[v0] Test notification: FIREBASE_SERVICE_ACCOUNT_KEY not configured")
      return NextResponse.json(
        {
          error: "Firebase not configured",
          message: "Добавьте FIREBASE_SERVICE_ACCOUNT_KEY в переменные окружения для отправки реальных уведомлений.",
          simulation: true,
        },
        { status: 501 },
      )
    }

    try {
      console.log("[v0] Test notification: Отправка через Firebase Admin SDK...")

      const messaging = getFirebaseMessaging()

      // DATA-ONLY message for PWA background delivery
      // Service Worker will handle showing the notification with sound/vibration
      const message = {
        data: {
          title: "🎉 Тестовое уведомление",
          body: "Firebase Push работает! Уведомления о днях рождения будут приходить даже когда приложение закрыто.",
          type: "test_notification",
          icon: "/icon-192x192.png",
          badge: "/badge-72x72.png",
          tag: "test-notification-" + Date.now(),
          url: "/settings",
          timestamp: Date.now().toString(),
        },
        android: {
          priority: "high" as const,
          ttl: 86400000,
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400",
          },
        },
        tokens: fcmTokens,
      }

      console.log("[v0] Test notification: Sending via FCM v1 API to", fcmTokens.length, "device(s)...")

      const response = await messaging.sendEachForMulticast(message)

      console.log("[v0] Test notification: FCM Response received")
      console.log("[v0] Success:", response.successCount, "/ Failure:", response.failureCount)

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = []

        for (let idx = 0; idx < response.responses.length; idx++) {
          const resp = response.responses[idx]
          if (!resp.success) {
            const errorCode = resp.error?.code
            const errorMessage = resp.error?.message

            console.error(`[v0] Test notification: Token ${idx} failed:`, {
              code: errorCode,
              message: errorMessage,
            })

            failedTokens.push(fcmTokens[idx])

            // Remove invalid tokens from database
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered"
            ) {
              await supabase.from("fcm_tokens").delete().eq("token", fcmTokens[idx])
              console.log(`[v0] Test notification: Removed invalid token from database`)
            }
          }
        }

        if (failedTokens.length > 0) {
          console.log("[v0] Test notification: Failed tokens removed:", failedTokens.length)
        }
      }

      return NextResponse.json({
        success: true,
        message: `✅ Уведомление отправлено!\n\n📱 Успешно: ${response.successCount}\n❌ Ошибок: ${response.failureCount}`,
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: fcmTokens.length,
      })
    } catch (firebaseError: any) {
      console.error("[v0] Test notification: Firebase error:", firebaseError)
      console.error("[v0] Error code:", firebaseError.code)
      console.error("[v0] Error message:", firebaseError.message)

      return NextResponse.json(
        {
          error: "Firebase error",
          code: firebaseError.code,
          message: firebaseError.message,
          details: "Проверьте корректность FIREBASE_SERVICE_ACCOUNT_KEY и права доступа к FCM API.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[v0] Test notification: Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
