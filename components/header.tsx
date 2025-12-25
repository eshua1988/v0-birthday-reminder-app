"use client"

import { Languages, Undo2, Redo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import type { ViewMode } from "@/types/birthday"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import { useIsMobile } from "@/hooks/use-mobile"

interface HeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function Header({ viewMode, onViewModeChange, canUndo, canRedo, onUndo, onRedo }: HeaderProps) {
  const { locale, setLocale } = useLocale()
  const isMobile = useIsMobile()

  const languages: { value: Locale; label: string; flag: string }[] = [
    { value: "ru", label: "Русский", flag: "🇷🇺" },
    { value: "pl", label: "Polski", flag: "🇵🇱" },
    { value: "uk", label: "Українська", flag: "🇺🇦" },
    { value: "en", label: "English", flag: "🇬🇧" },
  ]

  const currentLanguage = languages.find((lang) => lang.value === locale)

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 pl-16 sm:pl-6">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={isMobile ? "icon" : "sm"} className="gap-2 bg-transparent">
                <Languages className="h-4 w-4" />
                {!isMobile && <span>{currentLanguage?.label}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {languages.map((lang) => (
                <DropdownMenuItem key={lang.value} onClick={() => setLocale(lang.value)} className="cursor-pointer">
                  <span className="mr-2 text-lg">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {locale === lang.value && <span className="ml-2 text-xs">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} title="Отменить">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo} title="Повторить">
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </header>
  )
}
