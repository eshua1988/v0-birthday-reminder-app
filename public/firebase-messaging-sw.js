// Firebase Cloud Messaging Service Worker
// This worker handles push notifications on all devices (desktop, tablet, mobile)
// Version: 2026-01-03-v3 - Add click navigation to birthday and sound

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

  const birthdayId = payload.data?.birthdayId || ''
  const notificationTitle = payload.notification?.title || "🎂 Напоминание о дне рождения"
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    tag: `birthday-${birthdayId || 'notification'}`,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200], // Extended vibration pattern for mobile
    renotify: true, // Re-alert even if notification with same tag exists
    silent: false, // Allow sound
    data: {
      ...payload.data,
      url: birthdayId ? `/?highlight=${birthdayId}` : '/'
    },
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
  console.log("[FCM SW] Notification click:", event.action, event.notification.data)

  event.notification.close()

  if (event.action === "close") {
    return
  }

  // Get the URL to open (with birthday id if available)
  const urlToOpen = event.notification.data?.url || '/'
  const fullUrl = new URL(urlToOpen, self.registration.scope).href

  console.log("[FCM SW] Opening URL:", fullUrl)

  // Open or focus the app with the birthday highlighted
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, navigate and focus it
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(fullUrl).then(() => client.focus())
        }
      }
      // Otherwise, open new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl)
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
