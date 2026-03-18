"use client"

import React, { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const supabase = createClient()

const MONTH_NAMES = [
  "январь","февраль","март","апрель","май","июнь",
  "июль","август","сентябрь","октябрь","ноябрь","декабрь",
]
function formatMonth(ym: string) {
  const [year, month] = ym.split("-")
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

export function PrayerAssignmentsDisplay() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<{ warrior: string; recipients: string[] }[]>([])
  const [isSending, setIsSending] = useState(false)
  const currentMonth = new Date().toISOString().slice(0, 7)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: assignments } = await supabase
      .from("prayer_assignments")
      .select("warrior_id, recipient_name")
      .eq("user_id", user.id)
      .eq("assigned_month", currentMonth)

    if (!assignments || assignments.length === 0) { setGroups([]); return }

    const { data: warriors } = await supabase
      .from("prayer_warriors")
      .select("id, name")
      .eq("user_id", user.id)

    const warriorMap = new Map((warriors || []).map((w: any) => [w.id, w.name]))
    const map = new Map<string, string[]>()
    for (const a of assignments) {
      const name = warriorMap.get(a.warrior_id) as string || "—"
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(a.recipient_name)
    }
    setGroups(Array.from(map.entries()).map(([warrior, recipients]) => ({ warrior, recipients })))
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  const sendToTelegram = async () => {
    setIsSending(true)
    try {
      const res = await fetch("/api/prayer-assignments/send-telegram", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Ошибка")
      toast({ title: "Отправлено", description: "Назначения отправлены в Telegram 🙏" })
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" })
    } finally { setIsSending(false) }
  }

  if (groups.length === 0) return null

  return (
    <div className="mt-6 rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          🙏 Молитвенные назначения — {formatMonth(currentMonth)}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs text-[#0088cc] border-[#0088cc]/30 hover:bg-[#0088cc]/10"
          onClick={sendToTelegram}
          disabled={isSending}
        >
          <Send className="h-3.5 w-3.5" />
          {isSending ? "Отправка..." : "В Telegram"}
        </Button>
      </div>
      {groups.map(({ warrior, recipients }) => (
        <div key={warrior} className="p-3 bg-muted/30 rounded-lg space-y-1.5">
          <p className="text-sm font-semibold text-primary">{warrior}</p>
          <div className="flex flex-wrap gap-1.5">
            {recipients.map((r, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
