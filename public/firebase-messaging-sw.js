// Firebase Cloud Messaging Service Worker

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

// Declare the firebase variable before using it
const firebase = self.firebase

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "YOUR_API_KEY_WILL_BE_REPLACED",
  authDomain: "YOUR_AUTH_DOMAIN_WILL_BE_REPLACED",
  projectId: "YOUR_PROJECT_ID_WILL_BE_REPLACED",
  storageBucket: "YOUR_STORAGE_BUCKET_WILL_BE_REPLACED",
  messagingSenderId: "YOUR_SENDER_ID_WILL_BE_REPLACED",
  appId: "YOUR_APP_ID_WILL_BE_REPLACED",
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message:", payload)

  const notificationTitle = payload.notification?.title || "Напоминание о дне рождения"
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon-light-32x32.png",
    badge: "/icon-light-32x32.png",
    tag: "birthday-notification",
    requireInteraction: true,
    data: payload.data,
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification click:", event)

  event.notification.close()

  // Open the app
  event.waitUntil(clients.openWindow("/"))
})
