"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Автоматически определяет часовой пояс пользователя и сохраняет его
 * Используется для корректного отображения времени и отправки уведомлений
 */
export function TimezoneDetector() {
  useEffect(() => {
    const saveTimezone = async () => {
      // Определение часового пояса пользователя
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      // Сохранение в localStorage для использования по всему приложению
      if (timezone) {
        localStorage.setItem("userTimezone", timezone)
        console.log("[v0] Detected timezone:", timezone)
        
        // Сохранение в базу данных для серверных операций
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Проверка существующей настройки
          const { data: existing } = await supabase
            .from("settings")
            .select("*")
            .eq("user_id", user.id)
            .eq("key", "timezone")
            .maybeSingle()
          
          if (!existing || existing.value !== timezone) {
            // Сохранение или обновление часового пояса
            const { error } = await supabase.from("settings").upsert(
              {
                user_id: user.id,
                key: "timezone",
                value: timezone,
              },
              {
                onConflict: "user_id,key",
              }
            )
            
            if (error) {
              console.error("[v0] Error saving timezone:", error)
            } else {
              console.log("[v0] Timezone saved to database:", timezone)
            }
          }
        }
      }

      // Получение текущего времени в формате HH:MM для отладки
      const now = new Date()
      const localTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
      const utcTime = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}`
      console.log("[v0] Local time:", localTime, "UTC time:", utcTime, "Timezone:", timezone)
    }
    
    saveTimezone()
  }, [])

  return null // Компонент не рендерит UI
}
