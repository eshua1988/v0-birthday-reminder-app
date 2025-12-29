import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { isFirebaseAdminConfigured } from "@/lib/firebase-admin"

/**
 * Diagnostic endpoint to check notification setup
 * URL: /api/cron/check-setup
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    console.log("[Diagnostic] Starting system check...")

    // Check 1: Firebase Admin
    const firebaseConfigured = isFirebaseAdminConfigured()
    console.log("[Diagnostic] Firebase Admin SDK:", firebaseConfigured ? "✅ Configured" : "❌ Not configured")

    // Check 2: All users
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    console.log("[Diagnostic] Total users:", allUsers?.users?.length || 0)

    // Check 3: FCM tokens
    const { data: allTokens } = await supabase.from("fcm_tokens").select("*")
    console.log("[Diagnostic] Total FCM tokens:", allTokens?.length || 0)

    const tokensByUser = allTokens?.reduce((acc: any, token: any) => {
      acc[token.user_id] = (acc[token.user_id] || 0) + 1
      return acc
    }, {})

    // Check 4: Birthdays with notifications enabled
    const { data: enabledBirthdays } = await supabase
      .from("birthdays")
      .select("*")
      .eq("notification_enabled", true)

    console.log("[Diagnostic] Birthdays with notifications enabled:", enabledBirthdays?.length || 0)

    // Check 5: Birthdays today
    const birthdaysToday = enabledBirthdays?.filter((b: any) => {
      const birthDate = new Date(b.birth_date)
      return birthDate.getMonth() === currentMonth && birthDate.getDate() === currentDay
    })

    console.log("[Diagnostic] Birthdays TODAY:", birthdaysToday?.length || 0)

    // Check 6: Global notification settings
    const { data: globalSettings } = await supabase
      .from("settings")
      .select("*")
      .in("key", ["default_notification_time", "default_notification_times", "timezone"])

    console.log("[Diagnostic] Global notification settings:", globalSettings?.length || 0)
    
    // Check 7: User timezones
    const userTimezones = globalSettings?.filter(s => s.key === "timezone") || []
    console.log("[Diagnostic] User timezones:", userTimezones.length, userTimezones.map(t => ({ userId: t.user_id, timezone: t.value })))

    // Detailed analysis
    const analysis = {
      timestamp: now.toISOString(),
      currentTime,
      currentDate: `${currentMonth + 1}/${currentDay}`,
      
      firebase: {
        configured: firebaseConfigured,
        serviceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      },
      
      users: {
        total: allUsers?.users?.length || 0,
        withTokens: Object.keys(tokensByUser || {}).length,
      },
      
      tokens: {
        total: allTokens?.length || 0,
        byUser: tokensByUser,
        examples: allTokens?.slice(0, 3).map((t: any) => ({
          userId: t.user_id,
          tokenPreview: t.token.substring(0, 20) + "...",
          createdAt: t.created_at,
        })),
      },
      
      birthdays: {
        total: enabledBirthdays?.length || 0,
        today: birthdaysToday?.length || 0,
        list: birthdaysToday?.map((b: any) => ({
          name: `${b.first_name} ${b.last_name}`,
          birthDate: b.birth_date,
          notificationTime: b.notification_time,
          notificationTimes: b.notification_times,
          userId: b.user_id,
          hasTokens: tokensByUser?.[b.user_id] > 0,
        })),
      },
      
      settings: {
        total: globalSettings?.length || 0,
        timezones: userTimezones.map(t => ({ userId: t.user_id, timezone: t.value })),
        details: globalSettings?.map((s: any) => ({
          userId: s.user_id,
          key: s.key,
          value: s.value,
        })),
      },
      
      issues: [] as string[],
    }

    // Identify issues
    if (!firebaseConfigured) {
      analysis.issues.push("❌ Firebase Admin SDK not configured - add FIREBASE_SERVICE_ACCOUNT_KEY to Vercel")
    }

    if (!allTokens || allTokens.length === 0) {
      analysis.issues.push("❌ No FCM tokens found - users need to allow notifications in browser")
    }

    if (!enabledBirthdays || enabledBirthdays.length === 0) {
      analysis.issues.push("⚠️ No birthdays have notifications enabled")
    }

    if (!birthdaysToday || birthdaysToday.length === 0) {
      analysis.issues.push("ℹ️ No birthdays today - nothing to send")
    } else {
      // Check if any birthday has matching notification time
      let hasMatchingTime = false
      for (const birthday of birthdaysToday) {
        const times: string[] = []
        
        if (birthday.notification_times && Array.isArray(birthday.notification_times)) {
          times.push(...birthday.notification_times)
        }
        if (birthday.notification_time) {
          times.push(birthday.notification_time)
        }
        
        const globalTimes = globalSettings?.filter((s: any) => s.user_id === birthday.user_id)
        for (const setting of globalTimes || []) {
          if (setting.key === "default_notification_time") {
            times.push(setting.value)
          } else if (setting.key === "default_notification_times") {
            try {
              const parsed = JSON.parse(setting.value)
              if (Array.isArray(parsed)) times.push(...parsed)
            } catch (e) {}
          }
        }
        
        if (times.includes(currentTime)) {
          hasMatchingTime = true
          break
        }
      }
      
      if (!hasMatchingTime) {
        analysis.issues.push(`⚠️ Current time (${currentTime}) doesn't match any notification times for birthdays today`)
      }
    }

    if (analysis.issues.length === 0) {
      analysis.issues.push("✅ Everything looks good!")
    }

    return NextResponse.json({
      success: true,
      analysis,
    })
    
  } catch (error) {
    console.error("[Diagnostic] Error:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
