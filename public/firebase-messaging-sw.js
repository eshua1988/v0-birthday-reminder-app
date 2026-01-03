// Firebase Cloud Messaging Service Worker
// This worker handles push notifications on all devices (desktop, tablet, mobile)
// Version: 2026-01-03-v2 - Force cache refresh

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

// Declare the firebase variable before using it
const firebase = self.firebase

console.log('[FCM SW] Service Worker loaded')

// Initialize Firebase in the service worker
// These values will be dynamically replaced by environment variables
firebase.initializeApp({
  apiKey: "YOUR_API_KEY_WILL_BE_REPLACED",
  authDomain: "YOUR_AUTH_DOMAIN_WILL_BE_REPLACED",
  projectId: "YOUR_PROJECT_ID_WILL_BE_REPLACED",
  storageBucket: "YOUR_STORAGE_BUCKET_WILL_BE_REPLACED",
  messagingSenderId: "YOUR_SENDER_ID_WILL_BE_REPLACED",
  appId: "YOUR_APP_ID_WILL_BE_REPLACED",
})

console.log('[FCM SW] Firebase initialized')

const messaging = firebase.messaging()
console.log('[FCM SW] Messaging instance created')

// Handle background messages (when app is in background or closed)
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Received background message:", payload)

  const notificationTitle = payload.notification?.title || "🎂 Напоминание о дне рождения"
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-light-32x32.png",
    badge: "/icon-light-32x32.png",
    tag: "birthday-notification",
    requireInteraction: true,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    renotify: true, // Re-alert even if notification with same tag exists
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

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === self.registration.scope && "focus" in client) {
          return client.focus()
        }
      }
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    })
  )
})

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("[FCM SW] Notification closed:", event.notification.tag)
})

// Service Worker activation
self.addEventListener("activate", (event) => {
  console.log("[FCM SW] Service Worker activated")
  event.waitUntil(clients.claim())
})

// Service Worker installation
self.addEventListener("install", (event) => {
  console.log("[FCM SW] Service Worker installing")
  self.skipWaiting()
})
