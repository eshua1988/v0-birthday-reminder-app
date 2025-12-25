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
        console.log("[v0] No user found, redirecting to login")
        router.push("/auth/login")
        return
      }
      
      console.log("[v0] User loaded:", user.id)
      setUser(user)

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        console.error("[v0] Error loading profile:", {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
          fullError: profileError
        })
        
        if (profileError.message?.includes("relation") || profileError.message?.includes("does not exist")) {
          console.error("[v0] Таблица 'profiles' не найдена. Выполните scripts/010_create_auth_tables.sql")
        }
      } else if (profileData) {
        console.log("[v0] Profile loaded successfully")
        setProfile(profileData)
        setFirstName(profileData.first_name || "")
        setLastName(profileData.last_name || "")
        setPhoneNumber(profileData.phone_number || "")
      } else {
        console.warn("[v0] No profile found for user:", user.id)
      }
    } catch (error: any) {
      console.error("[v0] Exception loading user:", {
        message: error?.message,
        stack: error?.stack,
        fullError: error
      })
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

      if (error) {
        console.error("[v0] Profile update error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        throw error
      }

      console.log("[v0] Profile updated successfully")
      setSuccess("Профиль успешно обновлен")
      await loadUser()
    } catch (error: any) {
      console.error("[v0] Exception updating profile:", {
        message: error?.message,
        fullError: error
      })
      
      let errorMsg = error.message || "Ошибка при обновлении профиля"
      if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
        errorMsg = "Таблица 'profiles' не найдена. Выполните SQL скрипты из DATABASE_SETUP.md"
      } else if (error.message?.includes("policy")) {
        errorMsg = "Ошибка доступа. Проверьте RLS политики для таблицы profiles"
      }
      
      setError(errorMsg)
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

      if (error) {
        console.error("[v0] Password update error:", {
          message: error.message,
          status: error.status,
          fullError: error
        })
        throw error
      }

      console.log("[v0] Password updated successfully")
      setSuccess("Пароль успешно изменен")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("[v0] Exception updating password:", {
        message: error?.message,
        fullError: error
      })
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

    // Проверка размера файла (макс 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError("Размер файла не должен превышать 5MB")
      return
    }

    // Проверка типа файла
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Разрешены только изображения (JPEG, PNG, GIF, WebP)")
      return
    }

    setIsUpdatingProfile(true)

    try {
      // Генерируем уникальное имя файла с timestamp
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const timestamp = Date.now()
      const fileName = `${user.id}/avatar_${timestamp}.${fileExt}`

      console.log("[v0] Uploading avatar:", fileName)

      // Удаляем старый аватар, если он есть
      if (profile?.avatar_url) {
        try {
          // Извлекаем путь из URL
          const urlParts = profile.avatar_url.split("/avatars/")
          if (urlParts.length > 1) {
            const oldPath = urlParts[1]
            console.log("[v0] Removing old avatar:", oldPath)
            await supabase.storage.from("avatars").remove([oldPath])
          }
        } catch (removeError) {
          console.warn("[v0] Could not remove old avatar:", removeError)
          // Продолжаем даже если не удалось удалить старый файл
        }
      }

      // Загружаем новый файл
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        console.error("[v0] Upload error:", {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error,
          fullError: uploadError
        })
        throw uploadError
      }

      console.log("[v0] Upload successful:", uploadData)

      // Получаем публичный URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName)

      console.log("[v0] Public URL:", publicUrl)

      // Обновляем профиль с новым URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)

      if (updateError) {
        console.error("[v0] Profile update error:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          fullError: updateError
        })
        
        // Специфичные подсказки для ошибок базы данных
        if (updateError.message?.includes("relation") || updateError.message?.includes("does not exist")) {
          console.error("[v0] Таблица 'profiles' не найдена. Выполните scripts/010_create_auth_tables.sql")
        } else if (updateError.message?.includes("policy") || updateError.message?.includes("row-level security")) {
          console.error("[v0] Ошибка RLS политик. Проверьте политики для таблицы profiles в Supabase")
        } else if (updateError.message?.includes("violates foreign key")) {
          console.error("[v0] Пользователь не найден в auth.users. Попробуйте выйти и войти снова")
        }
        
        throw updateError
      }

      // Обновляем локальное состояние
      setProfile({ ...profile, avatar_url: publicUrl })
      setSuccess("Фото профиля успешно обновлено!")
      
      // Перезагружаем профиль для обновления в sidebar
      await loadUser()
    } catch (error: any) {
      console.error("[v0] Avatar upload error:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        statusCode: error?.statusCode,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      })
      
      // Специфичные сообщения об ошибках
      let errorMessage = "Ошибка при загрузке фото. Попробуйте еще раз."
      
      if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
        errorMessage = "Таблица 'profiles' не найдена. Выполните SQL скрипты из DATABASE_SETUP.md"
      } else if (error.message?.includes("row-level security") || error.message?.includes("policy")) {
        errorMessage = "Ошибка доступа. Проверьте настройки политик RLS в Supabase."
      } else if (error.message?.includes("not found") || error.message?.includes("bucket")) {
        errorMessage = "Bucket 'avatars' не найден. Создайте его в Supabase Dashboard → Storage (см. STORAGE_SETUP.md)"
      } else if (error.message?.includes("size")) {
        errorMessage = "Файл слишком большой. Максимальный размер: 5MB."
      } else if (error.message?.includes("permission") || error.message?.includes("Unauthorized")) {
        errorMessage = "Недостаточно прав для загрузки. Проверьте политики безопасности."
      } else if (error.message?.includes("foreign key") || error.message?.includes("violates")) {
        errorMessage = "Профиль пользователя не найден. Попробуйте выйти и войти снова."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsUpdatingProfile(false)
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
                  <CardDescription>Загрузите или измените ваше фото (макс. 5MB, JPEG/PNG/GIF/WebP)</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt="Profile" />
                      <AvatarFallback className="text-4xl">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {isUpdatingProfile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                        <RefreshCw className="h-8 w-8 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" asChild disabled={isUpdatingProfile}>
                        <span>
                          <Upload className="mr-2 h-4 w-4" />
                          {isUpdatingProfile ? "Загрузка..." : "Загрузить фото"}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUpdatingProfile}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                  {success && <p className="text-sm text-green-500 text-center">{success}</p>}
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
                  <form action="#" onSubmit={handleProfileUpdate} className="space-y-4">
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
                  <form action="#" onSubmit={handlePasswordChange} className="space-y-4">
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
