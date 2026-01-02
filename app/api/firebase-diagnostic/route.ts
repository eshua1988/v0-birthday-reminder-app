import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get current server time
    const serverTime = new Date()
    const serverTimeFormatted = serverTime.toISOString()
    const serverTimeHHMMSS = serverTime.toTimeString().split(" ")[0] // HH:MM:SS format

    // Get all birthdays with notifications enabled
    const { data: birthdays, error: birthdaysError } = await supabase
      .from("birthdays")
      .select("*")
      .eq("user_id", user.id)
      .eq("notification_enabled", true)

    if (birthdaysError) {
      console.error("Error fetching birthdays:", birthdaysError)
      return NextResponse.json({ error: birthdaysError.message }, { status: 500 })
    }

    // Get user's default timezone from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("timezone, default_notification_times")
      .eq("user_id", user.id)
      .maybeSingle()

    const userTimezone = settings?.timezone || "UTC"

    // Process each birthday with notification info
    const birthdaysWithDiagnostics = (birthdays || []).map((birthday: any) => {
      const birthdayTimezone = birthday.timezone || userTimezone
      
      // Get current time in the birthday's timezone
      const currentTimeInBirthdayTZ = new Date().toLocaleTimeString("en-US", {
        timeZone: birthdayTimezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      // Get notification times for this birthday
      const notificationTimes = birthday.notification_times || settings?.default_notification_times || ["09:00"]
      
      // Check if any notification should fire right now
      const currentTimeHHMM = currentTimeInBirthdayTZ.substring(0, 5) // Get HH:MM
      const shouldFireNow = notificationTimes.some((time: string) => {
        return time === currentTimeHHMM
      })

      return {
        id: birthday.id,
        name: birthday.name,
        timezone: birthdayTimezone,
        currentTimeInTZ: currentTimeInBirthdayTZ,
        notificationTimes: notificationTimes,
        shouldFireNow: shouldFireNow,
        date: birthday.date,
      }
    })

    return NextResponse.json({
      serverTime: serverTimeHHMMSS,
      serverTimeISO: serverTimeFormatted,
      userTimezone: userTimezone,
      birthdays: birthdaysWithDiagnostics,
      totalBirthdays: birthdaysWithDiagnostics.length,
    })
  } catch (error) {
    console.error("Error in firebase-diagnostic:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
