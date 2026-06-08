"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Bold, CalendarClock, ChevronLeft, ChevronRight, Clock, Code2, Italic, Plus, Trash2, Underline } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  telegramMessage: string
  telegramPrivate: string
  telegramGroup: string
  sendPrivate: boolean
  sendGroup: boolean
  createdAt: string
  sentPrivateAt?: string
  sentGroupAt?: string
}

type ReminderView = "calendar" | "bulk"
type CalendarView = "month" | "week" | "year"

const SETTINGS_KEY = "manual_reminders"
const CALENDAR_VIEW_KEY = "manual_reminder_calendar_view"

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

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = result.getDate() - day + (day === 0 ? -6 : 1)
  result.setDate(diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

function makeEmptyReminder(date: string): ManualReminder {
  return {
    id: crypto.randomUUID(),
    date,
    time: "09:00",
    fullName: "",
    text: "",
    telegramMessage: "",
    telegramPrivate: "",
    telegramGroup: "",
    sendPrivate: true,
    sendGroup: false,
    createdAt: new Date().toISOString(),
  }
}

function makeBulkReminder(date = formatDateKey(new Date())): ManualReminder {
  return makeEmptyReminder(date)
}

function appendTelegramSnippet(value: string, snippet: string) {
  return value ? `${value}\n${snippet}` : snippet
}

export default function RemindersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<ReminderView>("calendar")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [calendarView, setCalendarView] = useState<CalendarView>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(CALENDAR_VIEW_KEY) as CalendarView | null
      if (saved === "month" || saved === "week" || saved === "year") return saved
    }
    return "month"
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [reminders, setReminders] = useState<ManualReminder[]>([])
  const [draft, setDraft] = useState<ManualReminder>(() => makeEmptyReminder(formatDateKey(new Date())))
  const [bulkDrafts, setBulkDrafts] = useState<ManualReminder[]>(() => [makeBulkReminder()])
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
  const selectedDateObject = selectedDate ? parseDateKey(selectedDate) : null

  const setCalendarViewAndSave = (value: CalendarView) => {
    setCalendarView(value)
    try {
      sessionStorage.setItem(CALENDAR_VIEW_KEY, value)
    } catch {
      // sessionStorage can be unavailable in private browsing.
    }
  }

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

  const openDate = (dateKey: string, openDialog = false) => {
    setSelectedDate(dateKey)
    setDraft(makeEmptyReminder(dateKey))
    if (openDialog) setIsReminderDialogOpen(true)
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
      telegramMessage: draft.telegramMessage.trim(),
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

  const updateBulkDraft = (id: string, updates: Partial<ManualReminder>) => {
    setBulkDrafts((prev) => prev.map((reminder) => (reminder.id === id ? { ...reminder, ...updates } : reminder)))
  }

  const addBulkRow = () => {
    const date = bulkDrafts[bulkDrafts.length - 1]?.date || formatDateKey(new Date())
    setBulkDrafts((prev) => [...prev, makeBulkReminder(date)])
  }

  const removeBulkRow = (id: string) => {
    setBulkDrafts((prev) => (prev.length === 1 ? [makeBulkReminder()] : prev.filter((reminder) => reminder.id !== id)))
  }

  const resetBulkRows = () => {
    setBulkDrafts([makeBulkReminder()])
  }

  const saveBulkRows = async () => {
    const prepared = bulkDrafts
      .map((reminder) => ({
        ...reminder,
        fullName: reminder.fullName.trim(),
        text: reminder.text.trim(),
        telegramMessage: reminder.telegramMessage.trim(),
        telegramPrivate: reminder.telegramPrivate.trim(),
        telegramGroup: reminder.telegramGroup.trim(),
      }))
      .filter((reminder) => reminder.fullName || reminder.text || reminder.telegramPrivate || reminder.telegramGroup)

    if (prepared.length === 0) {
      toast({
        title: "Добавьте события",
        description: "Заполните хотя бы одну строку для сохранения",
        variant: "destructive",
      })
      return
    }

    const invalid = prepared.find(
      (reminder) =>
        !reminder.date ||
        !reminder.time ||
        !reminder.fullName ||
        !reminder.text ||
        (reminder.sendPrivate && !reminder.telegramPrivate) ||
        (reminder.sendGroup && !reminder.telegramGroup),
    )

    if (invalid) {
      toast({
        title: "Проверьте строки",
        description: "Для каждого события нужны дата, время, имя, текст и выбранные Telegram-получатели",
        variant: "destructive",
      })
      return
    }

    const next = [...reminders, ...prepared].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))

    try {
      await saveReminders(next)
      resetBulkRows()
      toast({
        title: "События добавлены",
        description: `Сохранено напоминаний: ${prepared.length}`,
      })
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error?.message || "Не удалось сохранить события",
        variant: "destructive",
      })
    }
  }

  const todayKey = formatDateKey(new Date())
  const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, index) => index + 1)
  const emptyDays = Array.from({ length: getFirstDayOffset(currentDate) })
  const weekStart = startOfWeek(currentDate)
  const weekEnd = addDays(weekStart, 6)

  const previousPeriod = () => {
    if (calendarView === "year") {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
    } else if (calendarView === "week") {
      setCurrentDate(addDays(currentDate, -7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }
  }

  const nextPeriod = () => {
    if (calendarView === "year") {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))
    } else if (calendarView === "week") {
      setCurrentDate(addDays(currentDate, 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }
  }

  const calendarTitle =
    calendarView === "year"
      ? String(currentDate.getFullYear())
      : calendarView === "week"
        ? `Неделя ${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)}`
        : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  const renderReminderPill = (reminder: ManualReminder) => (
    <div key={reminder.id} className="truncate rounded bg-muted px-2 py-1 text-xs">
      {reminder.time} {reminder.fullName}
    </div>
  )

  const renderMonthView = () => {
    const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, index) => index + 1)
    const emptyDays = Array.from({ length: getFirstDayOffset(currentDate) })

    return (
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
            const isSelected = selectedDate === dateKey

            return (
              <button
                key={dateKey}
                onClick={() => openDate(dateKey)}
                className={cn(
                  "min-h-24 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted/70",
                  isToday && "border-primary",
                  isSelected && "ring-2 ring-primary",
                  dayReminders.length > 0 && "bg-primary/5",
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
                  {dayReminders.slice(0, 2).map(renderReminderPill)}
                  {dayReminders.length > 2 && (
                    <div className="text-xs text-muted-foreground">+{dayReminders.length - 2}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((date, index) => {
          const dateKey = formatDateKey(date)
          const dayReminders = remindersByDate[dateKey] || []
          const isToday = dateKey === todayKey
          const isSelected = selectedDate === dateKey

          return (
            <button
              key={dateKey}
              onClick={() => openDate(dateKey)}
              className={cn(
                "min-h-40 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/70",
                isToday && "border-primary",
                isSelected && "ring-2 ring-primary",
                dayReminders.length > 0 && "bg-primary/5",
              )}
            >
              <div className="mb-3 rounded-lg bg-muted p-3 text-center">
                <div className="text-sm font-semibold text-muted-foreground">{weekDays[index]}</div>
                <div className={cn("text-2xl font-bold", isToday && "text-primary")}>{date.getDate()}</div>
              </div>
              <div className="space-y-2">
                {dayReminders.slice(0, 3).map(renderReminderPill)}
                {dayReminders.length > 3 && (
                  <div className="text-center text-xs text-muted-foreground">+{dayReminders.length - 3}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  const renderYearView = () => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {monthNames.map((monthName, monthIndex) => {
        const monthReminders = reminders.filter((reminder) => {
          const reminderDate = parseDateKey(reminder.date)
          return reminderDate.getFullYear() === currentDate.getFullYear() && reminderDate.getMonth() === monthIndex
        })

        return (
          <button
            key={monthName}
            onClick={() => {
              setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1))
              setCalendarViewAndSave("month")
            }}
            className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/70"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{monthName}</h3>
              <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                {monthReminders.length}
              </span>
            </div>
            <div className="space-y-1">
              {monthReminders.slice(0, 4).map((reminder) => (
                <div
                  key={reminder.id}
                  className="truncate rounded bg-muted px-2 py-1 text-xs"
                  onClick={(event) => {
                    event.stopPropagation()
                    openDate(reminder.date, true)
                  }}
                >
                  {parseDateKey(reminder.date).getDate()} · {reminder.time} {reminder.fullName}
                </div>
              ))}
              {monthReminders.length > 4 && (
                <div className="text-xs text-muted-foreground">+{monthReminders.length - 4}</div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )

  const renderSelectedDateRecords = () => {
    if (!selectedDate || !selectedDateObject) return null

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className={cn(isMobile ? "text-base" : "text-lg")}>
              {formatDisplayDate(selectedDateObject)}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setDraft(makeEmptyReminder(selectedDate))
                setIsReminderDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedReminders.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Нет напоминаний на эту дату</p>
          ) : (
            <div className="space-y-2">
              {selectedReminders.map((reminder) => (
                <div key={reminder.id} className="flex gap-3 rounded-lg border bg-card p-3">
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
          )}
        </CardContent>
      </Card>
    )
  }

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

            {view === "calendar" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={previousPeriod}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
                <Button variant="outline" size="icon" onClick={nextPeriod}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="inline-flex rounded-lg bg-muted p-1">
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              onClick={() => setView("calendar")}
              className="min-w-36"
            >
              Календарь
            </Button>
            <Button
              variant={view === "bulk" ? "default" : "ghost"}
              onClick={() => setView("bulk")}
              className="min-w-44"
            >
              Несколько событий
            </Button>
          </div>

          {view === "calendar" ? (
          <div className="space-y-4">
          <ToggleGroup
            type="single"
            value={calendarView}
            onValueChange={(value) => value && setCalendarViewAndSave(value as CalendarView)}
            className={cn("rounded-lg bg-muted p-1", isMobile && "w-full")}
          >
            <ToggleGroupItem value="year" aria-label="Год" className={cn(isMobile && "flex-1")}>
              Год
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="Месяц" className={cn(isMobile && "flex-1")}>
              Месяц
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Неделя" className={cn(isMobile && "flex-1")}>
              Неделя
            </ToggleGroupItem>
          </ToggleGroup>

          {calendarView === "month" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{calendarTitle}</span>
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
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{calendarTitle}</span>
                <span className="text-sm font-normal text-muted-foreground">{reminders.length} напоминаний</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">Загрузка...</div>
              ) : calendarView === "week" ? (
                renderWeekView()
              ) : (
                renderYearView()
              )}
            </CardContent>
          </Card>
          )}
          {(calendarView === "month" || calendarView === "week") && renderSelectedDateRecords()}
          </div>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Несколько событий</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={resetBulkRows} disabled={isSaving}>
                    Сбросить
                  </Button>
                  <Button variant="outline" onClick={addBulkRow} disabled={isSaving}>
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить строку
                  </Button>
                  <Button onClick={saveBulkRows} disabled={isSaving}>
                    Сохранить все
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bulkDrafts.map((reminder, index) => (
                <div key={reminder.id} className="rounded-lg border bg-card p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold">Событие {index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeBulkRow(reminder.id)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`bulk-date-${reminder.id}`}>Дата</Label>
                      <Input
                        id={`bulk-date-${reminder.id}`}
                        type="date"
                        value={reminder.date}
                        onChange={(event) => updateBulkDraft(reminder.id, { date: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`bulk-time-${reminder.id}`}>Время</Label>
                      <Input
                        id={`bulk-time-${reminder.id}`}
                        type="time"
                        value={reminder.time}
                        onChange={(event) => updateBulkDraft(reminder.id, { time: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <Label htmlFor={`bulk-name-${reminder.id}`}>Имя и фамилия</Label>
                      <Input
                        id={`bulk-name-${reminder.id}`}
                        value={reminder.fullName}
                        onChange={(event) => updateBulkDraft(reminder.id, { fullName: event.target.value })}
                        placeholder="Например: Павел Когут"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`bulk-text-${reminder.id}`}>Текст напоминания</Label>
                    <Textarea
                      id={`bulk-text-${reminder.id}`}
                      value={reminder.text}
                      onChange={(event) => updateBulkDraft(reminder.id, { text: event.target.value })}
                      placeholder="Что нужно напомнить"
                      className="min-h-24"
                    />
                  </div>

                  <div className="mt-4 space-y-3 rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label htmlFor={`bulk-telegram-message-${reminder.id}`}>Текст для Telegram</Label>
                        <p className="text-xs text-muted-foreground">Можно использовать HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;code&gt; и переменные {"{name}"} {"{text}"} {"{date}"} {"{time}"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="icon" title="Жирный" onClick={() => updateBulkDraft(reminder.id, { telegramMessage: appendTelegramSnippet(reminder.telegramMessage, "<b>{name}</b>") })}><Bold className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="icon" title="Курсив" onClick={() => updateBulkDraft(reminder.id, { telegramMessage: appendTelegramSnippet(reminder.telegramMessage, "<i>{text}</i>") })}><Italic className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="icon" title="Подчеркнуть" onClick={() => updateBulkDraft(reminder.id, { telegramMessage: appendTelegramSnippet(reminder.telegramMessage, "<u>Важно</u>") })}><Underline className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="icon" title="Код" onClick={() => updateBulkDraft(reminder.id, { telegramMessage: appendTelegramSnippet(reminder.telegramMessage, "<code>{date} {time}</code>") })}><Code2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <Textarea
                      id={`bulk-telegram-message-${reminder.id}`}
                      value={reminder.telegramMessage}
                      onChange={(event) => updateBulkDraft(reminder.id, { telegramMessage: event.target.value })}
                      placeholder={"🔔 <b>Напоминание</b>\n\n<b>{name}</b>\n{text}\n\n📅 {date} {time}"}
                      className="min-h-28"
                    />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={`bulk-private-switch-${reminder.id}`} className="cursor-pointer">Отправить в личку</Label>
                        <Switch
                          id={`bulk-private-switch-${reminder.id}`}
                          checked={reminder.sendPrivate}
                          onCheckedChange={(checked) => updateBulkDraft(reminder.id, { sendPrivate: checked })}
                        />
                      </div>
                      <Input
                        value={reminder.telegramPrivate}
                        onChange={(event) => updateBulkDraft(reminder.id, { telegramPrivate: event.target.value })}
                        placeholder="Telegram chat id или @username"
                        disabled={!reminder.sendPrivate}
                      />
                    </div>

                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor={`bulk-group-switch-${reminder.id}`} className="cursor-pointer">Отправить в группу</Label>
                        <Switch
                          id={`bulk-group-switch-${reminder.id}`}
                          checked={reminder.sendGroup}
                          onCheckedChange={(checked) => updateBulkDraft(reminder.id, { sendGroup: checked })}
                        />
                      </div>
                      <Input
                        value={reminder.telegramGroup}
                        onChange={(event) => updateBulkDraft(reminder.id, { telegramGroup: event.target.value })}
                        placeholder="@groupname или -100..."
                        disabled={!reminder.sendGroup}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}
        </div>
      </main>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
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

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label htmlFor="reminder-telegram-message">Текст для Telegram</Label>
                  <p className="text-xs text-muted-foreground">Можно использовать HTML: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;code&gt; и переменные {"{name}"} {"{text}"} {"{date}"} {"{time}"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="icon" title="Жирный" onClick={() => setDraft((prev) => ({ ...prev, telegramMessage: appendTelegramSnippet(prev.telegramMessage, "<b>{name}</b>") }))}><Bold className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" title="Курсив" onClick={() => setDraft((prev) => ({ ...prev, telegramMessage: appendTelegramSnippet(prev.telegramMessage, "<i>{text}</i>") }))}><Italic className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" title="Подчеркнуть" onClick={() => setDraft((prev) => ({ ...prev, telegramMessage: appendTelegramSnippet(prev.telegramMessage, "<u>Важно</u>") }))}><Underline className="h-4 w-4" /></Button>
                  <Button type="button" variant="outline" size="icon" title="Код" onClick={() => setDraft((prev) => ({ ...prev, telegramMessage: appendTelegramSnippet(prev.telegramMessage, "<code>{date} {time}</code>") }))}><Code2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <Textarea
                id="reminder-telegram-message"
                value={draft.telegramMessage}
                onChange={(event) => setDraft((prev) => ({ ...prev, telegramMessage: event.target.value }))}
                placeholder={"🔔 <b>Напоминание</b>\n\n<b>{name}</b>\n{text}\n\n📅 {date} {time}"}
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
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>Закрыть</Button>
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
