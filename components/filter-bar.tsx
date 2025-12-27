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
        return sortDirection === "asc" ? t.sortDateNearest : t.sortDateFurthest
      case "alphabet":
        return sortDirection === "asc" ? t.sortAlphabetAsc : t.sortAlphabetDesc
      case "age":
        return sortDirection === "asc" ? t.sortAgeYounger : t.sortAgeOlder
      default:
        return t.sorting
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <Label className="text-sm font-medium">{t.sorting}:</Label>
      <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>{getSortLabel()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">{t.sortByDate}</SelectItem>
          <SelectItem value="alphabet">{t.sortByAlphabet}</SelectItem>
          <SelectItem value="age">{t.sortByAge}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onSortDirectionToggle} title={t.toggleSortDirection}>
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  )
}
