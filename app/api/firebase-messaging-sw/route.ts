import { NextResponse } from "next/server"

export async function GET() {
  const swContent = `
// Firebase Messaging Service Worker v6
// For background push notifications on Android PWA
console.log('[SW v6] Loading...')

// Firebase config
const firebaseConfig = {
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}",
}

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase
firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

console.log('[SW v6] Firebase initialized')

// Handle push event
self.addEventListener('push', function(event) {
  console.log('[SW v6] Push received')
  
  let data = {}
  
  if (event.data) {
    try {
      const json = event.data.json()
      data = json.data || json.notification || json
    } catch (e) {
      data = { title: 'Уведомление', body: event.data.text() }
    }
  }

  const title = data.title || '🎂 День рождения!'
  const options = {
    body: data.body || 'У кого-то сегодня день рождения!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'notification-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || data.clickAction || '/',
      birthdayId: data.birthdayId || '',
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  
  const url = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true})
      .then(function(clientList) {
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus().then(() => client.navigate(url))
          }
        }
        return clients.openWindow(url)
      })
  )
})

// Firebase background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW v6] Background message:', payload)
})

// Install
self.addEventListener('install', function(event) {
  console.log('[SW v6] Installing')
  self.skipWaiting()
})

// Activate
self.addEventListener('activate', function(event) {
  console.log('[SW v6] Activated')
  event.waitUntil(self.clients.claim())
})
`

  return new NextResponse(swContent, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      // Cache for 1 hour to prevent constant reloads
      "Cache-Control": "public, max-age=3600",
    },
  })
}
