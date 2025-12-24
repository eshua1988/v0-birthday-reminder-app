"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 минут в миллисекундах

export function InactivityLogout() {
  const router = useRouter()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      console.log("[v0] User inactive for 10 minutes, logging out...")
      await supabase.auth.signOut()
      router.push("/auth/login?timeout=true")
      router.refresh()
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        console.log("[v0] Starting inactivity timer for user:", user.id)
        resetTimer()
      }
    }

    checkUser()

    events.forEach((event) => {
      window.addEventListener(event, resetTimer)
    })

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [])

  return null
}
