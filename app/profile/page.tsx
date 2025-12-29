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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
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
    setIsUploadingAvatar(true)

    try {
      console.log("[v0] Starting avatar upload for user:", user.id)
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Файл слишком большой. Максимальный размер: 5MB")
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Пожалуйста, выберите изображение")
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`

      console.log("[v0] Uploading to:", fileName)

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          const oldPath = profile.avatar_url.split("/avatars/")[1]
          if (oldPath) {
            console.log("[v0] Removing old avatar:", oldPath)
            await supabase.storage.from("avatars").remove([oldPath])
          }
        } catch (err) {
          console.warn("[v0] Could not delete old avatar:", err)
        }
      }

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        })

      if (uploadError) {
        console.error("[v0] Upload error:", uploadError)
        throw uploadError
      }

      console.log("[v0] Upload successful:", uploadData)

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName)

      console.log("[v0] Public URL:", publicUrl)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        throw updateError
      }

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl })
      setSuccess("Фото профиля успешно обновлено")
      
      // Clear the file input
      e.target.value = ""
    } catch (error: any) {
      console.error("[v0] Avatar upload error:", error)
      setError(error.message || "Ошибка при загрузке фото")
    } finally {
      setIsUploadingAvatar(false)
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
          <p>{t.loading}</p>
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
                  <CardTitle>{t.profilePhoto}</CardTitle>
                  <CardDescription>{t.profilePhotoDescription}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt={t.profilePhoto} />
                    <AvatarFallback className="text-4xl">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {success && <p className="text-sm text-green-500">{success}</p>}
                  <div className="flex gap-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" asChild disabled={isUploadingAvatar}>
                        <span>
                          {isUploadingAvatar ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              {t.uploading}
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {t.uploadPhoto}
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
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
                  <CardDescription>{t.updatePersonalInfo}</CardDescription>
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
                        placeholder={t.placeholderFirstName}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last-name">{t.lastName}</Label>
                      <Input
                        id="last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={t.placeholderLastName}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone-number">{t.phone}</Label>
                      <Input
                        id="phone-number"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={t.placeholderPhone}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? t.saving : t.save}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.changePassword}</CardTitle>
                  <CardDescription>{t.updatePasswordDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-password">{t.newPasswordLabel}</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t.newPasswordPlaceholder}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password">{t.confirmPasswordLabel}</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmPasswordPlaceholder}
                      />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {success && <p className="text-sm text-green-500">{success}</p>}
                    <Button type="submit" disabled={isUpdatingPassword}>
                      {isUpdatingPassword ? t.saving : t.changePassword}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.manageAccount}</CardTitle>
                  <CardDescription>{t.manageAccountDescription}</CardDescription>
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
