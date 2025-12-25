"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { requestFirebaseNotificationPermission, onFirebaseMessage, checkNotificationPermission } from "@/lib/firebase"
import { getFirebaseVapidKey } from "@/app/actions/firebase-config"
import { useToast } from "@/hooks/use-toast"

export function FirebaseNotificationManager() {
  const { toast } = useToast()
  const supabase = createClient()
  const [fcmToken, setFcmToken] = useState<string | null>(null)

  useEffect(() => {
    initializeFirebaseMessaging()
  }, [])

  const initializeFirebaseMessaging = async () => {
    try {
      const permission = await checkNotificationPermission()
      console.log("[v0] Current notification permission:", permission)

      if (permission === "denied") {
        console.log("[v0] Notifications blocked by user, skipping Firebase initialization")
        return
      }

      // Only try to get token if permission is granted or default (will prompt)
      if (permission === "granted" || permission === "default") {
        const vapidKey = await getFirebaseVapidKey()

        if (!vapidKey) {
          console.log("[v0] VAPID key not configured, skipping FCM initialization")
          return
        }

        const token = await requestFirebaseNotificationPermission(vapidKey)

        if (token) {
          setFcmToken(token)
          console.log("[v0] FCM registration token obtained:", token.substring(0, 20) + "...")

          // Save token to database for server-side notifications
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            await saveFcmToken(user.id, token)
          }
        }

        // Token can change when: app deletes Instance ID, app restored on new device,
        // user uninstalls/reinstalls app, user clears app data
        setupTokenRefreshMonitoring(vapidKey)

        // Listen for foreground messages
        const unsubscribe = onFirebaseMessage((payload) => {
          console.log("[v0] Foreground notification received:", payload)

          toast({
            title: payload.notification?.title || "🎂 День рождения!",
            description: payload.notification?.body || "",
            duration: 10000,
          })
        })

        return unsubscribe
      }
    } catch (error) {
      console.error("[v0] Error initializing Firebase Messaging:", error)
    }
  }

  const setupTokenRefreshMonitoring = async (vapidKey: string) => {
    // Check for token updates every 24 hours
    const checkInterval = 24 * 60 * 60 * 1000 // 24 hours

    const checkTokenUpdate = async () => {
      try {
        const newToken = await requestFirebaseNotificationPermission(vapidKey)

        if (newToken && newToken !== fcmToken) {
          console.log("[v0] FCM token refreshed:", newToken.substring(0, 20) + "...")
          setFcmToken(newToken)

          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            await saveFcmToken(user.id, newToken)

            toast({
              title: "Токен обновлен",
              description: "FCM токен был автоматически обновлен",
              duration: 5000,
            })
          }
        }
      } catch (error) {
        console.error("[v0] Error checking token update:", error)
      }
    }

    // Initial check after 1 minute
    setTimeout(checkTokenUpdate, 60000)

    // Then check every 24 hours
    setInterval(checkTokenUpdate, checkInterval)
  }

  const saveFcmToken = async (userId: string, token: string) => {
    try {
      // Check if token already exists
      const { data: existingToken } = await supabase
        .from("fcm_tokens")
        .select("*")
        .eq("user_id", userId)
        .eq("token", token)
        .maybeSingle()

      if (!existingToken) {
        // Save new token or update existing
        const { error } = await supabase.from("fcm_tokens").upsert(
          {
            user_id: userId,
            token: token,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,token",
          },
        )

        if (error) {
          console.error("[v0] Error saving FCM token:", error)
        } else {
          console.log("[v0] FCM token saved to database")
        }
      } else {
        console.log("[v0] FCM token already exists in database")
      }
    } catch (error) {
      console.error("[v0] Error in saveFcmToken:", error)
    }
  }

  return null
}
