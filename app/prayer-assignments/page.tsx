"use client"

import { Sidebar } from "@/components/sidebar"
import { PrayerAssignmentsCard } from "@/components/prayer-assignments"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export default function PrayerAssignmentsPage() {
  const isMobile = useIsMobile()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className={cn("flex-1 p-4 md:p-6", isMobile ? "pt-16" : "ml-16 pt-6")}>
        <div className="mx-auto max-w-2xl">
          <PrayerAssignmentsCard />
        </div>
      </main>
    </div>
  )
}
