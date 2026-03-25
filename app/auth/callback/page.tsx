"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // createBrowserClient automatically detects ?code= in URL and calls
    // exchangeCodeForSession internally (detectSessionInUrl: true by default).
    // We must NOT call it manually again — that would fail with "code already used".
    // Just listen for the SIGNED_IN event which fires after the auto-exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") {
        subscription.unsubscribe()
        // If we're in the popup, close it — main window will navigate via its own listener.
        // If not in popup (e.g. mobile redirect flow), navigate directly.
        if (window.opener) {
          window.close()
        } else {
          router.replace("/")
        }
      } else if (event === "SIGNED_OUT") {
        // Shouldn't happen here, but handle gracefully
        subscription.unsubscribe()
        router.replace("/auth/login")
      }
    })

    return () => subscription.unsubscribe()
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
