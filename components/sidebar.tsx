"use client"

import { Home, Settings, Calendar, Menu, X, MessageSquareHeart, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/locale-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  // Swipe handling
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const sidebarRef = useRef<HTMLElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    
    // Swipe right to open (from left edge, horizontal swipe)
    if (!isOpen && touchStartX.current < 30 && deltaX > 80 && deltaY < 100) {
      setIsOpen(true)
    }
    
    // Swipe left to close
    if (isOpen && deltaX < -80 && deltaY < 100) {
      setIsOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isMobile) {
      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isMobile, handleTouchStart, handleTouchEnd])

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

      if (error) {
        console.log("[v0] Error loading profile:", error)
      }

      if (profileData) {
        setProfile(profileData)
      } else {
        // Создаем профиль, если его нет
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([{ id: user.id, email: user.email }])
          .select()
          .single()

        if (insertError) {
          console.log("[v0] Error creating profile:", insertError)
        } else {
          setProfile(newProfile)
        }
      }
    }
  }

  const links = [
    { href: "/", icon: Home, label: t.home },
    { href: "/calendar", icon: Calendar, label: t.calendar },
    { href: "/greetings", icon: MessageSquareHeart, label: t.greetings || "Поздравления" },
    { href: "/settings", icon: Settings, label: t.settings },
  ]

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-[60] md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-64 border-r bg-background transition-transform duration-200 md:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <nav className="flex h-full flex-col py-16 px-4 justify-between">
            <div>
              {user && (
                <Link href="/profile" onClick={() => setIsOpen(false)} className="mb-4 p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt="Profile" />
                      <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{user.email}</p>
                    </div>
                  </div>
                </Link>
              )}

              <div className="flex flex-col gap-2">
                {links.map((link) => {
                  const Icon = link.icon
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-2">
              <Button variant="destructive" onClick={handleLogout} className="w-full flex items-center justify-center">
                <LogOut className="mr-2 h-4 w-4" />
                {t.logout}
              </Button>
            </div>
          </nav>
        </aside>
      </>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 border-r bg-background hidden md:block">
      <nav className="flex h-full flex-col items-center py-6 gap-2 justify-between">
        <div>
          {user && (
            <Link
              href="/profile"
              className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden"
              title="Профиль"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} alt="Profile" />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
          )}

          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={link.label}
              >
                <Icon className="h-5 w-5" />
                <span className="sr-only">{link.label}</span>
              </Link>
            )
          })}
        </div>
        <div className="mb-2">
          <Button variant="destructive" onClick={handleLogout} className="flex h-12 w-12 items-center justify-center">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">{t.logout}</span>
          </Button>
        </div>
      </nav>
    </aside>
  )
}
