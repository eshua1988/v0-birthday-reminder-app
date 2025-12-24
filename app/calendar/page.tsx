"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Birthday } from "@/types/birthday"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Mail, Phone, Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"
import { BirthdayForm } from "@/components/birthday-form"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

type CalendarView = "month" | "week" | "year"

export default function CalendarPage() {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDateBirthdays, setSelectedDateBirthdays] = useState<Birthday[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calendarView, setCalendarView] = useState<CalendarView>("month")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null)
  const [newBirthdayDate, setNewBirthdayDate] = useState<string>("")

  const supabase = createClient()

  useEffect(() => {
    fetchBirthdays()
  }, [])

  const fetchBirthdays = async () => {
    const { data, error } = await supabase.from("birthdays").select("*")

    if (!error && data) {
      setBirthdays(data)
    }
  }

  const handleSave = async (data: Partial<Birthday>) => {
    if (editingBirthday) {
      const { error } = await supabase.from("birthdays").update(data).eq("id", editingBirthday.id)

      if (!error) {
        await fetchBirthdays()
        setEditingBirthday(null)
        setIsFormOpen(false)
      }
    } else {
      const { error } = await supabase.from("birthdays").insert([data])

      if (!error) {
        await fetchBirthdays()
        setIsFormOpen(false)
        setNewBirthdayDate("")
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t.confirmDelete)) {
      const { error } = await supabase.from("birthdays").delete().eq("id", id)

      if (!error) {
        await fetchBirthdays()
        setSelectedDateBirthdays((prev) => prev.filter((b) => b.id !== id))
      }
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1
  }

  const getBirthdaysForDay = (day: number, month: number = currentDate.getMonth()) => {
    return birthdays.filter((b) => {
      const birthDate = new Date(b.birth_date)
      return birthDate.getDate() === day && birthDate.getMonth() === month
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const previousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const previousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
  }

  const nextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

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

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => (
        <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
          {day}
        </div>
      ))}

      {emptyDays.map((i) => (
        <div key={`empty-${i}`} className="aspect-square" />
      ))}

      {days.map((day) => {
        const dayBirthdays = getBirthdaysForDay(day)
        const hasEvents = dayBirthdays.length > 0

        return (
          <button
            key={day}
            onClick={() => {
              const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              setSelectedDate(clickedDate)
              setSelectedDateBirthdays(dayBirthdays)
            }}
            className={`aspect-square rounded-lg border p-2 text-sm transition-colors hover:bg-muted ${
              hasEvents ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex h-full flex-col">
              <span className="font-semibold mb-1">{day}</span>
              {hasEvents && (
                <div className="flex-1 overflow-hidden text-xs space-y-0.5">
                  {dayBirthdays.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="truncate text-left px-1 py-0.5 bg-primary/10 rounded"
                      title={`${b.last_name} ${b.first_name}`}
                    >
                      {b.last_name} {b.first_name[0]}.
                    </div>
                  ))}
                  {dayBirthdays.length > 3 && <div className="text-muted-foreground">+{dayBirthdays.length - 3}</div>}
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })

    return (
      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((date, index) => {
          const dayBirthdays = getBirthdaysForDay(date.getDate(), date.getMonth())
          const isToday = date.toDateString() === new Date().toDateString()

          return (
            <div key={index} className="space-y-2">
              <div
                className={`text-center p-2 rounded-lg ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <div className="text-sm font-semibold">{weekDays[index]}</div>
                <div className="text-2xl font-bold">{date.getDate()}</div>
              </div>
              <div className="space-y-1">
                {dayBirthdays.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedDate(date)
                      setSelectedDateBirthdays([b])
                    }}
                    className="w-full text-left p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs"
                  >
                    <div className="font-semibold truncate">
                      {b.last_name} {b.first_name}
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const year = date.getFullYear()
                    const month = String(date.getMonth() + 1).padStart(2, "0")
                    const day = String(date.getDate()).padStart(2, "0")
                    setNewBirthdayDate(`${year}-${month}-${day}`)
                    setEditingBirthday(null)
                    setIsFormOpen(true)
                  }}
                  className="w-full p-2 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => i)

    return (
      <div className="grid grid-cols-3 gap-4">
        {months.map((monthIndex) => {
          const monthBirthdays = birthdays.filter((b) => {
            const birthDate = new Date(b.birth_date)
            return birthDate.getMonth() === monthIndex
          })

          return (
            <Card
              key={monthIndex}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1))
                setCalendarView("month")
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{monthNames[monthIndex]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {monthBirthdays.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет дней рождения</p>
                  ) : (
                    monthBirthdays.map((b) => {
                      const birthDate = new Date(b.birth_date)
                      return (
                        <button
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDate(birthDate)
                            setSelectedDateBirthdays([b])
                          }}
                          className="w-full text-left p-1 rounded hover:bg-muted transition-colors text-xs"
                        >
                          <span className="font-semibold">{birthDate.getDate()}</span> - {b.last_name} {b.first_name}
                        </button>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className={cn("flex-1", isMobile ? "p-4 pt-20" : "p-8 ml-16 pt-8 md:ml-16")}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>Календарь дней рождения</h1>
            <ToggleGroup
              type="single"
              value={calendarView}
              onValueChange={(value) => value && setCalendarView(value as CalendarView)}
              className={cn(isMobile && "w-full")}
            >
              <ToggleGroupItem value="month" aria-label="Месяц" className={cn(isMobile && "flex-1")}>
                Месяц
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Неделя" className={cn(isMobile && "flex-1")}>
                Неделя
              </ToggleGroupItem>
              <ToggleGroupItem value="year" aria-label="Год" className={cn(isMobile && "flex-1")}>
                Год
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  onClick={() => {
                    if (calendarView === "month") previousMonth()
                    else if (calendarView === "week") previousWeek()
                    else previousYear()
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className={cn(isMobile ? "text-base" : "text-xl")}>
                  {calendarView === "week"
                    ? `Неделя ${currentDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`
                    : calendarView === "year"
                      ? currentDate.getFullYear()
                      : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                </CardTitle>
                <Button
                  variant="outline"
                  size={isMobile ? "icon" : "sm"}
                  onClick={() => {
                    if (calendarView === "month") nextMonth()
                    else if (calendarView === "week") nextWeek()
                    else nextYear()
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {calendarView === "month" && renderMonthView()}
              {calendarView === "week" && renderWeekView()}
              {calendarView === "year" && renderYearView()}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={selectedDate !== null}
        onOpenChange={() => {
          setSelectedDate(null)
          setSelectedDateBirthdays([])
        }}
      >
        <DialogContent className={cn("max-h-[80vh] overflow-y-auto", isMobile ? "max-w-[95vw]" : "max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>
              {selectedDate &&
                `Дни рождения - ${selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              onClick={() => {
                if (selectedDate) {
                  const year = selectedDate.getFullYear()
                  const month = String(selectedDate.getMonth() + 1).padStart(2, "0")
                  const day = String(selectedDate.getDate()).padStart(2, "0")
                  setNewBirthdayDate(`${year}-${month}-${day}`)
                  setEditingBirthday(null)
                  setIsFormOpen(true)
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить именинника
            </Button>
          </div>

          <div className="space-y-4">
            {selectedDateBirthdays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет именинников на эту дату</p>
            ) : (
              selectedDateBirthdays.map((birthday) => (
                <Card key={birthday.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={birthday.photo_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {birthday.first_name[0]}
                          {birthday.last_name[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {birthday.last_name} {birthday.first_name}
                          </h3>
                          <p className="text-muted-foreground">
                            {calculateAge(birthday.birth_date)} {t.years}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Дата рождения:</span>
                            <span>{new Date(birthday.birth_date).toLocaleDateString("ru-RU")}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Время оповещения:</span>
                            <span>{birthday.notification_time || "09:00"}</span>
                          </div>

                          {birthday.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{birthday.phone}</span>
                            </div>
                          )}

                          {birthday.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span>{birthday.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingBirthday(birthday)
                            setIsFormOpen(true)
                          }}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(birthday.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BirthdayForm
        birthday={editingBirthday || (newBirthdayDate ? ({ birth_date: newBirthdayDate } as Birthday) : null)}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) {
            setEditingBirthday(null)
            setNewBirthdayDate("")
          }
        }}
        onSave={handleSave}
      />
    </div>
  )
}
