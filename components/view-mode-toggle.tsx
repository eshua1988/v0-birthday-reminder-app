"use client"

import { LayoutGrid, List, Table } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/types/birthday"
import { useLocale } from "@/lib/locale-context"

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  const { t } = useLocale()

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange("cards")}
        className={cn(
          "h-8 px-3",
          viewMode === "cards" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        )}
        title={t.cards}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange("list")}
        className={cn(
          "h-8 px-3",
          viewMode === "list" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        )}
        title={t.list}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange("table")}
        className={cn(
          "h-8 px-3",
          viewMode === "table" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        )}
        title={t.table}
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  )
}
