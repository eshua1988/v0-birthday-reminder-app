"use client"

import type { Birthday } from "@/types/birthday"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Mail, Phone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLocale } from "@/lib/locale-context"
import { useIsMobile } from "@/hooks/use-mobile"

interface BirthdayTableProps {
  birthdays: Birthday[]
  onEdit: (birthday: Birthday) => void
  onDelete: (id: string) => void
}

export function BirthdayTable({ birthdays, onEdit, onDelete }: BirthdayTableProps) {
  const { t } = useLocale()
  const isMobile = useIsMobile()

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

  if (isMobile) {
    return (
      <div className="space-y-3">
        {birthdays.map((birthday) => {
          const initials = `${birthday.first_name[0]}${birthday.last_name[0]}`.toUpperCase()

          return (
            <div key={birthday.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={birthday.photo_url || undefined}
                    alt={`${birthday.first_name} ${birthday.last_name}`}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {birthday.last_name} {birthday.first_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(birthday.birth_date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    • {getAge(birthday.birth_date)} {t.years}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {birthday.phone && (
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" asChild>
                        <a href={`tel:${birthday.phone}`}>
                          <Phone className="h-3 w-3 mr-1" />
                          {birthday.phone}
                        </a>
                      </Button>
                    )}
                    {birthday.email && (
                      <Button variant="outline" size="sm" className="h-7 text-xs bg-transparent" asChild>
                        <a href={`mailto:${birthday.email}`}>
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </a>
                      </Button>
                    )}
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

            return (
              <TableRow key={birthday.id}>
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
                <TableCell>{birthday.first_name}</TableCell>
                <TableCell>
                  {new Date(birthday.birth_date).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>{getAge(birthday.birth_date)}</TableCell>
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
