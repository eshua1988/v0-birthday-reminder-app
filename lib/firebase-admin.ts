import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

let firebaseAdmin: ReturnType<typeof initializeApp> | null = null

/**
 * Инициализирует Firebase Admin SDK для серверной отправки push-уведомлений
 * Использует синглтон паттерн для предотвращения множественных инициализаций
 */
export function initializeFirebaseAdmin() {
  // Проверяем наличие service account key
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

  if (!serviceAccountKey) {
    console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY не настроен")
    return null
  }

  // Если уже инициализирован, возвращаем существующий экземпляр
  const apps = getApps()
  if (apps.length > 0) {
    console.log("[Firebase Admin] Используется существующий экземпляр")
    firebaseAdmin = apps[0]
    return firebaseAdmin
  }

  try {
    // Парсим service account JSON
    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount

    // Инициализируем Firebase Admin с современным API
    firebaseAdmin = initializeApp({
      credential: cert(serviceAccount),
    })

    console.log("[Firebase Admin] Успешно инициализирован для проекта:", serviceAccount.project_id)
    return firebaseAdmin
  } catch (error) {
    console.error("[Firebase Admin] Ошибка инициализации:", error)
    return null
  }
}

/**
 * Получает экземпляр Firebase Messaging для отправки уведомлений
 * Автоматически инициализирует Firebase Admin если необходимо
 */
export function getFirebaseMessaging() {
  if (!firebaseAdmin) {
    initializeFirebaseAdmin()
  }

  if (!firebaseAdmin) {
    throw new Error("Firebase Admin не инициализирован. Проверьте FIREBASE_SERVICE_ACCOUNT_KEY.")
  }

  return getMessaging(firebaseAdmin)
}

/**
 * Проверяет, настроен ли Firebase Admin SDK
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
}
