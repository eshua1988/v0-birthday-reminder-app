"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [ready, setReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (password.length < 8) {
      setMessage("Пароль должен содержать не менее 8 символов.")
      return
    }
    if (password !== confirmPassword) {
      setMessage("Пароли не совпадают.")
      return
    }

    setIsSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setMessage("Пароль изменён. Открываем приложение…")
    setTimeout(() => router.replace("/"), 1200)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Новый пароль</CardTitle>
          <CardDescription>Задайте новый пароль для своего аккаунта.</CardDescription>
        </CardHeader>
        <CardContent>
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="password">Новый пароль</Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Повторите пароль</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </div>
              {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Сохранение…" : "Сохранить новый пароль"}
              </Button>
            </form>
          ) : (
            <Alert>
              <AlertDescription>
                Откройте эту страницу только по новой ссылке из письма о восстановлении пароля.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
