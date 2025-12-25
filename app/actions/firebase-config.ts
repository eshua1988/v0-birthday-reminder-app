"use server"

export async function getFirebaseVapidKey() {
  // VAPID key is a public key used for Web Push notifications
  // It is safe to return to the client as it's required by the browser
  // See: https://web.dev/push-notifications-web-push-protocol/
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || null
}
