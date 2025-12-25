"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, LogOut, RefreshCw } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

      if (profileData) {
        setProfile(profileData)
        setFirstName(profileData.first_name || "")
        setLastName(profileData.last_name || "")
        setPhoneNumber(profileData.phone_number || "")
      }
    } catch (error) {
      console.error("[v0] Error loading user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsUpdatingProfile(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        })
        .eq("id", user.id)

      if (error) throw error

      setSuccess("Профиль успешно обновлен")
      await loadUser()
    } catch (error: any) {
      setError(error.message || "Ошибка при обновлении профиля")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    if (newPassword.length < 6) {
      setError("Пароль должен содержать минимум 6 символов")
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setSuccess("Пароль успешно изменен")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      setError(error.message || "Ошибка при изменении пароля")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setError(null)
    setSuccess(null)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split("/").pop()
        await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`])
      }

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, {
        upsert: true,
      })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName)

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setSuccess("Фото профиля обновлено")
    } catch (error: any) {
      setError(error.message || "Ошибка при загрузке фото")
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const handleSwitchAccount = async () => {
    await supabase.auth.signOut()
    router.push("/auth/sign-up")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className={cn("flex-1 flex items-center justify-center", !isMobile && "ml-16")}>
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className={cn("flex-1", !isMobile && "ml-16")}>
        <Header
          viewMode="cards"
          onViewModeChange={() => {}}
          canUndo={false}
          canRedo={false}
          onUndo={() => {}}
          onRedo={() => {}}
        />

        <main className={cn(isMobile ? "p-4" : "p-8")}>
          <div className="container mx-auto max-w-2xl">
            <h1 className="mb-6 text-3xl font-bold">{t.userProfile}</h1>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Фото профиля</CardTitle>
                  <CardDescription>Загрузите или измените ваше фото</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback className="text-4xl">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          Загрузить фото
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email</CardTitle>
                  <CardDescription>Ваш адрес электронной почты</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{user?.email}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.personalInfo}</CardTitle>
                  <CardDescription>Обновите вашу личную информацию</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="first-name">{t.firstName}</Label>
                      <Input
                        id="first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Иван"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last-name">{t.lastName}</Label>
                      <Input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Иванов"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone-number">{t.phone}</Label>
                      <Input
                        id="phone-number"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+7 900 123 45 67"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? "Сохранение..." : t.save}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Изменить пароль</CardTitle>
                  <CardDescription>Обновите ваш пароль для входа</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">Новый пароль</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">Подтвердите пароль</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите новый пароль"
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    <Button type="submit" disabled={isUpdatingPassword}>
                      {isUpdatingPassword ? "Сохранение..." : "Изменить пароль"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Управление аккаунтом</CardTitle>
                  <CardDescription>Выйти или сменить аккаунт</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleSwitchAccount}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t.switchAccount}
                  </Button>
                  <Button variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {t.logout}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
