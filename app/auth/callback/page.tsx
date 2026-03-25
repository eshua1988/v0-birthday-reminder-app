"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let handled = false

    const finishAuth = () => {
      if (handled) return
      handled = true
      // COOP from Google may nullify window.opener — treat null opener as regular navigation
      if (window.opener) {
        window.close()
      } else {
        router.replace("/")
      }
    }

    const run = async () => {
      const url = new URL(window.location.href)

      // Surface OAuth errors returned by the provider
      const errorParam = url.searchParams.get("error")
      const errorDescription = url.searchParams.get("error_description")
      if (errorParam) {
        setErrorMsg(errorDescription || errorParam)
        setTimeout(() => router.replace("/auth/login"), 3000)
        return
      }

      const code = url.searchParams.get("code")
      if (!code) {
        // No code and no error — nothing to do
        router.replace("/auth/login")
        return
      }

      // 1. Check if detectSessionInUrl already exchanged the code before we got here
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        finishAuth()
        return
      }

      // 2. Explicit exchange (detectSessionInUrl race-condition fallback)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (exchangeError) {
        // If "code already used", the session should now exist
        const { data: { session: retrySession } } = await supabase.auth.getSession()
        if (retrySession) {
          finishAuth()
        } else {
          setErrorMsg(exchangeError.message)
          setTimeout(() => router.replace("/auth/login"), 3000)
        }
        return
      }

      finishAuth()
    }

    // Also listen for SIGNED_IN broadcast from another tab / the auto-exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: import("@supabase/supabase-js").Session | null) => {
      if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
        subscription.unsubscribe()
        finishAuth()
      }
    })

    run()

    return () => subscription.unsubscribe()
  }, [router])

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <p className="text-sm font-medium">Ошибка входа</p>
          <p className="text-xs text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm">Выполняется вход...</p>
      </div>
    </div>
  )
}
