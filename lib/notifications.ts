export interface NotificationPermissionState {
  granted: boolean
  denied: boolean
  prompt: boolean
  supported: boolean
}

export function checkNotificationSupport(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { granted: false, denied: false, prompt: false, supported: false }
  }

  return {
    granted: Notification.permission === "granted",
    denied: Notification.permission === "denied",
    prompt: Notification.permission === "default",
    supported: true,
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  } catch (error) {
    console.error("Error requesting notification permission:", error)
    return false
  }
}

export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null
  }

  if (Notification.permission !== "granted") {
    return null
  }

  try {
    return new Notification(title, {
      icon: "/icon-light-32x32.png",
      badge: "/icon-light-32x32.png",
      ...options,
    })
  } catch (error) {
    console.error("Error sending notification:", error)
    return null
  }
}
