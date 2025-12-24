"use client"

import { useEffect, useState } from "react"
import { checkNotificationSupport, requestNotificationPermission } from "@/lib/notifications"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, X } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

export function NotificationPermissionPrompt() {
  const { t } = useLocale()
  const [show, setShow] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    const support = checkNotificationSupport()
    if (support.supported && support.prompt) {
      // Show prompt after a short delay
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleRequestPermission = async () => {
    setRequesting(true)
    const granted = await requestNotificationPermission()
    if (granted) {
      setShow(false)
    }
    setRequesting(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg">
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-6 w-6" onClick={() => setShow(false)}>
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Включить уведомления
          </CardTitle>
          <CardDescription>Разрешите уведомления, чтобы получать напоминания о днях рождения</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleRequestPermission} disabled={requesting} className="flex-1">
            <Bell className="h-4 w-4 mr-2" />
            {requesting ? "Запрос..." : "Разрешить"}
          </Button>
          <Button variant="outline" onClick={() => setShow(false)} className="flex-1">
            <BellOff className="h-4 w-4 mr-2" />
            Не сейчас
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
