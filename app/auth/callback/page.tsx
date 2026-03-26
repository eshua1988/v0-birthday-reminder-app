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

    // @supabase/ssr createBrowserClient has detectSessionInUrl: true —
    // it automatically calls exchangeCodeForSession when it sees ?code= in URL.
    // We just listen for the result via onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: import("@supabase/supabase-js").Session | null) => {
        if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
          subscription.unsubscribe()
          router.replace("/")
        } else if (event === "INITIAL_SESSION" && !session) {
          subscription.unsubscribe()
          setErrorMsg("Не удалось выполнить вход. Попробуйте снова.")
          setTimeout(() => router.replace("/auth/login"), 3000)
        }
      }
    )

    // Safety timeout: if onAuthStateChange never fires (10s), check session directly
    const timeoutId = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        subscription.unsubscribe()
        router.replace("/")
      } else {
        subscription.unsubscribe()
        setErrorMsg("Время ожидания истекло. Попробуйте войти снова.")
        setTimeout(() => router.replace("/auth/login"), 3000)
      }
    }, 10000)

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
