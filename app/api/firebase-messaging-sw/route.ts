import { NextResponse } from "next/server"

export async function GET() {
  const swContent = `
// Firebase Cloud Messaging Service Worker
// This worker handles push notifications on all devices (desktop, tablet, mobile)

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

const firebase = self.firebase

console.log('[FCM SW] Service Worker loaded')

// Initialize Firebase with real config from environment
firebase.initializeApp({
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}",
})

console.log('[FCM SW] Firebase initialized with config:', {
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING'}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING'}"
})

const messaging = firebase.messaging()
console.log('[FCM SW] Messaging instance created')

// Handle background messages (when app is in background or closed)
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Received background message:", payload)

  const notificationTitle = payload.notification?.title || "🎂 Напоминание о дне рождения"
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    tag: "birthday-notification",
    requireInteraction: true,
    vibrate: [200, 100, 200],
    renotify: true,
    data: payload.data,
    actions: [
      {
        action: "open",
        title: "Открыть"
      },
      {
        action: "close",
        title: "Закрыть"
      }
    ]
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM SW] Notification click:", event.action)

  event.notification.close()

  if (event.action === "close") {
    return
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === self.registration.scope && "focus" in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    })
  )
})

self.addEventListener("notificationclose", (event) => {
  console.log("[FCM SW] Notification closed:", event.notification.tag)
})

self.addEventListener("activate", (event) => {
  console.log("[FCM SW] Service Worker activated")
  event.waitUntil(clients.claim())
})

self.addEventListener("install", (event) => {
  console.log("[FCM SW] Service Worker installing")
  self.skipWaiting()
})
`

  return new NextResponse(swContent, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  })
}
