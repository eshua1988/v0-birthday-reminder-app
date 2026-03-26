"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const errorParam = url.searchParams.get("error")
    const code = url.searchParams.get("code")

    if (errorParam) {
      setErrorMsg(url.searchParams.get("error_description") || errorParam)
      setTimeout(() => router.replace("/auth/login"), 3000)
      return
    }
    if (!code) {
      router.replace("/auth/login")
      return
    }

    const supabase = createClient()
    let handled = false

    const finish = () => {
      if (handled) return
      handled = true
      // window.close() works for any script-opened popup regardless of COOP/opener state.
      // Google sets COOP:same-origin which nullifies window.opener, but self-close still works.
      window.close()
      // Fallback: if this is NOT a popup (mobile direct redirect), navigate after close fails
      setTimeout(() => router.replace("/"), 500)
    }

    // @supabase/ssr createBrowserClient has detectSessionInUrl: true — it auto-exchanges ?code=.
    // We listen for SIGNED_IN (exchange just done) or INITIAL_SESSION with session (already done).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: import("@supabase/supabase-js").Session | null) => {
        if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
          subscription.unsubscribe()
          finish()
        }
      }
    )

    // Safety timeout: if auto-exchange never fires (15s), check manually
    const timeoutId = setTimeout(async () => {
      if (handled) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        subscription.unsubscribe()
        finish()
      } else {
        setErrorMsg("Время ожидания истекло. Попробуйте войти снова.")
        setTimeout(() => router.replace("/auth/login"), 3000)
      }
    }, 15000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
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
