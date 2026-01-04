"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Birthday } from "@/types/birthday"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useLocale } from "@/lib/locale-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { MessageSquareHeart, User, Calendar, Mic, Square, Trash2, Save, Loader2, Users, CheckSquare, ChevronDown, ChevronUp, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Input } from "@/components/ui/input"

interface Greeting {
  id: string
  birthday_id: string
  text: string | null
  audio_url: string | null
  created_at: string
  updated_at: string
}

export default function GreetingsPage() {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const { toast } = useToast()
  
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [greetings, setGreetings] = useState<Record<string, Greeting>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBirthday, setSelectedBirthday] = useState<Birthday | null>(null)
  const [selectedBirthdays, setSelectedBirthdays] = useState<Set<string>>(new Set())
  const [greetingText, setGreetingText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isListExpanded, setIsListExpanded] = useState(false)
  
  // Telegram integration
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      setUserId(session.user.id)

      // Load birthdays
      const { data: birthdaysData } = await supabase
        .from("birthdays")
        .select("*")
        .eq("user_id", session.user.id)
        .order("first_name", { ascending: true })

      if (birthdaysData) {
        setBirthdays(birthdaysData)
      }

      // Load greetings
      const { data: greetingsData } = await supabase
        .from("greetings")
        .select("*")
        .eq("user_id", session.user.id)

      if (greetingsData) {
        const greetingsMap: Record<string, Greeting> = {}
        greetingsData.forEach((g: Greeting) => {
          greetingsMap[g.birthday_id] = g
        })
        setGreetings(greetingsMap)
      }
      
      // Check Telegram connection
      const { data: settings } = await supabase
        .from("settings")
        .select("telegram_chat_id, telegram_username")
        .eq("user_id", session.user.id)
        .single()
      
      if (settings?.telegram_chat_id) {
        setTelegramLinked(true)
        setTelegramUsername(settings.telegram_username)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

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
        setLinkCode("")
        toast({
          title: t.success || "Успешно",
          description: t.telegramLinked || "Telegram успешно подключен!",
        })
      } else {
        toast({
          title: t.error || "Ошибка",
          description: data.error === "Code expired" 
            ? (t.telegramCodeExpired || "Код истёк. Получите новый в боте.")
            : (t.telegramLinkFailed || "Не удалось подключить Telegram"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error linking Telegram:", error)
      toast({
        title: t.error || "Ошибка",
        description: t.telegramLinkFailed || "Не удалось подключить Telegram",
        variant: "destructive",
      })
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkTelegram = async () => {
    if (!userId) return
    
    try {
      await supabase
        .from("settings")
        .update({ telegram_chat_id: null, telegram_username: null })
        .eq("user_id", userId)
      
      setTelegramLinked(false)
      setTelegramUsername(null)
      toast({
        title: t.success || "Успешно",
        description: t.telegramUnlinked || "Telegram отключен",
      })
    } catch (error) {
      console.error("Error unlinking Telegram:", error)
    }
  }

  const handleToggleBirthday = (birthdayId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedBirthdays(prev => {
      const newSet = new Set(prev)
      if (newSet.has(birthdayId)) {
        newSet.delete(birthdayId)
      } else {
        newSet.add(birthdayId)
      }
      return newSet
    })
  }

  const handleSelectBirthday = (birthday: Birthday) => {
    // If clicking on already selected, deselect
    if (selectedBirthday?.id === birthday.id) {
      setSelectedBirthday(null)
      setGreetingText("")
      setAudioUrl(null)
      setAudioBlob(null)
      return
    }
    
    setSelectedBirthday(birthday)
    setSelectedBirthdays(new Set()) // Clear multi-select when selecting single
    const existing = greetings[birthday.id]
    if (existing) {
      setGreetingText(existing.text || "")
      setAudioUrl(existing.audio_url)
      setAudioBlob(null)
    } else {
      setGreetingText("")
      setAudioUrl(null)
      setAudioBlob(null)
    }
  }

  const handleSelectAll = () => {
    setSelectedBirthday(null) // Clear single select
    if (selectedBirthdays.size === birthdays.length) {
      setSelectedBirthdays(new Set())
    } else {
      setSelectedBirthdays(new Set(birthdays.map(b => b.id)))
    }
  }

  const getSelectedBirthdaysList = () => {
    return birthdays.filter(b => selectedBirthdays.has(b.id))
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: t.error || "Ошибка",
        description: t.microphoneAccessDenied || "Нет доступа к микрофону",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const deleteRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
  }

  const handleSave = async () => {
    // Determine which birthdays to save for
    const birthdaysToSave = selectedBirthdays.size > 0 
      ? Array.from(selectedBirthdays)
      : selectedBirthday ? [selectedBirthday.id] : []
    
    if (birthdaysToSave.length === 0) return

    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let uploadedAudioUrl = audioUrl

      // Upload audio if new recording exists
      if (audioBlob) {
        const fileName = `${session.user.id}/shared_${Date.now()}.webm`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("greetings")
          .upload(fileName, audioBlob, {
            contentType: "audio/webm",
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: urlData } = supabase.storage
          .from("greetings")
          .getPublicUrl(fileName)

        uploadedAudioUrl = urlData.publicUrl
      }

      // Save greeting for each selected birthday
      let savedCount = 0
      for (const birthdayId of birthdaysToSave) {
        const existingGreeting = greetings[birthdayId]

        if (existingGreeting) {
          // Update existing
          const { error } = await supabase
            .from("greetings")
            .update({
              text: greetingText || null,
              audio_url: uploadedAudioUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingGreeting.id)

          if (!error) savedCount++
        } else {
          // Create new
          const { error } = await supabase
            .from("greetings")
            .insert({
              user_id: session.user.id,
              birthday_id: birthdayId,
              text: greetingText || null,
              audio_url: uploadedAudioUrl,
            })

          if (!error) savedCount++
        }
      }

      toast({
        title: t.success || "Успешно",
        description: savedCount === 1 
          ? (t.greetingSaved || "Поздравление сохранено")
          : `${t.greetingsSaved || "Сохранено поздравлений"}: ${savedCount}`,
      })

      setSelectedBirthday(null)
      setSelectedBirthdays(new Set())
      setGreetingText("")
      setAudioUrl(null)
      setAudioBlob(null)
      await loadData()
    } catch (error) {
      console.error("Error saving greeting:", error)
      toast({
        title: t.error || "Ошибка",
        description: t.saveFailed || "Не удалось сохранить",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
  }

  const getUpcomingBirthdays = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to start of day
    
    const sorted = [...birthdays].sort((a, b) => {
      const dateA = new Date(a.birth_date)
      const dateB = new Date(b.birth_date)
      
      // Set to current year for comparison
      dateA.setFullYear(today.getFullYear())
      dateA.setHours(0, 0, 0, 0)
      dateB.setFullYear(today.getFullYear())
      dateB.setHours(0, 0, 0, 0)
      
      // If date has passed (strictly before today), move to next year
      if (dateA < today) dateA.setFullYear(today.getFullYear() + 1)
      if (dateB < today) dateB.setFullYear(today.getFullYear() + 1)
      
      return dateA.getTime() - dateB.getTime()
    })
    return sorted
  }

  const hasGreeting = (birthdayId: string) => {
    const g = greetings[birthdayId]
    return g && (g.text || g.audio_url)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-16">
        <main className={cn("flex-1 p-4 md:p-6", isMobile ? "pt-16 pb-20" : "")}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquareHeart className="h-8 w-8 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">{t.greetings || "Поздравления"}</h1>
            </div>

            <p className="text-muted-foreground mb-6">
              {t.greetingsDescription || "Запишите текстовое или голосовое поздравление для каждого участника. Оно будет показано в день рождения."}
            </p>

            {/* Telegram Integration Card */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Send className="h-5 w-5 text-[#0088cc]" />
                  Telegram Bot
                </CardTitle>
                <CardDescription>
                  {t.telegramBotDescription || "Подключите Telegram для получения поздравлений"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {telegramLinked ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span>{t.telegramConnected || "Подключен"}</span>
                        {telegramUsername && (
                          <span className="text-muted-foreground">@{telegramUsername}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/telegram/test", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId, testBirthday: true }),
                              })
                              if (res.ok) {
                                toast({
                                  title: t.success || "Успешно",
                                  description: t.testMessageSent || "Тестовое сообщение отправлено в Telegram",
                                })
                              } else {
                                throw new Error("Failed")
                              }
                            } catch {
                              toast({
                                title: t.error || "Ошибка",
                                description: t.testMessageFailed || "Не удалось отправить",
                                variant: "destructive",
                              })
                            }
                          }}
                        >
                          {t.testMessage || "Тест"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleUnlinkTelegram}>
                          {t.disconnect || "Отключить"}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.telegramRemindersInfo || "Вы будете получать напоминания о днях рождения в Telegram"}
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

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Birthday list - collapsible */}
                <Card>
                  <CardHeader 
                    className="cursor-pointer select-none"
                    onClick={() => setIsListExpanded(!isListExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t.selectPersons || "Выберите участников"}
                        {(selectedBirthday || selectedBirthdays.size > 0) && (
                          <span className="text-sm font-normal text-muted-foreground">
                            ({selectedBirthdays.size > 0 ? selectedBirthdays.size : 1} {t.selected || "выбрано"})
                          </span>
                        )}
                      </div>
                      {isListExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                    {!isListExpanded && (selectedBirthday || selectedBirthdays.size > 0) && (
                      <CardDescription>
                        {selectedBirthdays.size > 0 
                          ? getSelectedBirthdaysList().map(b => b.first_name).join(", ")
                          : selectedBirthday?.first_name + " " + selectedBirthday?.last_name
                        }
                      </CardDescription>
                    )}
                  </CardHeader>
                  {isListExpanded && (
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">{t.sortedByUpcoming || "Отсортировано по ближайшим дням рождения"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
                          className="h-auto py-1 px-2"
                        >
                          <CheckSquare className="h-4 w-4 mr-1" />
                          {selectedBirthdays.size === birthdays.length 
                            ? (t.deselectAll || "Снять все") 
                            : (t.selectAll || "Выбрать все")}
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {getUpcomingBirthdays().map((birthday) => (
                          <div
                            key={birthday.id}
                            onClick={() => { handleSelectBirthday(birthday); setIsListExpanded(false); }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                              selectedBirthday?.id === birthday.id
                                ? "border-primary bg-primary/10 ring-2 ring-primary"
                                : selectedBirthdays.has(birthday.id)
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-accent"
                            )}
                          >
                            <Checkbox
                              checked={selectedBirthdays.has(birthday.id)}
                              onCheckedChange={() => {}}
                              onClick={(e) => handleToggleBirthday(birthday.id, e)}
                              className="cursor-pointer"
                            />
                            {birthday.photo_url ? (
                              <Image
                                src={birthday.photo_url}
                                alt={birthday.first_name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {birthday.first_name} {birthday.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(birthday.birth_date)}
                              </p>
                            </div>
                            {hasGreeting(birthday.id) && (
                              <MessageSquareHeart className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                          </div>
                        ))}
                        {birthdays.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">
                            {t.noBirthdays || "Нет участников"}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Greeting editor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareHeart className="h-5 w-5" />
                      {selectedBirthdays.size > 0
                        ? `${t.greetingForSelected || "Поздравление для"} ${selectedBirthdays.size} ${t.persons || "чел."}`
                        : selectedBirthday
                        ? `${t.greetingFor || "Поздравление для"} ${selectedBirthday.first_name}`
                        : t.selectPersonToGreet || "Выберите участника для поздравления"
                      }
                    </CardTitle>
                    {selectedBirthdays.size > 0 && (
                      <CardDescription>
                        {getSelectedBirthdaysList().map(b => b.first_name).join(", ")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {(selectedBirthdays.size > 0 || selectedBirthday) ? (
                      <div className="space-y-4">
                        {/* Text greeting */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {t.textGreeting || "Текстовое поздравление"}
                          </label>
                          <Textarea
                            value={greetingText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGreetingText(e.target.value)}
                            placeholder={t.writeGreetingPlaceholder || "Напишите ваше поздравление..."}
                            className="min-h-[150px]"
                          />
                        </div>

                        {/* Voice greeting */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {t.voiceGreeting || "Голосовое поздравление"}
                          </label>
                          
                          <div className="flex items-center gap-2">
                            {!isRecording ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={startRecording}
                                className="flex items-center gap-2"
                              >
                                <Mic className="h-4 w-4" />
                                {t.startRecording || "Начать запись"}
                              </Button>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={stopRecording}
                                className="flex items-center gap-2"
                              >
                                <Square className="h-4 w-4" />
                                {t.stopRecording || "Остановить"}
                              </Button>
                            )}

                            {isRecording && (
                              <span className="text-sm text-red-500 animate-pulse flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full" />
                                {t.recording || "Запись..."}
                              </span>
                            )}
                          </div>

                          {audioUrl && (
                            <div className="mt-3 flex items-center gap-2">
                              <audio src={audioUrl} controls className="flex-1 h-10" />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={deleteRecording}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Save button */}
                        <Button
                          onClick={handleSave}
                          disabled={isSaving || (!greetingText && !audioUrl)}
                          className="w-full"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          {selectedBirthdays.size > 1 
                            ? `${t.saveGreetings || "Сохранить поздравления"} (${selectedBirthdays.size})`
                            : (t.saveGreeting || "Сохранить поздравление")
                          }
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <MessageSquareHeart className="h-12 w-12 mb-4 opacity-50" />
                        <p>{t.selectPersonFirst || "Сначала выберите участника из списка"}</p>
                        <p className="text-xs mt-2">{t.selectMultipleHint || "Используйте чекбоксы для выбора нескольких"}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
