"use client"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Filter, X, ArrowUp, ArrowDown } from "lucide-react"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

export type SortOption = "date" | "alphabet" | "age"
export type SortDirection = "asc" | "desc"

export interface FilterOptions {
  gender: "" | "м" | "ж"
  birthYear: string
  birthMonth: string
  age: string
  name: string
}

export const defaultFilters: FilterOptions = {
  gender: "",
  birthYear: "",
  birthMonth: "",
  age: "",
  name: "",
}

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]

interface FilterBarProps {
  sortBy: SortOption
  sortDirection: SortDirection
  onSortChange: (sort: SortOption) => void
  onSortDirectionToggle: () => void
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
}

export function FilterBar({
  sortBy,
  sortDirection,
  onSortChange,
  onSortDirectionToggle,
  filters,
  onFiltersChange,
}: FilterBarProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 })

  // Position panel under the button
  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: r.bottom + window.scrollY + 8, right: window.innerWidth - r.right })
    }
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return
    updatePos()
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    window.addEventListener("scroll", updatePos, true)
    window.addEventListener("resize", updatePos)
    return () => {
      document.removeEventListener("mousedown", handler)
      window.removeEventListener("scroll", updatePos, true)
      window.removeEventListener("resize", updatePos)
    }
  }, [open])

  const activeCount = [
    filters.gender,
    filters.birthYear,
    filters.birthMonth,
    filters.age,
    filters.name,
  ].filter(Boolean).length

  const update = (key: keyof FilterOptions, value: string) =>
    onFiltersChange({ ...filters, [key]: value })

  const clearAll = () => onFiltersChange(defaultFilters)

  return (
    <div className="relative">
        <Button
          ref={btnRef}
          variant={open || activeCount > 0 ? "default" : "outline"}
          size="icon"
          onClick={() => setOpen((v) => !v)}
          title="Фильтры"
          className="relative h-8 w-8"
        >
          <Filter className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold leading-none">
              {activeCount}
            </span>
          )}
        </Button>

        {open && typeof document !== "undefined" && createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] w-72 rounded-lg border bg-popover text-popover-foreground shadow-lg p-4 space-y-4"
            style={{ top: panelPos.top, right: panelPos.right, minWidth: "18rem" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Фильтры</h4>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs gap-1 px-2">
                  <X className="h-3 w-3" />
                  Сбросить все
                </Button>
              )}
            </div>

            {/* Возраст + Год рождения — одна строка */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Возраст / Год рождения</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Возраст"
                    value={filters.age}
                    onChange={(e) => update("age", e.target.value)}
                    className="h-8 text-sm pr-6"
                    min={0}
                    max={150}
                  />
                  {filters.age && (
                    <button onClick={() => update("age", "")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    placeholder="Год"
                    value={filters.birthYear}
                    onChange={(e) => update("birthYear", e.target.value)}
                    className="h-8 text-sm pr-6"
                    min={1900}
                    max={new Date().getFullYear()}
                  />
                  {filters.birthYear && (
                    <button onClick={() => update("birthYear", "")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Месяц рождения */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Месяц рождения</Label>
              <Select
                value={filters.birthMonth || "__all__"}
                onValueChange={(v) => update("birthMonth", v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Все месяцы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Все месяцы</SelectItem>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Пол */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Пол</Label>
              <div className="flex gap-2">
                {(["", "м", "ж"] as const).map((g) => (
                  <Button
                    key={g === "" ? "all" : g}
                    size="sm"
                    variant={filters.gender === g ? "default" : "outline"}
                    onClick={() => update("gender", g)}
                    className="flex-1 h-8 text-sm"
                  >
                    {g === "" ? "Все" : g === "м" ? "♂ М" : "♀ Ж"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Направление сортировки */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Направление сортировки</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={sortDirection === "asc" ? "default" : "outline"}
                  onClick={() => sortDirection !== "asc" && onSortDirectionToggle()}
                  className="flex-1 h-8 gap-1.5 text-xs"
                >
                  <ArrowUp className="h-3 w-3" />
                  По возрастанию
                </Button>
                <Button
                  size="sm"
                  variant={sortDirection === "desc" ? "default" : "outline"}
                  onClick={() => sortDirection !== "desc" && onSortDirectionToggle()}
                  className="flex-1 h-8 gap-1.5 text-xs"
                >
                  <ArrowDown className="h-3 w-3" />
                  По убыванию
                </Button>
              </div>
            </div>
          </div>
        , document.body)}
    </div>
  )
}
