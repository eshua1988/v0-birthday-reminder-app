"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Birthday } from "@/types/birthday"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Plus, X } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface BirthdayFormProps {
  birthday?: Birthday | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Birthday>) => Promise<void>
  onSwitchToBulkAdd?: () => void
}

export function BirthdayForm({ birthday, open, onOpenChange, onSave, onSwitchToBulkAdd }: BirthdayFormProps) {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(false)
  const [notificationTimes, setNotificationTimes] = useState<string[]>(["09:00"])
  const [customFields, setCustomFields] = useState<Array<{ name: string; value: string }>>([])
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    photo_url: "",
    notification_time: "09:00",
    notification_enabled: true,
  })

  useEffect(() => {
    if (birthday) {
      const times =
        birthday.notification_times && birthday.notification_times.length > 0
          ? birthday.notification_times
          : [birthday.notification_time || "09:00"]

      setNotificationTimes(times)
      
      // Load custom fields from phone/email
      const fields: Array<{ name: string; value: string }> = []
      
      if (birthday.phone) fields.push({ name: "Телефон", value: birthday.phone })
      if (birthday.email) fields.push({ name: "Email", value: birthday.email })
      
      setCustomFields(fields)
      
      setFormData({
        first_name: birthday.first_name,
        last_name: birthday.last_name,
        birth_date: birthday.birth_date,
        photo_url: birthday.photo_url || "",
        notification_time: birthday.notification_time || "09:00",
        notification_enabled: birthday.notification_enabled ?? true,
      })
    } else {
      setNotificationTimes(["09:00"])
      setCustomFields([])
      setFormData({
        first_name: "",
        last_name: "",
        birth_date: "",
        photo_url: "",
        notification_time: "09:00",
        notification_enabled: true,
      })
    }
  }, [birthday, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Convert custom fields to phone/email for backwards compatibility
      const phoneField = customFields.find(f => f.name.toLowerCase().includes('телефон') || f.name.toLowerCase().includes('phone'))
      const emailField = customFields.find(f => f.name.toLowerCase().includes('email') || f.name.toLowerCase().includes('почта'))
      
      // Explicitly specify only valid database fields
      const dataToSave = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        birth_date: formData.birth_date,
        photo_url: formData.photo_url || null,
        notification_time: notificationTimes[0] || "09:00",
        notification_enabled: formData.notification_enabled,
        phone: phoneField?.value || "",
        email: emailField?.value || "",
        notification_times: notificationTimes,
        notification_repeat_count: notificationTimes.length,
      }
      
      console.log("[v0] BirthdayForm: Submitting data:", dataToSave)
      
      await onSave(dataToSave)
      onOpenChange(false)
      setNotificationTimes(["09:00"])
      setCustomFields([])
      setFormData({
        first_name: "",
        last_name: "",
        birth_date: "",
        photo_url: "",
        notification_time: "09:00",
        notification_enabled: true,
      })
    } catch (error) {
      console.error("Error saving birthday:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, photo_url: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const initials =
    formData.first_name && formData.last_name ? `${formData.first_name[0]}${formData.last_name[0]}`.toUpperCase() : ""

  const addNotificationTime = () => {
    if (notificationTimes.length < 5) {
      setNotificationTimes([...notificationTimes, "09:00"])
    }
  }

  const removeNotificationTime = (index: number) => {
    if (notificationTimes.length > 1) {
      setNotificationTimes(notificationTimes.filter((_, i) => i !== index))
    }
  }

  const updateNotificationTime = (index: number, time: string) => {
    const newTimes = [...notificationTimes]
    newTimes[index] = time
    setNotificationTimes(newTimes)
    if (index === 0) {
      setFormData({ ...formData, notification_time: time })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", isMobile ? "max-w-[95vw]" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle>{birthday ? t.edit : t.addMember}</DialogTitle>
          <DialogDescription className="sr-only">
            {birthday ? t.edit : t.addMember}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.photo_url || undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
                <Upload className="h-4 w-4" />
                {t.uploadPhoto}
              </div>
              <Input id="photo-upload" type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
            </Label>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="last_name">{t.lastName}</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="first_name">{t.firstName}</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="birth_date">{t.birthDate}</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Дополнительные поля</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomFields([...customFields, { name: "", value: "" }])}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить поле
                </Button>
              </div>
              
              {customFields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Название"
                    value={field.name}
                    onChange={(e) => {
                      const newFields = [...customFields]
                      newFields[index].name = e.target.value
                      setCustomFields(newFields)
                    }}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="Значение"
                    value={field.value}
                    onChange={(e) => {
                      const newFields = [...customFields]
                      newFields[index].value = e.target.value
                      setCustomFields(newFields)
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}
                    className="h-10 w-10 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {customFields.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Нажмите "Добавить поле" для добавления телефона, email или других данных
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="notification_enabled" className="cursor-pointer">
                  {t.enableNotification}
                </Label>
                <p className="text-xs text-muted-foreground">{t.enableNotificationDescription}</p>
              </div>
              <Switch
                id="notification_enabled"
                checked={formData.notification_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, notification_enabled: checked })}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>{t.notificationTime}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addNotificationTime}
                  disabled={!formData.notification_enabled || notificationTimes.length >= 5}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t.addNotificationTime}
                </Button>
              </div>

              <div className="space-y-2">
                {notificationTimes.map((time, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => updateNotificationTime(index, e.target.value)}
                      disabled={!formData.notification_enabled}
                      className={cn(!formData.notification_enabled && "opacity-50 cursor-not-allowed")}
                      required
                    />
                    {notificationTimes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNotificationTime(index)}
                        disabled={!formData.notification_enabled}
                        className="h-10 w-10 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {t.notificationTimeDescription} ({t.maxNotificationTimes})
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            {!birthday && onSwitchToBulkAdd && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onSwitchToBulkAdd()
                }}
                disabled={isLoading}
                className="mr-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить нескольких
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t.saving : t.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
