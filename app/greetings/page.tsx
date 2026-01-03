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
import { MessageSquareHeart, User, Calendar, Mic, Square, Trash2, Save, Loader2, Users, CheckSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

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
  const [selectedBirthdays, setSelectedBirthdays] = useState<Set<string>>(new Set())
  const [greetingText, setGreetingText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

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
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleBirthday = (birthdayId: string) => {
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

  const handleSelectAll = () => {
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
    if (selectedBirthdays.size === 0) return

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
      for (const birthdayId of selectedBirthdays) {
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
        if (!error) savedCount++
        }
      }

      toast({
        title: t.success || "Успешно",
        description: `${t.greetingsSaved || "Сохранено поздравлений"}: ${savedCount}`,
      })

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
      <div className="flex-1 flex flex-col">
        <main className={cn("flex-1 p-4 md:p-6", isMobile && "pb-20")}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquareHeart className="h-8 w-8 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">{t.greetings || "Поздравления"}</h1>
            </div>

            <p className="text-muted-foreground mb-6">
              {t.greetingsDescription || "Запишите текстовое или голосовое поздравление для каждого участника. Оно будет показано в день рождения."}
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Birthday list */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t.selectPersons || "Выберите участников"}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span>{t.sortedByUpcoming || "Отсортировано по ближайшим дням рождения"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="h-auto py-1 px-2"
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        {selectedBirthdays.size === birthdays.length 
                          ? (t.deselectAll || "Снять все") 
                          : (t.selectAll || "Выбрать все")}
                      </Button>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {getUpcomingBirthdays().map((birthday) => (
                        <div
                          key={birthday.id}
                          onClick={() => handleToggleBirthday(birthday.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            selectedBirthdays.has(birthday.id)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-accent"
                          )}
                        >
                          <Checkbox
                            checked={selectedBirthdays.has(birthday.id)}
                            onCheckedChange={() => handleToggleBirthday(birthday.id)}
                            onClick={(e) => e.stopPropagation()}
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
                </Card>

                {/* Greeting editor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareHeart className="h-5 w-5" />
                      {selectedBirthdays.size > 0
                        ? `${t.greetingForSelected || "Поздравление для"} ${selectedBirthdays.size} ${t.persons || "чел."}`
                        : t.selectPersonsToGreet || "Выберите участников для поздравления"
                      }
                    </CardTitle>
                    {selectedBirthdays.size > 0 && (
                      <CardDescription>
                        {getSelectedBirthdaysList().map(b => b.first_name).join(", ")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {selectedBirthdays.size > 0 ? (
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
                        <p>{t.selectPersonsFirst || "Сначала выберите участников из списка"}</p>
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
