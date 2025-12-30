"use client"

import { useState, useEffect } from "react"
import type { Birthday } from "@/types/birthday"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Mail, Phone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLocale } from "@/lib/locale-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface BirthdayCardProps {
  birthday: Birthday
  onEdit: (birthday: Birthday) => void
  onDelete: (id: string) => void
  isSelected?: boolean
  onToggleSelect?: () => void
  selectionMode?: boolean
}

export function BirthdayCard({ birthday, onEdit, onDelete, isSelected = false, onToggleSelect, selectionMode = false }: BirthdayCardProps) {
  const { t, locale } = useLocale()
  const localeMap: Record<string, string> = {
    ru: "ru-RU",
    pl: "pl-PL",
    uk: "uk-UA",
    ua: "uk-UA",
    en: "en-US",
    be: "be-BY",
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  const [showDetails, setShowDetails] = useState(false)
  const [timeUntil, setTimeUntil] = useState({ months: 0, days: 0, hours: 0 })

  const getAge = () => {
    const today = new Date()
    const birthDate = new Date(birthday.birth_date)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getTimeUntilBirthday = () => {
    const today = new Date()
    const birthDate = new Date(birthday.birth_date)
    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate(), 0, 0, 0, 0)

    if (nextBirthday < today) {
      nextBirthday.setFullYear(today.getFullYear() + 1)
    }

    const diffTime = nextBirthday.getTime() - today.getTime()

    // Расчет месяцев, дней и часов
    const months = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44))
    const days = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    return { months, days, hours, totalDays: Math.ceil(diffTime / (1000 * 60 * 60 * 24)) }
  }

  useEffect(() => {
    const updateTime = () => {
      const time = getTimeUntilBirthday()
      setTimeUntil(time)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // обновляем каждую минуту

    return () => clearInterval(interval)
  }, [birthday.birth_date])

  const timeData = getTimeUntilBirthday()
  const initials = `${birthday.first_name[0]}${birthday.last_name[0]}`.toUpperCase()
  const isToday = timeData.totalDays === 0

  return (
    <>
      <Card
        className={`overflow-hidden transition-shadow hover:shadow-lg cursor-pointer relative ${
          isToday ? 'border-2' : ''
        }`}
        style={isToday ? { borderColor: '#34C924', backgroundColor: 'rgba(52, 201, 36, 0.1)' } : {}}
        onClick={(e) => {
          if (selectionMode && onToggleSelect) {
            e.stopPropagation()
            onToggleSelect()
          } else {
            setShowDetails(true)
          }
        }}
      >
        {selectionMode && onToggleSelect && (
          <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={onToggleSelect}
              className="h-5 w-5 bg-white border-2"
            />
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={birthday.photo_url || undefined} alt={`${birthday.first_name} ${birthday.last_name}`} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {birthday.last_name} {birthday.first_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(birthday.birth_date, { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.age}: {getAge()} {t.years}
              </p>

              {timeData.totalDays === 0 && <p className="text-sm font-semibold mt-2" style={{ color: '#34C924' }}>{t.today}</p>}
              {timeData.totalDays === 1 && <p className="text-sm font-semibold text-blue-600 mt-2">{t.tomorrow}</p>}
              {timeData.totalDays > 1 && (
                <div className="text-sm text-muted-foreground mt-2">
                  <p className="font-medium">{t.timeUntilLabel}</p>
                  <p>
                    {timeUntil.months > 0 && `${timeUntil.months} ${t.monthsShort} `}
                    {timeUntil.days} {t.daysShort} {timeUntil.hours} {t.hoursShort}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {birthday.phone && (
                  <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                    <a href={`tel:${birthday.phone}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {birthday.email && (
                  <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                    <a href={`mailto:${birthday.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(birthday)
                }}
                className="h-8 w-8"
                title="Редактировать"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(birthday.id)
                }}
                className="h-8 w-8 text-destructive hover:text-destructive"
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t.memberDetails}</DialogTitle>
            <DialogDescription>{t.birthDetails}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={birthday.photo_url || undefined}
                  alt={`${birthday.first_name} ${birthday.last_name}`}
                />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
            </div>

            <div className="grid gap-3">
              <div>
                <Label className="text-muted-foreground">{t.lastName}</Label>
                <p className="text-lg font-medium">{birthday.last_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t.firstName}</Label>
                <p className="text-lg font-medium">{birthday.first_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t.birthDate}</Label>
                <p className="text-lg font-medium">{formatDate(birthday.birth_date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t.age}</Label>
                <p className="text-lg font-medium">
                  {getAge()} {t.years}
                </p>
              </div>
              {birthday.phone && (
                <div>
                  <Label className="text-muted-foreground">{t.phone}</Label>
                  <p className="text-lg font-medium">{birthday.phone}</p>
                </div>
              )}
              {birthday.email && (
                <div>
                  <Label className="text-muted-foreground">{t.email}</Label>
                  <p className="text-lg font-medium">{birthday.email}</p>
                </div>
              )}
              {birthday.notification_time && (
                <div>
                  <Label className="text-muted-foreground">{t.notificationTime}</Label>
                  <p className="text-lg font-medium">{birthday.notification_time}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowDetails(false)
                  onEdit(birthday)
                }}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t.edit}
              </Button>
              <Button
                onClick={() => {
                  setShowDetails(false)
                  onDelete(birthday.id)
                }}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.delete}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
