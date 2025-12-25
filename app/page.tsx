"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Birthday, ViewMode } from "@/types/birthday"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { FilterBar, type SortOption } from "@/components/filter-bar"
import { BirthdayCard } from "@/components/birthday-card"
import { BirthdayList } from "@/components/birthday-list"
import { BirthdayTable } from "@/components/birthday-table"
import { BirthdayForm } from "@/components/birthday-form"
import { BulkAddForm } from "@/components/bulk-add-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Users, Search } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useAutoSync } from "@/hooks/use-auto-sync"

interface HistoryState {
  birthdays: Birthday[]
}

export default function HomePage() {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [filteredBirthdays, setFilteredBirthdays] = useState<Birthday[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isBulkFormOpen, setIsBulkFormOpen] = useState(false)
  const [editingBirthday, setEditingBirthday] = useState<Birthday | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const supabase = createClient()
  const { scheduleSync } = useAutoSync({ enabled: autoSyncEnabled })

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        console.log("[v0] Current user:", user?.id)
        setUserId(user?.id || null)
      } catch (error) {
        console.error("[v0] Error getting user:", error)
        setUserId(null)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    fetchBirthdays()
  }, [])

  useEffect(() => {
    filterAndSortBirthdays()
  }, [searchQuery, birthdays, sortBy, sortDirection])

  useEffect(() => {
    const loadAutoSyncSetting = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .eq("key", "auto_sync_enabled")
        .maybeSingle()

      if (error) {
        console.log("[v0] Error loading auto sync setting:", error)
      }

      if (data) {
        setAutoSyncEnabled(data.value === "true")
      } else {
        const { error: insertError } = await supabase
          .from("settings")
          .upsert([{ user_id: userId, key: "auto_sync_enabled", value: "false" }], { onConflict: "user_id,key" })

        if (insertError) {
          console.log("[v0] Error creating default auto sync setting:", insertError.message)
        }
      }
    }

    if (userId) {
      loadAutoSyncSetting()
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchBirthdays()
    }
  }, [userId])

  const fetchBirthdays = async () => {
    if (!userId) {
      console.log("[v0] No user ID, skipping fetch")
      setIsLoading(false)
      return
    }

    console.log("[v0] Fetching birthdays for user:", userId)
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("birthdays")
        .select("*")
        .eq("user_id", userId)
        .order("birth_date", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching birthdays:", error)
      } else {
        console.log("[v0] Fetched birthdays:", data?.length || 0, "records")
        setBirthdays(data || [])
        if (data) {
          setHistory([{ birthdays: data }])
          setHistoryIndex(0)
        }
      }
    } catch (error) {
      console.error("[v0] Exception fetching birthdays:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveToHistory = (newBirthdays: Birthday[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ birthdays: newBirthdays })
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setBirthdays(history[newIndex].birthdays)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setBirthdays(history[newIndex].birthdays)
    }
  }

  const filterAndSortBirthdays = () => {
    let filtered = birthdays

    if (searchQuery) {
      filtered = birthdays.filter(
        (b) =>
          b.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.last_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      if (sortBy === "alphabet") {
        comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      } else if (sortBy === "age") {
        const ageA = calculateAge(a.birth_date)
        const ageB = calculateAge(b.birth_date)
        comparison = ageA - ageB
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const getNextBirthday = (date: string) => {
          const birth = new Date(date)
          const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
          next.setHours(0, 0, 0, 0)

          // If birthday is today, return current date (keeps it first)
          if (next.getTime() === today.getTime()) {
            return next.getTime()
          }

          // If birthday has passed this year, move to next year
          if (next < today) {
            next.setFullYear(today.getFullYear() + 1)
          }
          return next.getTime()
        }

        const nextA = getNextBirthday(a.birth_date)
        const nextB = getNextBirthday(b.birth_date)

        // Both are today - sort by time if available, otherwise by name
        if (nextA === today.getTime() && nextB === today.getTime()) {
          return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
        }

        comparison = nextA - nextB
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    setFilteredBirthdays(sorted)
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

  const handleSave = async (data: Partial<Birthday>) => {
    console.log("[v0] Saving birthday data:", data)

    const birthdayData = { ...data, user_id: userId }

    if (editingBirthday) {
      console.log("[v0] Updating existing birthday, id:", editingBirthday.id)
      const { data: updatedData, error } = await supabase
        .from("birthdays")
        .update(birthdayData)
        .eq("id", editingBirthday.id)
        .select()

      if (error) {
        console.error("[v0] Error updating birthday:", error)
        alert(`Ошибка при обновлении: ${error.message}`)
      } else {
        console.log("[v0] Birthday updated successfully:", updatedData)
        await fetchBirthdays()
        setEditingBirthday(null)
        setIsFormOpen(false)
        scheduleSync()
      }
    } else {
      console.log("[v0] Inserting new birthday")
      const { data: insertedData, error } = await supabase.from("birthdays").insert([birthdayData]).select()

      if (error) {
        console.error("[v0] Error creating birthday:", error)
        alert(`Ошибка при создании: ${error.message}`)
      } else {
        console.log("[v0] Birthday created successfully:", insertedData)
        await fetchBirthdays()
        setIsFormOpen(false)
        scheduleSync()
      }
    }
  }

  const handleBulkSave = async (members: Partial<Birthday>[]) => {
    console.log("[v0] Bulk saving birthdays, count:", members.length)
    console.log("[v0] Members data:", members)

    const membersWithUserId = members.map((m) => ({ ...m, user_id: userId }))

    const { data: insertedData, error } = await supabase.from("birthdays").insert(membersWithUserId).select()

    if (error) {
      console.error("[v0] Error creating birthdays:", error)
      alert(`Ошибка при массовом добавлении: ${error.message}`)
    } else {
      console.log("[v0] Birthdays created successfully, count:", insertedData?.length)
      await fetchBirthdays()
      setIsBulkFormOpen(false)
      scheduleSync()
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t.confirmDelete)) {
      console.log("[v0] Deleting birthday, id:", id)
      const { error } = await supabase.from("birthdays").delete().eq("id", id)

      if (error) {
        console.error("[v0] Error deleting birthday:", error)
        alert(`Ошибка при удалении: ${error.message}`)
      } else {
        console.log("[v0] Birthday deleted successfully")
        const newBirthdays = birthdays.filter((b) => b.id !== id)
        setBirthdays(newBirthdays)
        saveToHistory(newBirthdays)
        scheduleSync()
      }
    }
  }

  const handleEdit = (birthday: Birthday) => {
    setEditingBirthday(birthday)
    setIsFormOpen(true)
  }

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 w-full">
        <Header
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />

        <main className={cn(isMobile ? "p-4 pt-20" : "p-8 ml-16 pt-24 md:ml-16")}>
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className={cn("font-bold", isMobile ? "text-2xl" : "text-3xl")}>{t.upcomingBirthdays}</h1>
                <p className="text-muted-foreground mt-1">
                  {birthdays.length} {birthdays.length === 1 ? "member" : "members"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsFormOpen(true)} className={cn(isMobile && "flex-1")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.addMember}
                </Button>
                <Button variant="outline" onClick={() => setIsBulkFormOpen(true)} className={cn(isMobile && "flex-1")}>
                  <Users className="h-4 w-4 mr-2" />
                  {t.addMultiple}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <FilterBar
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={setSortBy}
                onSortDirectionToggle={toggleSortDirection}
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Загрузка...</div>
              </div>
            ) : filteredBirthdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{t.noMembers}</h3>
                <p className="text-muted-foreground mt-2">{t.noMembersDescription}</p>
              </div>
            ) : (
              <>
                {viewMode === "cards" && (
                  <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}>
                    {filteredBirthdays.map((birthday) => (
                      <BirthdayCard key={birthday.id} birthday={birthday} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}

                {viewMode === "list" && (
                  <BirthdayList birthdays={filteredBirthdays} onEdit={handleEdit} onDelete={handleDelete} />
                )}

                {viewMode === "table" && (
                  <BirthdayTable birthdays={filteredBirthdays} onEdit={handleEdit} onDelete={handleDelete} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <BirthdayForm
        birthday={editingBirthday}
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingBirthday(null)
        }}
        onSave={handleSave}
      />

      <BulkAddForm open={isBulkFormOpen} onOpenChange={setIsBulkFormOpen} onSave={handleBulkSave} />
    </div>
  )
}
