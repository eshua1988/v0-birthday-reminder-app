"use client"

import React, { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Shuffle, Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const supabase = createClient()

interface Warrior {
  id: string
  name: string
}

interface Assignment {
  id: string
  warrior_id: string
  recipient_name: string
  recipient_id: string | null
  assigned_month: string
  cycle_number: number
}

interface BirthdayList {
  id: string
  name: string
}

interface Recipient {
  id: string
  name: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const MONTH_NAMES = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
]

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-")
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

export const PrayerAssignmentsCard: React.FC = () => {
  const { toast } = useToast()
  const [warriors, setWarriors] = useState<Warrior[]>([])
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([])
  const [lists, setLists] = useState<BirthdayList[]>([])
  const [newWarriorName, setNewWarriorName] = useState("")
  const [assignmentsPerWarrior, setAssignmentsPerWarrior] = useState(2)
  const [selectedListId, setSelectedListId] = useState<string>("__all__")
  const [isGenerating, setIsGenerating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [cycleProgress, setCycleProgress] = useState({ assigned: 0, total: 0 })

  const currentMonth = new Date().toISOString().slice(0, 7)

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load settings
      const { data: settings } = await supabase
        .from("settings")
        .select("key,value")
        .eq("user_id", user.id)
        .in("key", ["prayer_cycle_number", "prayer_assignments_per_warrior", "prayer_list_id"])

      let cycleNum = 1
      let perWarrior = 2
      let listId = "__all__"

      if (settings) {
        for (const s of settings) {
          if (s.key === "prayer_cycle_number") cycleNum = parseInt(s.value) || 1
          if (s.key === "prayer_assignments_per_warrior") perWarrior = parseInt(s.value) || 2
          if (s.key === "prayer_list_id") listId = s.value || "__all__"
        }
      }

      setCycleNumber(cycleNum)
      setAssignmentsPerWarrior(perWarrior)
      setSelectedListId(listId)

      // Load warriors
      const { data: warriorsData } = await supabase
        .from("prayer_warriors")
        .select("id,name")
        .eq("user_id", user.id)
        .order("created_at")
      setWarriors(warriorsData || [])

      // Load current month assignments
      const { data: assignmentsData } = await supabase
        .from("prayer_assignments")
        .select("id,warrior_id,recipient_name,recipient_id,assigned_month,cycle_number")
        .eq("user_id", user.id)
        .eq("assigned_month", currentMonth)
        .order("created_at")
      setCurrentAssignments(assignmentsData || [])

      // Load cycle progress (unique recipients assigned in this cycle)
      const { data: cycleData } = await supabase
        .from("prayer_assignments")
        .select("recipient_id")
        .eq("user_id", user.id)
        .eq("cycle_number", cycleNum)

      // Load birthday lists
      const { data: listsData } = await supabase
        .from("birthday_lists")
        .select("id,name")
        .eq("user_id", user.id)
        .order("created_at")
      setLists(listsData || [])

      // Total recipients count
      let recipientsQuery = supabase
        .from("birthdays")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
      if (listId !== "__all__") recipientsQuery = recipientsQuery.eq("list_id", listId)
      const { count } = await recipientsQuery

      const assignedIds = new Set(
        (cycleData || []).map((a: any) => a.recipient_id).filter(Boolean)
      )
      setCycleProgress({ assigned: assignedIds.size, total: count || 0 })
    } catch (e) {
      console.error("Failed to load prayer assignments", e)
    }
  }, [currentMonth])

  useEffect(() => {
    load()
  }, [load])

  const saveSetting = async (key: string, value: string) => {
    if (!userId) return
    await supabase
      .from("settings")
      .upsert([{ user_id: userId, key, value }], { onConflict: "user_id,key" })
  }

  const addWarrior = async () => {
    const name = newWarriorName.trim()
    if (!name || !userId) return
    const { data, error } = await supabase
      .from("prayer_warriors")
      .insert({ user_id: userId, name })
      .select()
      .single()
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" })
      return
    }
    setWarriors((prev) => [...prev, data])
    setNewWarriorName("")
  }

  const removeWarrior = async (id: string) => {
    await supabase.from("prayer_warriors").delete().eq("id", id)
    setWarriors((prev) => prev.filter((w) => w.id !== id))
  }

  const generateAssignments = async () => {
    if (!userId || warriors.length === 0) {
      toast({ title: "Ошибка", description: "Добавьте хотя бы одного молящегося", variant: "destructive" })
      return
    }
    setIsGenerating(true)
    try {
      // Load all recipients
      let q = supabase
        .from("birthdays")
        .select("id,first_name,last_name,name")
        .eq("user_id", userId)
      if (selectedListId !== "__all__") q = q.eq("list_id", selectedListId)
      const { data: allBirthdays } = await q

      const allRecipients: Recipient[] = (allBirthdays || []).map((b: any) => ({
        id: b.id,
        name: (b.name || `${b.first_name || ""} ${b.last_name || ""}`).trim(),
      }))

      if (allRecipients.length === 0) {
        toast({ title: "Нет участников", description: "В выбранном списке нет участников", variant: "destructive" })
        return
      }

      // Recipients already assigned in current cycle
      const { data: cycleAssignments } = await supabase
        .from("prayer_assignments")
        .select("recipient_id")
        .eq("user_id", userId)
        .eq("cycle_number", cycleNumber)

      const assignedInCycleIds = new Set(
        (cycleAssignments || []).map((a: any) => a.recipient_id).filter(Boolean)
      )
      let remaining = allRecipients.filter((r) => !assignedInCycleIds.has(r.id))

      const needed = warriors.length * assignmentsPerWarrior
      let newCycleNumber = cycleNumber

      // Not enough remaining — start new cycle
      if (remaining.length < needed) {
        newCycleNumber = cycleNumber + 1
        remaining = allRecipients
        await saveSetting("prayer_cycle_number", String(newCycleNumber))
        setCycleNumber(newCycleNumber)
        toast({ title: "Новый цикл!", description: "Все участники получили молитву. Начинается новый цикл 🙏" })
      }

      // Delete existing assignments for this month (if regenerating)
      await supabase
        .from("prayer_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("assigned_month", currentMonth)

      // Shuffle and assign
      const shuffled = shuffle(remaining)
      const rows: any[] = []
      let idx = 0
      for (const warrior of warriors) {
        for (let i = 0; i < assignmentsPerWarrior; i++) {
          if (idx >= shuffled.length) break
          const recipient = shuffled[idx++]
          rows.push({
            user_id: userId,
            warrior_id: warrior.id,
            recipient_name: recipient.name,
            recipient_id: recipient.id,
            assigned_month: currentMonth,
            cycle_number: newCycleNumber,
          })
        }
      }

      if (rows.length === 0) {
        toast({ title: "Ошибка", description: "Нет доступных участников", variant: "destructive" })
        return
      }

      const { data: inserted, error } = await supabase
        .from("prayer_assignments")
        .insert(rows)
        .select()
      if (error) throw error

      setCurrentAssignments(inserted || [])

      // Refresh cycle progress
      const { data: updatedCycle } = await supabase
        .from("prayer_assignments")
        .select("recipient_id")
        .eq("user_id", userId)
        .eq("cycle_number", newCycleNumber)

      const newAssignedIds = new Set(
        (updatedCycle || []).map((a: any) => a.recipient_id).filter(Boolean)
      )
      setCycleProgress({ assigned: newAssignedIds.size, total: allRecipients.length })

      toast({
        title: "Готово",
        description: `Назначено ${rows.length} человек на ${formatMonth(currentMonth)}`,
      })
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const assignmentsByWarrior = warriors.map((w) => ({
    warrior: w,
    recipients: currentAssignments.filter((a) => a.warrior_id === w.id),
  }))

  const hasCurrentAssignments = currentAssignments.length > 0
  const progressPercent =
    cycleProgress.total > 0 ? Math.round((cycleProgress.assigned / cycleProgress.total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Молитвенные назначения</CardTitle>
            <CardDescription>
              Ежемесячно распределять участников для молитвы между молящимися
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Settings */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Список участников</Label>
            <Select
              value={selectedListId}
              onValueChange={async (v) => {
                setSelectedListId(v)
                await saveSetting("prayer_list_id", v)
                await load()
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Все участники</SelectItem>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Человек на молящегося
            </Label>
            <Select
              value={String(assignmentsPerWarrior)}
              onValueChange={async (v) => {
                setAssignmentsPerWarrior(parseInt(v))
                await saveSetting("prayer_assignments_per_warrior", v)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cycle progress bar */}
        {cycleProgress.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Цикл {cycleNumber} — охвачено</span>
              <span>{cycleProgress.assigned} из {cycleProgress.total}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {cycleProgress.assigned >= cycleProgress.total
                ? "✅ Все помолились! При следующем назначении начнётся новый цикл."
                : `Осталось ${cycleProgress.total - cycleProgress.assigned} участников в этом цикле`}
            </p>
          </div>
        )}

        {/* Warriors list */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Молящиеся
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">({warriors.length})</span>
          </Label>

          {warriors.length === 0 && (
            <p className="text-sm text-muted-foreground py-1">
              Добавьте людей, которые будут молиться за других
            </p>
          )}

          {warriors.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
              <span className="text-sm">🙏 {w.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeWarrior(w.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2 mt-1">
            <Input
              value={newWarriorName}
              onChange={(e) => setNewWarriorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWarrior()}
              placeholder="Имя молящегося..."
              className="h-9"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={addWarrior}
              disabled={!newWarriorName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={generateAssignments}
          disabled={isGenerating || warriors.length === 0}
          className="w-full gap-2"
        >
          <Shuffle className="h-4 w-4" />
          {isGenerating
            ? "Назначение..."
            : hasCurrentAssignments
            ? `Переназначить — ${formatMonth(currentMonth)}`
            : `Назначить на ${formatMonth(currentMonth)}`}
        </Button>

        {/* Current month assignments */}
        {hasCurrentAssignments && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Назначения — {formatMonth(currentMonth)}
            </Label>
            {assignmentsByWarrior.map(({ warrior, recipients }) =>
              recipients.length > 0 ? (
                <div key={warrior.id} className="p-3 bg-muted/30 rounded-lg space-y-1.5">
                  <p className="text-sm font-semibold text-primary">{warrior.name}</p>
                  {recipients.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm pl-1">
                      <span className="text-muted-foreground">→</span>
                      <span>{r.recipient_name}</span>
                    </div>
                  ))}
                </div>
              ) : null
            )}
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export default PrayerAssignmentsCard
