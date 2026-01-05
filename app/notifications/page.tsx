"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Trash2, Loader2 } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { useToast } from "@/hooks/use-toast"

export default function NotificationsPage() {
  const { t } = useLocale()
  const { toast } = useToast()
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadTelegram = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)
      const { data: settings } = await supabase
        .from("settings")
        .select("telegram_chat_id, telegram_username")
        .eq("user_id", session.user.id)
        .single()
      if (settings?.telegram_chat_id) {
        setTelegramLinked(true)
        setTelegramUsername(settings.telegram_username)
      }
    }
    loadTelegram()
  }, [])

  const handleLinkTelegram = async () => {
    if (!userId || !linkCode.trim()) return
    setIsLinking(true)
    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, linkCode: linkCode.trim() }),
      })
      const data = await response.json()
      if (response.ok) {
        setTelegramLinked(true)
        setTelegramUsername(data.username)
        toast({ title: t.success || "Успешно", description: t.telegramLinked || "Telegram успешно подключен!" })
      } else {
        toast({ title: t.error || "Ошибка", description: data.message || (t.telegramLinkFailed || "Не удалось подключить Telegram"), variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t.error || "Ошибка", description: t.telegramLinkFailed || "Не удалось подключить Telegram", variant: "destructive" })
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkTelegram = async () => {
    if (!userId) return
    try {
      await supabase.from("settings").update({ telegram_chat_id: null, telegram_username: null }).eq("user_id", userId)
      setTelegramLinked(false)
      setTelegramUsername(null)
      toast({ title: t.success || "Успешно", description: t.telegramUnlinked || "Telegram отключен" })
    } catch (error) {
      toast({ title: t.error || "Ошибка", description: t.telegramUnlinkFailed || "Не удалось отключить Telegram", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-[#0088cc]" />
            Telegram Bot
          </CardTitle>
          <CardDescription>
            {t.telegramBotDescription || "Подключите Telegram для получения уведомлений"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {telegramLinked ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>{t.telegramConnected || "Подключен"}</span>
                    {telegramUsername && (
                      <span className="text-muted-foreground">@{telegramUsername}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Бот: <b>ChurchBirthdayReminderBot</b></span>
                    <button
                      className="ml-2 text-destructive hover:text-red-600"
                      title={t.disconnect || "Отключить Telegram"}
                      onClick={handleUnlinkTelegram}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.telegramRemindersInfo || "Вы будете получать уведомления в Telegram"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">1.</span>
                <a 
                  href="https://t.me/ChurchBirthdayReminderBot" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#0088cc] hover:underline flex items-center gap-1"
                >
                  <Send className="h-4 w-4" />
                  {t.openTelegramBot || "Открыть бота в Telegram"}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">2.</span>
                <span className="text-sm text-muted-foreground">
                  {t.sendStartCommand || "Нажмите /start и скопируйте код"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">3.</span>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder={t.enterCode || "Введите код"}
                    value={linkCode}
                    onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                    className="max-w-[150px] uppercase"
                    maxLength={8}
                  />
                  <Button 
                    onClick={handleLinkTelegram} 
                    disabled={isLinking || !linkCode.trim()}
                    size="sm"
                  >
                    {isLinking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t.connect || "Подключить"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
