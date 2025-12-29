"use client"

import { useEffect } from "react"

/**
 * Автоматически определяет часовой пояс пользователя и сохраняет его
 * Используется для корректного отображения времени и отправки уведомлений
 */
export function TimezoneDetector() {
  useEffect(() => {
    // Определение часового пояса пользователя
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Сохранение в localStorage для использования по всему приложению
    if (timezone) {
      localStorage.setItem("userTimezone", timezone)
      console.log("[v0] Detected timezone:", timezone)
    }

    // Получение текущего времени в формате HH:MM для отладки
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    console.log("[v0] Current time:", currentTime, "Timezone:", timezone)
  }, [])

  return null // Компонент не рендерит UI
}
