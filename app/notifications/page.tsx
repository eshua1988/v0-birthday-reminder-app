"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useLocale } from "@/lib/locale-context"
import { useToast } from "@/hooks/use-toast"
import { Send, Trash2, Loader2 } from "lucide-react"


import { Sidebar } from "@/components/sidebar"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

export default function NotificationsPage() {
  const { t } = useLocale();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [deepLinkClicked, setDeepLinkClicked] = useState(false);
  const [deepLinkToken, setDeepLinkToken] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadTelegram = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const { data: settings } = await supabase
        .from("settings")
        .select("telegram_chat_id, telegram_username")
        .eq("user_id", session.user.id)
        .single();
      if (settings?.telegram_chat_id) {
        setTelegramLinked(true);
        setTelegramUsername(settings.telegram_username);
      }
    };
    loadTelegram();
  }, []);

  const handleConnectTelegram = async () => {
    if (!userId) return;
    setIsGeneratingLink(true);
    try {
      const response = await fetch("/api/telegram/generate-deeplink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (response.ok && data.url) {
        window.open(data.url, "_blank");
        setDeepLinkToken(data.token);
        setDeepLinkClicked(true);
      } else {
        toast({ title: t.error || "Ошибка", description: data.error || "Не удалось создать ссылку", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: t.error || "Ошибка", description: "Не удалось создать ссылку", variant: "destructive" });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  useEffect(() => {
    if (!deepLinkClicked || !userId || telegramLinked) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("settings")
        .select("telegram_chat_id, telegram_username")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (data?.telegram_chat_id) {
        setTelegramLinked(true);
        setTelegramUsername(data.telegram_username);
        setDeepLinkClicked(false);
        toast({ title: t.success || "Успешно", description: t.telegramLinked || "Telegram успешно подключен!" });
        clearInterval(interval);
      }
    }, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 2 * 60 * 1000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [deepLinkClicked, userId, telegramLinked]);

  const handleLinkTelegram = async () => {
    if (!userId || !linkCode.trim()) return;
    setIsLinking(true);
    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, linkCode: linkCode.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        setTelegramLinked(true);
        setTelegramUsername(data.username);
        setDeepLinkClicked(false);
        toast({ title: t.success || "Успешно", description: t.telegramLinked || "Telegram успешно подключен!" });
      } else {
        toast({ title: t.error || "Ошибка", description: data.message || (t.telegramLinkFailed || "Не удалось подключить Telegram"), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: t.error || "Ошибка", description: t.telegramLinkFailed || "Не удалось подключить Telegram", variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!userId) return;
    try {
      await supabase.from("settings").update({ telegram_chat_id: null, telegram_username: null }).eq("user_id", userId);
      setTelegramLinked(false);
      setTelegramUsername(null);
      toast({ title: t.success || "Успешно", description: t.telegramUnlinked || "Telegram отключен" });
    } catch (error) {
      toast({ title: t.error || "Ошибка", description: t.telegramUnlinkFailed || "Не удалось отключить Telegram", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className={cn("flex-1 flex flex-col", !isMobile && "md:ml-16")}> 
        <main className={cn("flex-1 p-4 md:p-8", isMobile ? "pt-16 pb-20" : "")}> 
          <div className="container mx-auto max-w-2xl">
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
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>{t.telegramConnected || "Подключен"}</span>
                      </div>
                      <div className="flex flex-col gap-1 pl-6">
                        <span className="text-sm text-muted-foreground">
                          <b>Telegram-аккаунт:</b> {telegramUsername ? <span>@{telegramUsername}</span> : <span className="italic text-destructive">не определён</span>}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          <b>Бот:</b> ChurchBirthdayReminderBot
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 pl-6">
                        <button
                          className="text-destructive hover:text-red-600"
                          title={t.disconnect || "Отключить Telegram"}
                          onClick={handleUnlinkTelegram}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.telegramRemindersInfo || "Вы будете получать уведомления в Telegram"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      onClick={handleConnectTelegram}
                      disabled={isGeneratingLink}
                      className="w-full gap-2 bg-[#0088cc] hover:bg-[#0077bb] text-white"
                    >
                      {isGeneratingLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Подключить Telegram
                    </Button>
                    {deepLinkClicked && (
                      <>
                        <div className="rounded-lg border border-[#0088cc]/30 bg-[#0088cc]/5 p-3 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Если бот не открылся автоматически — отправьте боту эту команду:
                          </p>
                          {deepLinkToken && (
                            <div
                              className="font-mono text-sm font-bold text-center cursor-pointer select-all rounded bg-muted px-3 py-2 tracking-widest"
                              onClick={() => { navigator.clipboard.writeText(`/start ${deepLinkToken}`); toast({ description: "Скопировано" }); }}
                              title="Нажмите чтобы скопировать"
                            >
                              /start {deepLinkToken}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground text-center animate-pulse">Ожидаю подтверждения...</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Или если бот отправил вам код — введите его здесь:</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="КОД"
                            value={linkCode}
                            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                            className="uppercase"
                            maxLength={8}
                          />
                          <Button
                            onClick={handleLinkTelegram}
                            disabled={isLinking || !linkCode.trim()}
                            size="sm"
                            variant="outline"
                          >
                            {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ок"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
