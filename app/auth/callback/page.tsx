"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        console.error("[auth/callback] error:", error.message)
        // If in popup — show error briefly then close; otherwise navigate
        if (window.opener) {
          document.title = "Ошибка входа"
          setTimeout(() => window.close(), 2000)
        } else {
          router.replace("/auth/login?error=auth_callback_failed")
        }
      } else {
        // Session is set — Supabase broadcasts SIGNED_IN to all same-origin windows.
        // If in popup, close so the main window can navigate; otherwise go home.
        if (window.opener) {
          window.close()
        } else {
          router.replace("/")
        }
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Выполняется вход...</p>
      </div>
    </div>
  )
}
