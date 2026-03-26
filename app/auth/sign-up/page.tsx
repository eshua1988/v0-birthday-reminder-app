"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Eye, EyeOff, Languages } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const EMAIL_DOMAINS = ["@gmail.com", "@mail.ru", "@yandex.ru", "@outlook.com", "@yahoo.com", "@icloud.com"]

function getCallbackUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://v0-birthday-reminder-app-liart.vercel.app"
  return `${siteUrl}/auth/callback`
}

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const router = useRouter()
  const { t, locale, setLocale } = useLocale()

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

  const handleGoogleSignUp = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getCallbackUrl(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })
      if (error) throw error
      // Browser will redirect to Google automatically
    } catch (error: any) {
      console.log("[v0] Google sign up error:", error.message)
      if (error.message.includes("Provider") || error.message.includes("enabled")) {
        setError(
          "Google регистрация не настроена. Администратор должен настроить Google OAuth в Supabase Dashboard. См. документацию OAUTH_SETUP.md",
        )
      } else {
        setError(error.message || "Ошибка регистрации через Google")
      }
      setIsLoading(false)
    }
  }

  const handleFacebookSignUp = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Initiating Facebook OAuth sign up...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: getCallbackUrl(),
        },
      })

      if (error) {
        console.log("[v0] Facebook OAuth error:", error)
        throw error
      }

      console.log("[v0] Facebook OAuth initiated successfully")
    } catch (error: any) {
      console.log("[v0] Facebook sign up error:", error.message)
      if (error.message.includes("Provider") || error.message.includes("enabled")) {
        setError(
          "Facebook регистрация не настроена. Администратор должен настроить Facebook OAuth в Supabase Dashboard. См. документацию OAUTH_SETUP.md",
        )
      } else {
        setError(error.message || "Ошибка регистрации через Facebook")
      }
      setIsLoading(false)
    }
  }

  const handleAppleSignUp = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Initiating Apple OAuth sign up...")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: getCallbackUrl(),
        },
      })

      if (error) {
        console.log("[v0] Apple OAuth error:", error)
        throw error
      }

      console.log("[v0] Apple OAuth initiated successfully")
    } catch (error: any) {
      console.log("[v0] Apple sign up error:", error.message)
      if (error.message.includes("Provider") || error.message.includes("enabled")) {
        setError(
          "Apple регистрация не настроена. Администратор должен настроить Apple OAuth в Supabase Dashboard. См. документацию OAUTH_SETUP.md",
        )
      } else {
        setError(error.message || "Ошибка регистрации через Apple")
      }
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError("Пароли не совпадают")
      setIsLoading(false)
      return
    }

    console.log("[v0] Attempting sign up for:", email)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/`,
        },
      })

      if (error) {
        console.log("[v0] Sign up error:", error.message)
        throw error
      }

      console.log("[v0] Sign up successful, user:", data.user?.id)

      if (data.user) {
        console.log("[v0] Redirecting to login page after successful registration")
        router.push("/auth/login?registered=true")
      }
    } catch (error: any) {
      console.log("[v0] Sign up failed:", error.message)
      setError(error.message || "Ошибка регистрации")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {/* Language Selector */}
        <div className="mb-4 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Languages className="h-4 w-4" />
                {locale === "ru" ? "RU" : locale === "pl" ? "PL" : "EN"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale("ru")}>
                Русский
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("pl")}>
                Polski
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("en")}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t.signUp}</CardTitle>
            <CardDescription>{t.createAccount}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2 relative">
                  <Label htmlFor="email">{t.email}</Label>
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
                  <Label htmlFor="password">{t.password}</Label>
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

                <div className="grid gap-2">
                  <Label htmlFor="repeat-password">{t.repeatPassword}</Label>
                  <div className="relative">
                    <Input
                      id="repeat-password"
                      type={showRepeatPassword ? "text" : "password"}
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRepeatPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? `${t.signUpButton}...` : t.signUpButton}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {t.alreadyHaveAccount}{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  {t.signInButton}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
