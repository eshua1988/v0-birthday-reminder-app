import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | undefined
let messaging: Messaging | undefined

export function getFirebaseApp() {
  if (typeof window === "undefined") return null

  if (!app) {
    const apps = getApps()
    if (apps.length === 0) {
      console.log("[v0] Initializing Firebase app...")
      app = initializeApp(firebaseConfig)
    } else {
      app = apps[0]
    }
  }
  return app
}

export function getFirebaseMessaging() {
  if (typeof window === "undefined") return null

  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null

  if (!messaging) {
    try {
      messaging = getMessaging(firebaseApp)
      console.log("[v0] Firebase Messaging initialized")
    } catch (error) {
      console.error("[v0] Error initializing Firebase Messaging:", error)
      return null
    }
  }
  return messaging
}

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("[v0] Notifications not supported")
    return "denied"
  }

  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("[v0] Notifications not supported")
    return false
  }

  const permission = Notification.permission

  if (permission === "granted") {
    console.log("[v0] Notification permission already granted")
    return true
  }

  if (permission === "denied") {
    console.log("[v0] Notification permission denied")
    return false
  }

  try {
    console.log("[v0] Requesting notification permission...")
    const result = await Notification.requestPermission()
    console.log("[v0] Permission result:", result)
    return result === "granted"
  } catch (error) {
    console.error("[v0] Error requesting permission:", error)
    return false
  }
}

export async function requestFirebaseNotificationPermission(vapidKey: string): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission()

    if (!hasPermission) {
      console.log("[v0] Notification permission not granted, cannot get FCM token")
      return null
    }

    const messaging = getFirebaseMessaging()
    if (!messaging) {
      console.log("[v0] Firebase Messaging not available")
      return null
    }

    console.log("[v0] Requesting FCM token with VAPID key...")

    if (!vapidKey) {
      console.error("[v0] VAPID key not provided")
      return null
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    })

    if (token) {
      console.log("[v0] FCM registration token received:", token.substring(0, 20) + "...")
      return token
    } else {
      console.log("[v0] No FCM registration token available. Request permission to generate one.")
      return null
    }
  } catch (error) {
    console.error("[v0] Error getting FCM token:", error)
    return null
  }
}

export function onFirebaseMessage(callback: (payload: any) => void) {
  const messaging = getFirebaseMessaging()
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    console.log("[v0] Foreground message received:", payload)
    callback(payload)
  })
}
