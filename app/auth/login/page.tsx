"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { CheckCircle2, Clock, Eye, EyeOff } from "lucide-react"

const EMAIL_DOMAINS = ["@gmail.com", "@mail.ru", "@yandex.ru", "@outlook.com", "@yahoo.com", "@icloud.com"]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const registered = searchParams.get("registered")
  const timeout = searchParams.get("timeout")

  const handleEmailChange = (value: string) => {
    setEmail(value)
    const hasAt = value.includes("@")
    const hasDomain = EMAIL_DOMAINS.some((domain) => value.endsWith(domain))
    setShowEmailSuggestions(hasAt && !hasDomain && value.split("@")[1].length < 3)
  }

  const selectDomain = (domain: string) => {
    const [localPart] = email.split("@")
    setEmail(localPart + domain)
    setShowEmailSuggestions(false)
  }

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Initiating Google OAuth sign in...")
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        console.log("[v0] Google OAuth error:", error)
        throw error
      }

      console.log("[v0] Google OAuth initiated successfully")
    } catch (error: any) {
      console.log("[v0] Google sign in error:", error.message)
      if (error.message.includes("Provider") || error.message.includes("enabled")) {
        setError(
          "Google вход не настроен. Администратор должен настроить Google OAuth в Supabase Dashboard. См. документацию OAUTH_SETUP.md",
        )
      } else {
        setError(error.message || "Ошибка входа через Google")
      }
      setIsLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Initiating Facebook OAuth sign in...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        console.log("[v0] Facebook OAuth error:", error)
        throw error
      }

      console.log("[v0] Facebook OAuth initiated successfully")
    } catch (error: any) {
      console.log("[v0] Facebook sign in error:", error.message)
      if (error.message.includes("Provider") || error.message.includes("enabled")) {
        setError(
          "Facebook вход не настроен. Администратор должен настроить Facebook OAuth в Supabase Dashboard. См. документацию OAUTH_SETUP.md",
        )
      } else {
        setError(error.message || "Ошибка входа через Facebook")
      }
      setIsLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Initiating Apple OAuth sign in...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (error) {
        console.log("[v0] Apple OAuth error:", error)
        throw error
      }

      console.log("[v0] Apple OAuth initiated successfully")
    } catch (error: any) {
      console.log("[v0] Apple sign in error:", error.message)
      if (error.message.includes("Provider") || error.message.includes("enabled")) {
        setError(
          "Apple вход не настроен. Администратор должен настроить Apple OAuth в Supabase Dashboard. См. документацию OAUTH_SETUP.md",
        )
      } else {
        setError(error.message || "Ошибка входа через Apple")
      }
      setIsLoading(false)
    }
  }

  const handleSwitchAccount = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/sign-up")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    console.log("[v0] Attempting login for:", email)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.log("[v0] Login error:", error.message)
        throw error
      }

      console.log("[v0] Login successful, user:", data.user?.id)
      router.push("/")
      router.refresh()
    } catch (error: any) {
      console.log("[v0] Login failed:", error.message)
      setError(error.message || "Ошибка входа")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Вход</CardTitle>
            <CardDescription>Введите email и пароль для входа</CardDescription>
          </CardHeader>
          <CardContent>
            {registered && (
              <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Регистрация успешна! Теперь вы можете войти в систему.
                </AlertDescription>
              </Alert>
            )}

            {timeout && (
              <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950">
                <Clock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-600">
                  Вы были автоматически выведены из системы из-за неактивности.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Войти через Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={handleFacebookSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Войти через Facebook
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={handleAppleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Войти через Apple
                  </Button>
                </div>

                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-muted"></div>
                  <span className="mx-4 text-sm text-muted-foreground">или</span>
                  <div className="flex-grow border-t border-muted"></div>
                </div>

                <div className="grid gap-2 relative">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@church.com"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => {
                      const hasAt = email.includes("@")
                      const hasDomain = EMAIL_DOMAINS.some((domain) => email.endsWith(domain))
                      setShowEmailSuggestions(hasAt && !hasDomain)
                    }}
                    onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                  />
                  {showEmailSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10">
                      {EMAIL_DOMAINS.map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onClick={() => selectDomain(domain)}
                        >
                          {email.split("@")[0] + domain}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm space-y-2">
                <div>
                  Нет аккаунта?{" "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4">
                    Зарегистрироваться
                  </Link>
                </div>
                <div>
                  <button type="button" onClick={handleSwitchAccount} className="text-muted-foreground hover:underline">
                    Сменить аккаунт
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
