"use client"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Filter, ArrowUpDown } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

export type SortOption = "date" | "alphabet" | "age"
export type SortDirection = "asc" | "desc"

interface FilterBarProps {
  sortBy: SortOption
  sortDirection: SortDirection
  onSortChange: (sort: SortOption) => void
  onSortDirectionToggle: () => void
}

export function FilterBar({ sortBy, sortDirection, onSortChange, onSortDirectionToggle }: FilterBarProps) {
  const { t } = useLocale()

  const getSortLabel = () => {
    switch (sortBy) {
      case "date":
        return sortDirection === "asc" ? "По дате (ближайшие)" : "По дате (дальние)"
      case "alphabet":
        return sortDirection === "asc" ? "По алфавиту (А-Я)" : "По алфавиту (Я-А)"
      case "age":
        return sortDirection === "asc" ? "По возрасту (младше)" : "По возрасту (старше)"
      default:
        return "Сортировка"
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Label className="text-sm font-medium">Сортировка:</Label>
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>{getSortLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">По дате рождения</SelectItem>
          <SelectItem value="alphabet">По алфавиту</SelectItem>
          <SelectItem value="age">По возрасту</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onSortDirectionToggle} title="Изменить направление сортировки">
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  )
}
