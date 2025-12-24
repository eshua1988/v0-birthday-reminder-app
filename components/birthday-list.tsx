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
  const { t } = useLocale()

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

  return (
    <div className="divide-y rounded-lg border bg-card">
      {birthdays.map((birthday) => {
        const initials = `${birthday.first_name[0]}${birthday.last_name[0]}`.toUpperCase()

        return (
          <div key={birthday.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
            <Avatar className="h-12 w-12">
              <AvatarImage src={birthday.photo_url || undefined} alt={`${birthday.first_name} ${birthday.last_name}`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">
                {birthday.last_name} {birthday.first_name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {new Date(birthday.birth_date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <span>
                  {t.age}: {getAge(birthday.birth_date)}
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
