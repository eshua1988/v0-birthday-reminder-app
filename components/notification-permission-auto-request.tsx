"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { checkNotificationSupport, requestNotificationPermission } from "@/lib/notifications"
import { requestFirebaseNotificationPermission } from "@/lib/firebase"
import { getFirebaseVapidKey } from "@/app/actions/firebase-config"

export function NotificationPermissionAutoRequest() {
  const [hasChecked, setHasChecked] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const autoRequestPermission = async () => {
      // Only run once per session
      if (hasChecked) return
      setHasChecked(true)

      // Check if user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      console.log("[v0] Auto-requesting notification permissions...")

      // Check browser support
      const support = checkNotificationSupport()
      if (!support.supported) {
        console.log("[v0] Browser does not support notifications")
        return
      }

      // If already granted, try to get FCM token
      if (support.granted) {
        console.log("[v0] Notifications already granted")
        await initializeFirebase()
        return
      }

      // If denied, don't auto-request
      if (support.denied) {
        console.log("[v0] Notifications denied by user")
        return
      }

      // Check if notifications are enabled in settings (default: true)
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("key", "browser_notifications_enabled")
        .maybeSingle()

      // Default to enabled if no setting exists
      const notificationsEnabled = !settings || settings.value !== "false"

      if (!notificationsEnabled) {
        console.log("[v0] Browser notifications disabled in settings")
        return
      }

      // Auto-request permission (only on first visit or if permission is 'default')
      if (support.prompt) {
        console.log("[v0] Requesting notification permission...")
        const granted = await requestNotificationPermission()

        if (granted) {
          console.log("[v0] Notification permission granted")
          await initializeFirebase()
        } else {
          console.log("[v0] Notification permission denied")
          // Save denied state to avoid asking again
          await supabase.from("settings").upsert(
            {
              user_id: user.id,
              key: "browser_notifications_enabled",
              value: "false",
            },
            { onConflict: "user_id,key" },
          )
        }
      }
    }

    const initializeFirebase = async () => {
      // Check if Firebase is configured
      const hasFirebaseConfig =
        !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
        !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID

      if (!hasFirebaseConfig) {
        console.log("[v0] Firebase not configured")
        return
      }

      try {
        const vapidKey = await getFirebaseVapidKey()
        if (vapidKey) {
          const token = await requestFirebaseNotificationPermission(vapidKey)
          if (token) {
            console.log("[v0] FCM token obtained successfully")
          }
        }
      } catch (error) {
        console.error("[v0] Error initializing Firebase:", error)
      }
    }

    // Wait a bit before auto-requesting to avoid overwhelming the user
    const timeout = setTimeout(() => {
      autoRequestPermission()
    }, 2000)

    return () => clearTimeout(timeout)
  }, [hasChecked, supabase])

  return null
}
