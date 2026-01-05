"use client"

import type { Birthday } from "@/types/birthday"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Phone, Mail } from "lucide-react"
import { ContactIconsRenderer } from "./contact-icons-renderer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLocale } from "@/lib/locale-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { Checkbox } from "@/components/ui/checkbox"

interface BirthdayTableProps {
  birthdays: Birthday[]
  onEdit: (birthday: Birthday) => void
  onDelete: (id: string) => void
  isSelected?: (id: string) => boolean
  onToggleSelect?: (id: string) => void
}

export function BirthdayTable({ birthdays, onEdit, onDelete, isSelected, onToggleSelect }: BirthdayTableProps) {
  const { t, locale } = useLocale()
  const isMobile = useIsMobile()

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

  if (isMobile) {
    return (
      <div className="space-y-3">
        {birthdays.map((birthday) => {
          const initials = `${birthday.first_name[0]}${birthday.last_name[0]}`.toUpperCase()
          const isToday = isBirthdayToday(birthday.birth_date)
          const selected = isSelected ? isSelected(birthday.id) : false

          return (
            <div 
              key={birthday.id} 
              className="rounded-lg border bg-card p-4 relative"
              style={
                isToday 
                  ? { borderLeft: '4px solid #34C924', backgroundColor: 'rgba(52, 201, 36, 0.1)' }
                  : selected
                  ? { borderLeft: '4px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                  : {}
              }
            >
              <div className="flex items-start gap-3">
                {onToggleSelect && (
                  <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selected}
                      onCheckedChange={() => onToggleSelect(birthday.id)}
                      className="h-4 w-4"
                    />
                  </div>
                )}
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={birthday.photo_url || undefined}
                    alt={`${birthday.first_name} ${birthday.last_name}`}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">
                      {birthday.last_name} {birthday.first_name}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(birthday.birth_date, { day: "numeric", month: "long", year: "numeric" })} {" "}
                    • {getAge(birthday.birth_date)} {t.years}
                  </div>
                  {isToday && <p className="text-sm font-semibold mt-1" style={{ color: '#34C924' }}>{t.today}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <ContactIconsRenderer birthday={birthday} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
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
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {onToggleSelect && <TableHead className="w-[50px]"></TableHead>}
            <TableHead>{t.photo}</TableHead>
            <TableHead>{t.lastName}</TableHead>
            <TableHead>{t.firstName}</TableHead>
            <TableHead>{t.birthDate}</TableHead>
            <TableHead>{t.age}</TableHead>
            <TableHead>{t.phone}</TableHead>
            <TableHead>{t.email}</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {birthdays.map((birthday) => {
            const initials = `${birthday.first_name[0]}${birthday.last_name[0]}`.toUpperCase()
            const isToday = isBirthdayToday(birthday.birth_date)
            const selected = isSelected ? isSelected(birthday.id) : false

            return (
              <TableRow 
                key={birthday.id}
                id={`birthday-${birthday.id}`}
                style={
                  isToday 
                    ? { borderLeft: '4px solid #34C924', backgroundColor: 'rgba(52, 201, 36, 0.1)' }
                    : selected
                    ? { borderLeft: '4px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                    : {}
                }
              >
                {onToggleSelect && (
                  <TableCell>
                    <Checkbox 
                      checked={selected}
                      onCheckedChange={() => onToggleSelect(birthday.id)}
                      className="h-4 w-4"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={birthday.photo_url || undefined}
                      alt={`${birthday.first_name} ${birthday.last_name}`}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{birthday.last_name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{birthday.first_name}</span>
                    {isToday && <span className="text-sm font-semibold mt-1" style={{ color: '#34C924' }}>{t.today}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDate(birthday.birth_date, { day: "numeric", month: "long", year: "numeric" })}
                </TableCell>
                <TableCell>{getAge(birthday.birth_date)} {t.years}</TableCell>
                <TableCell>
                  {birthday.phone && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                      <a href={`tel:${birthday.phone}`}>
                        <Phone className="h-3 w-3 mr-1" />
                        {birthday.phone}
                      </a>
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {birthday.email && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                      <a href={`mailto:${birthday.email}`}>
                        <Mail className="h-3 w-3 mr-1" />
                        {birthday.email}
                      </a>
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
