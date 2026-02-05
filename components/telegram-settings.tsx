"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageCircle, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const supabase = createClient()
const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "BirthdayReminderBot"

export const TelegramSettings: React.FC = () => {
  const { toast } = useToast()
  const [linkCode, setLinkCode] = useState("")
  const [isLinked, setIsLinked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [codeError, setCodeError] = useState("")

  useEffect(() => {
    loadTelegramStatus()
  }, [])

  const loadTelegramStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: settings } = await supabase
        .from("settings")
        .select("telegram_chat_id")
        .eq("user_id", user.id)
        .single()

      setIsLinked(!!settings?.telegram_chat_id)
    } catch (e) {
      console.error("Failed to load telegram status", e)
    }
  }

  const handleLinkCode = async () => {
    if (!linkCode.trim()) {
      setCodeError("Введите код привязки")
      return
    }

    setIsLoading(true)
    setCodeError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Find pending link by code
      const { data: pending } = await supabase
        .from("telegram_pending_links")
        .select("chat_id")
        .eq("link_code", linkCode.toUpperCase())
        .single()

      if (!pending) {
        setCodeError("Код не найден или истёк. Попросите новый у бота.")
        setIsLoading(false)
        return
      }

      // Link the telegram chat to user
      const { error: linkError } = await supabase
        .from("settings")
        .upsert({
          user_id: user.id,
          key: "telegram_chat_id",
          value: pending.chat_id,
        }, { onConflict: "user_id,key" })

      if (linkError) throw linkError

      // Clean up pending link
      await supabase
        .from("telegram_pending_links")
        .delete()
        .eq("link_code", linkCode.toUpperCase())

      setLinkCode("")
      setIsLinked(true)
      toast({ title: "Успешно", description: "Telegram успешно подключен!" })
    } catch (e: any) {
      console.error("Failed to link telegram", e)
      setCodeError(e?.message || "Ошибка при привязке")
      toast({ title: "Ошибка", description: e?.message || "Не удалось привязать Telegram", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnlink = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("settings")
        .delete()
        .eq("user_id", user.id)
        .eq("key", "telegram_chat_id")

      if (error) throw error

      setIsLinked(false)
      toast({ title: "Успешно", description: "Telegram отключен" })
    } catch (e: any) {
      console.error("Failed to unlink telegram", e)
      toast({ title: "Ошибка", description: e?.message || "Не удалось отключить Telegram", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestMessage = async () => {
    setIsSending(true)
    try {
      const response = await fetch("/api/telegram/test", {
        method: "GET",
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to send test message")
      }

      toast({ title: "Успешно", description: "Тестовое сообщение отправлено в Telegram" })
    } catch (e: any) {
      console.error("Failed to send test message", e)
      toast({ title: "Ошибка", description: e?.message || "Не удалось отправить сообщение", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle>Telegram</CardTitle>
              <CardDescription>Получайте уведомления в Telegram</CardDescription>
            </div>
          </div>
          {isLinked && <CheckCircle className="h-5 w-5 text-green-500" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Ваш аккаунт успешно подключен к Telegram. Вы будете получать уведомления о днях рождения.
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTestMessage} disabled={isSending} variant="outline">
                {isSending ? "Отправка..." : "Отправить тест"}
              </Button>
              <Button onClick={handleUnlink} disabled={isLoading} variant="destructive">
                Отключить Telegram
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Telegram не подключен. Следуйте инструкциям для привязки.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">1. Откройте бота в Telegram</Label>
                <Button
                  onClick={() => window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}`, "_blank")}
                  variant="outline"
                  className="w-full mt-2"
                >
                  Открыть бота
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium">2. Отправьте команду /start боту</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Бот ответит кодом привязки
                </p>
              </div>

              <div>
                <Label htmlFor="link-code" className="text-sm font-medium">3. Введите код здесь</Label>
                <Input
                  id="link-code"
                  value={linkCode}
                  onChange={(e) => {
                    setLinkCode(e.target.value)
                    if (codeError) setCodeError("")
                  }}
                  placeholder="Например: ABC12345"
                  className={codeError ? "border-red-500" : ""}
                />
                {codeError && <p className="text-xs text-red-500 mt-1">{codeError}</p>}
              </div>

              <Button
                onClick={handleLinkCode}
                disabled={isLoading || !linkCode.trim()}
                className="w-full"
              >
                {isLoading ? "Привязка..." : "Привязать Telegram"}
              </Button>
            </div>

            <details className="pt-2 border-t">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Нужна помощь с настройкой?
              </summary>
              <div className="mt-3 text-sm text-muted-foreground space-y-2">
                <p>📚 <a href="/TELEGRAM_BOT_SETUP.md" className="text-blue-500 hover:underline">Полное руководство</a></p>
                <p>💬 <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=help`} className="text-blue-500 hover:underline">Спросить у бота /help</a></p>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TelegramSettings
