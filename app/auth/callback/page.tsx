"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // exchangeCodeForSession reads the ?code= from the URL automatically
    supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }: { error: { message: string } | null }) => {
      if (error) {
        console.error("[auth/callback] error:", error.message)
        router.replace("/auth/login?error=auth_callback_failed")
      } else {
        router.replace("/")
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
