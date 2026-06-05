"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CalendarClock, ChevronLeft, ChevronRight, Clock, Plus, Trash2 } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type ManualReminder = {
  id: string
  date: string
  time: string
  fullName: string
  text: string
  telegramPrivate: string
  telegramGroup: string
  sendPrivate: boolean
  sendGroup: boolean
  createdAt: string
  sentPrivateAt?: string
  sentGroupAt?: string
}

const SETTINGS_KEY = "manual_reminders"

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getFirstDayOffset(date: Date) {
  const day = startOfMonth(date).getDay()
  return day === 0 ? 6 : day - 1
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function makeEmptyReminder(date: string): ManualReminder {
  return {
    id: crypto.randomUUID(),
    date,
    time: "09:00",
    fullName: "",
    text: "",
    telegramPrivate: "",
    telegramGroup: "",
    sendPrivate: true,
    sendGroup: false,
    createdAt: new Date().toISOString(),
  }
}

export default function RemindersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [reminders, setReminders] = useState<ManualReminder[]>([])
  const [draft, setDraft] = useState<ManualReminder>(() => makeEmptyReminder(formatDateKey(new Date())))
  const [isSaving, setIsSaving] = useState(false)

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ]
  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace("/auth/login")
          return
        }

        setUserId(user.id)
        const { data, error } = await supabase
          .from("settings")
          .select("value")
          .eq("user_id", user.id)
          .eq("key", SETTINGS_KEY)
          .maybeSingle()

        if (error) throw error

        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value)
            setReminders(Array.isArray(parsed) ? parsed : [])
          } catch {
            setReminders([])
          }
        }
      } catch (error: any) {
        toast({
          title: "Ошибка загрузки",
          description: error?.message || "Не удалось загрузить напоминания",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [router, supabase, toast])

  const remindersByDate = useMemo(() => {
    return reminders.reduce<Record<string, ManualReminder[]>>((acc, reminder) => {
      if (!acc[reminder.date]) acc[reminder.date] = []
      acc[reminder.date].push(reminder)
      return acc
    }, {})
  }, [reminders])

  const selectedReminders = selectedDate ? remindersByDate[selectedDate] || [] : []

  const saveReminders = async (nextReminders: ManualReminder[]) => {
    if (!userId) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from("settings").upsert(
        {
          user_id: userId,
          key: SETTINGS_KEY,
          value: JSON.stringify(nextReminders),
        },
        { onConflict: "user_id,key" },
      )

      if (error) throw error
      setReminders(nextReminders)
    } finally {
      setIsSaving(false)
    }
  }

  const openDate = (dateKey: string) => {
    setSelectedDate(dateKey)
    setDraft(makeEmptyReminder(dateKey))
  }

  const addReminder = async () => {
    if (!draft.fullName.trim() || !draft.text.trim()) {
      toast({
        title: "Заполните данные",
        description: "Нужно указать имя/фамилию и текст напоминания",
        variant: "destructive",
      })
      return
    }

    if ((draft.sendPrivate && !draft.telegramPrivate.trim()) || (draft.sendGroup && !draft.telegramGroup.trim())) {
      toast({
        title: "Укажите Telegram",
        description: "Для выбранных отправок нужен Telegram ID, @username или chat id группы",
        variant: "destructive",
      })
      return
    }

    const nextReminder = {
      ...draft,
      fullName: draft.fullName.trim(),
      text: draft.text.trim(),
      telegramPrivate: draft.telegramPrivate.trim(),
      telegramGroup: draft.telegramGroup.trim(),
    }
    const next = [...reminders, nextReminder].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))

    try {
      await saveReminders(next)
      setDraft(makeEmptyReminder(draft.date))
      toast({ title: "Напоминание добавлено", description: "Оно появилось в календаре" })
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error?.message || "Не удалось сохранить напоминание",
        variant: "destructive",
      })
    }
  }

  const deleteReminder = async (id: string) => {
    try {
      await saveReminders(reminders.filter((reminder) => reminder.id !== id))
      toast({ title: "Напоминание удалено" })
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error?.message || "Не удалось удалить напоминание",
        variant: "destructive",
      })
    }
  }

  const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, index) => index + 1)
  const emptyDays = Array.from({ length: getFirstDayOffset(currentDate) })
  const todayKey = formatDateKey(new Date())

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className={cn("flex-1", isMobile ? "p-4 pt-20" : "p-8 pt-10 md:ml-16")}>
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>Календарь напоминаний</h1>
                <p className="text-muted-foreground">Записывайте напоминания и отправляйте их через Telegram</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <span className="text-sm font-normal text-muted-foreground">{reminders.length} напоминаний</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">Загрузка...</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
                    {weekDays.map((day) => (
                      <div key={day} className="py-2">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {emptyDays.map((_, index) => (
                      <div key={`empty-${index}`} className="min-h-24 rounded-lg border border-transparent" />
                    ))}
                    {days.map((day) => {
                      const dateKey = formatDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
                      const dayReminders = remindersByDate[dateKey] || []
                      const isToday = dateKey === todayKey

                      return (
                        <button
                          key={dateKey}
                          onClick={() => openDate(dateKey)}
                          className={cn(
                            "min-h-24 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted/70",
                            isToday && "border-primary",
                            dayReminders.length > 0 && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn("font-semibold", isToday && "text-primary")}>{day}</span>
                            {dayReminders.length > 0 && (
                              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                                {dayReminders.length}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1">
                            {dayReminders.slice(0, 2).map((reminder) => (
                              <div key={reminder.id} className="truncate rounded bg-muted px-2 py-1 text-xs">
                                {reminder.time} {reminder.fullName}
                              </div>
                            ))}
                            {dayReminders.length > 2 && (
                              <div className="text-xs text-muted-foreground">+{dayReminders.length - 2}</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Напоминания на {selectedDate}</DialogTitle>
            <DialogDescription>
              Укажите данные и получателей Telegram. Для группы бот должен быть добавлен в эту группу.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reminder-name">Имя и фамилия</Label>
                <Input
                  id="reminder-name"
                  value={draft.fullName}
                  onChange={(event) => setDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Например: Павел Когут"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder-time">Время</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={draft.time}
                  onChange={(event) => setDraft((prev) => ({ ...prev, time: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminder-text">Текст напоминания</Label>
              <Textarea
                id="reminder-text"
                value={draft.text}
                onChange={(event) => setDraft((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Что нужно напомнить"
                className="min-h-28"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="send-private" className="cursor-pointer">Отправить в личку</Label>
                  <Switch
                    id="send-private"
                    checked={draft.sendPrivate}
                    onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, sendPrivate: checked }))}
                  />
                </div>
                <Input
                  value={draft.telegramPrivate}
                  onChange={(event) => setDraft((prev) => ({ ...prev, telegramPrivate: event.target.value }))}
                  placeholder="Telegram chat id или @username"
                  disabled={!draft.sendPrivate}
                />
                <p className="text-xs text-muted-foreground">Для лички пользователь должен раньше написать боту.</p>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="send-group" className="cursor-pointer">Отправить в группу</Label>
                  <Switch
                    id="send-group"
                    checked={draft.sendGroup}
                    onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, sendGroup: checked }))}
                  />
                </div>
                <Input
                  value={draft.telegramGroup}
                  onChange={(event) => setDraft((prev) => ({ ...prev, telegramGroup: event.target.value }))}
                  placeholder="@groupname или -100..."
                  disabled={!draft.sendGroup}
                />
                <p className="text-xs text-muted-foreground">Бот должен состоять в группе и иметь право писать.</p>
              </div>
            </div>

            {selectedReminders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Записанные напоминания</h3>
                <div className="space-y-2">
                  {selectedReminders.map((reminder) => (
                    <div key={reminder.id} className="flex gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{reminder.fullName}</p>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {reminder.time}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{reminder.text}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {reminder.sendPrivate && reminder.telegramPrivate && <span>Личка: {reminder.telegramPrivate}</span>}
                          {reminder.sendGroup && reminder.telegramGroup && <span>Группа: {reminder.telegramGroup}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => deleteReminder(reminder.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>Закрыть</Button>
            <Button onClick={addReminder} disabled={isSaving}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить напоминание
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
