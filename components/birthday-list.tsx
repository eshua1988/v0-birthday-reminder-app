"use client"

import type { Birthday } from "@/types/birthday"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Mail, Phone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useLocale } from "@/lib/locale-context"

interface BirthdayListProps {
  birthdays: Birthday[]
  onEdit: (birthday: Birthday) => void
  onDelete: (id: string) => void
}

export function BirthdayList({ birthdays, onEdit, onDelete }: BirthdayListProps) {
  const { t, locale } = useLocale()
  const localeMap: Record<string, string> = {
    ru: "ru-RU",
    pl: "pl-PL",
    uk: "uk-UA",
    ua: "uk-UA",
    en: "en-US",
    be: "be-BY",
  }

  const formatDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) =>
    new Date(dateStr).toLocaleDateString(localeMap[locale] || "ru-RU", options as any)

  const getAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getBirthYear = (birthDate: string) => {
    return new Date(birthDate).getFullYear()
  }

  const isBirthdayToday = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    return today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth()
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {birthdays.map((birthday) => {
        const initials = `${birthday.first_name[0]}${birthday.last_name[0]}`.toUpperCase()
        const isToday = isBirthdayToday(birthday.birth_date)

        return (
          <div 
            key={birthday.id} 
            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors relative"
            style={isToday ? { borderLeft: '4px solid #34C924' } : {}}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={birthday.photo_url || undefined} alt={`${birthday.first_name} ${birthday.last_name}`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">
                  {birthday.last_name} {birthday.first_name}
                </h3>
                {isToday && (
                  <span 
                    className="px-2 py-0.5 text-xs font-bold text-white rounded-md"
                    style={{ backgroundColor: '#34C924' }}
                  >
                    {t.today}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatDate(birthday.birth_date, { day: "numeric", month: "long" })}</span>
                <span>
                  {t.age}: {getAge(birthday.birth_date)}
                </span>
                <span className="text-xs">
                  (г.р.: {getBirthYear(birthday.birth_date)})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {birthday.phone && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`tel:${birthday.phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {birthday.email && (
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`mailto:${birthday.email}`}>
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => onEdit(birthday)} className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(birthday.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
