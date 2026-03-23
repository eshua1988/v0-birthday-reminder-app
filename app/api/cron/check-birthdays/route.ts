import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getFirebaseMessaging, isFirebaseAdminConfigured } from "@/lib/firebase-admin"
import { sendBirthdayReminder } from "@/lib/telegram"
import { formatAge } from "@/lib/utils"

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/check-birthdays",
//     "schedule": "* * * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] ========== CRON JOB STARTED ==========")
    
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization")
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    console.log("[v0] Cron: Auth check:", {
      hasAuthHeader: !!authHeader,
      hasCronSecret: !!process.env.CRON_SECRET,
      authMatch: authHeader === expectedAuth
    })
    
    if (authHeader !== expectedAuth) {
      console.log("[v0] Cron: Unauthorized request - auth mismatch")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get current date and time
    const now = new Date()
    
    // Format time as HH:MM:SS for exact matching
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`
    const currentMonth = now.getMonth()
    const currentDay = now.getDate()

    console.log("[v0] Cron: Checking birthdays at:", currentTime, "Date:", now.toISOString())
    console.log("[v0] Cron: Using external cron for minute-by-minute checks")

    // Get all birthdays that match today and have notifications enabled
    const { data: birthdays, error } = await supabase.from("birthdays").select("*").eq("notification_enabled", true)

    if (error) {
      console.error("[v0] Cron: Error fetching birthdays:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("[v0] Cron: Found", birthdays?.length || 0, "birthdays with notifications enabled")

    // Get all settings including telegram_chat_id and global notification times
    const { data: globalSettings } = await supabase
      .from("settings")
      .select("*")

    const globalTimesMap = new Map<string, string[]>()
    const userTimezonesMap = new Map<string, string>()
    const userTelegramMap = new Map<string, string>() // user_id -> telegram_chat_id
    const userEmailMap = new Map<string, string>() // user_id -> email
    const userNotificationsEnabledMap = new Map<string, boolean>() // user_id -> notifications_enabled

    // Load user emails via admin API
    try {
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (usersData?.users) {
        for (const u of usersData.users) {
          if (u.email) userEmailMap.set(u.id, u.email)
        }
      }
    } catch (e) {
      console.error("[v0] Cron: Failed to load user emails:", e)
    }
    
    if (globalSettings) {
      for (const setting of globalSettings) {
        // Load telegram_chat_id from direct column
        if (setting.telegram_chat_id) {
          userTelegramMap.set(setting.user_id, setting.telegram_chat_id)
          console.log("[v0] Cron: Found Telegram chat_id for user", setting.user_id, ":", setting.telegram_chat_id)
        }
        
        // Load timezone
        if (setting.key === "timezone") {
          userTimezonesMap.set(setting.user_id, setting.value)
        }
        
        // Load global notifications enabled flag
        if (setting.key === "notifications_enabled") {
          userNotificationsEnabledMap.set(setting.user_id, setting.value === "true")
        }
        
        // Load notification times
        if (setting.key === "default_notification_time") {
          if (!globalTimesMap.has(setting.user_id)) {
            globalTimesMap.set(setting.user_id, [])
          }
          globalTimesMap.get(setting.user_id)!.push(setting.value)
        } else if (setting.key === "default_notification_times") {
          if (!globalTimesMap.has(setting.user_id)) {
            globalTimesMap.set(setting.user_id, [])
          }
          try {
            const times = JSON.parse(setting.value)
            if (Array.isArray(times)) {
              globalTimesMap.get(setting.user_id)!.push(...times)
            }
          } catch (e) {
            console.error("[v0] Cron: Error parsing default_notification_times:", e)
          }
        }
      }
    }

    console.log("[v0] Cron: Loaded global notification times for", globalTimesMap.size, "users")
    console.log("[v0] Cron: Loaded timezones for", userTimezonesMap.size, "users")
    console.log("[v0] Cron: Loaded Telegram chat IDs for", userTelegramMap.size, "users")
    
    // Debug: log all loaded settings
    console.log("[v0] Cron: All global times map:", Array.from(globalTimesMap.entries()))
    console.log("[v0] Cron: All timezones map:", Array.from(userTimezonesMap.entries()))

    let notificationsSent = 0
    let birthdaysChecked = 0
    let birthdaysMatched = 0
    const notifications: any[] = []

    for (const birthday of birthdays || []) {
      birthdaysChecked++

      // Check if user has globally disabled notifications (default = enabled if not set)
      const notificationsEnabled = userNotificationsEnabledMap.get(birthday.user_id)
      if (notificationsEnabled === false) {
        console.log("[v0] Cron: Skipping - notifications globally disabled for user", birthday.user_id)
        continue
      }

      // Support both 'date' and 'birth_date' fields
      const birthDate = new Date(birthday.date || birthday.birth_date)
      
      // Get birthday's individual timezone first, fallback to user's global timezone
      let birthdayTimezone = birthday.timezone || userTimezonesMap.get(birthday.user_id) || "UTC"
      if (birthdayTimezone === "auto" || birthdayTimezone === "disabled") {
        birthdayTimezone = "UTC"
      }
      
      // Get current time in birthday's timezone
      let userNow: Date
      try {
        userNow = new Date(now.toLocaleString("en-US", { timeZone: birthdayTimezone }))
      } catch (e) {
        console.error("[v0] Cron: Invalid timezone", birthdayTimezone, "for birthday", birthday.id, "using UTC")
        userNow = now
        birthdayTimezone = "UTC"
      }
      
      const userCurrentTime = `${userNow.getHours().toString().padStart(2, "0")}:${userNow.getMinutes().toString().padStart(2, "0")}:00`
      const userCurrentMonth = userNow.getMonth()
      const userCurrentDay = userNow.getDate()
      
      const isBirthdayToday = birthDate.getMonth() === userCurrentMonth && birthDate.getDate() === userCurrentDay

      if (!isBirthdayToday) {
        continue
      }

      birthdaysMatched++
      
      // Collect all notification times for this birthday
      const notificationTimes: string[] = []

      console.log("[v0] Cron: Processing birthday:", {
        id: birthday.id,
        name: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
        birthdayTimezone: birthdayTimezone,
        userCurrentTime: userCurrentTime,
        notification_times_raw: birthday.notification_times,
        notification_time_raw: birthday.notification_time,
        notification_enabled: birthday.notification_enabled,
        user_id: birthday.user_id,
      })

      // 1. Individual notification times (notification_times array)
      if (birthday.notification_times && Array.isArray(birthday.notification_times)) {
        // Normalize to HH:MM:SS format
        notificationTimes.push(...birthday.notification_times.map((t: string) => 
          t.length === 5 ? `${t}:00` : t
        ))
        console.log("[v0] Cron: Added individual notification_times array:", birthday.notification_times)
      }

      // 2. Individual notification time (legacy single time)
      if (birthday.notification_time) {
        // Normalize to HH:MM:SS format
        const time = birthday.notification_time
        notificationTimes.push(time.length === 5 ? `${time}:00` : time)
        console.log("[v0] Cron: Added individual notification_time:", birthday.notification_time)
      }

      // 3. Global notification times for this user
      const globalTimes = globalTimesMap.get(birthday.user_id)
      console.log("[v0] Cron: Global times for user", birthday.user_id, ":", globalTimes)
      
      if (globalTimes && globalTimes.length > 0) {
        // Normalize to HH:MM:SS format
        notificationTimes.push(...globalTimes.map(t => 
          t.length === 5 ? `${t}:00` : t
        ))
        console.log("[v0] Cron: Added global times:", globalTimes)
      }

      // 4. If no notification times found anywhere, skip this birthday
      if (notificationTimes.length === 0) {
        console.log("[v0] Cron: No notification times configured for this birthday, skipping")
        continue
      }

      // Remove duplicates
      const uniqueTimes = [...new Set(notificationTimes)]

      console.log("[v0] Cron: Birthday TODAY:", birthday.name || `${birthday.first_name} ${birthday.last_name}`, {
        birthdayTimezone,
        userCurrentTime,
        notificationTimes: uniqueTimes,
        shouldNotify: uniqueTimes.includes(userCurrentTime),
      })

      // Check if current time matches any notification time (in user's timezone)
      if (!uniqueTimes.includes(userCurrentTime)) {
        console.log("[v0] Cron: Skipping - time doesn't match")
        continue
      }
      
      console.log("[v0] Cron: TIME MATCH! Sending notification")
      
      // Get FCM tokens for this user
      const { data: tokens } = await supabase.from("fcm_tokens").select("token").eq("user_id", birthday.user_id)

      if (tokens && tokens.length > 0) {
        const fcmTokens = (tokens as { token: string }[]).map((t) => t.token)

        console.log(
          "[v0] Cron: Sending notification for:",
          birthday.name || `${birthday.first_name} ${birthday.last_name}`,
          "to",
          fcmTokens.length,
          "devices",
        )

        if (isFirebaseAdminConfigured()) {
          try {
            const messaging = getFirebaseMessaging()
            const age = userNow.getFullYear() - birthDate.getFullYear()
            const fullName = birthday.name || `${birthday.first_name} ${birthday.last_name}`

            const ageText = formatAge(age)
            const notifBody = `${fullName} — сегодня исполняется ${ageText}!`
            // Data-only message: Firebase SDK calls onBackgroundMessage in SW,
            // which shows exactly ONE notification. Do NOT add a 'notification'
            // field here — that would cause duplicate notifications.
            const message = {
              data: {
                title: "🎂 День рождения!",
                body: notifBody,
                userEmail: userEmailMap.get(birthday.user_id) || '',
                birthdayId: birthday.id.toString(),
                firstName: birthday.first_name || birthday.name?.split(' ')[0] || '',
                lastName: birthday.last_name || birthday.name?.split(' ').slice(1).join(' ') || '',
                age: age.toString(),
                type: "birthday_reminder",
                icon: "/icon-192x192.png",
                badge: "/badge-72x72.png",
                tag: `birthday-${birthday.id}`,
                url: "/?birthday=" + birthday.id,
                timestamp: Date.now().toString(),
              },
              android: {
                priority: "high" as const,
                ttl: 86400000, // 24 hours
              },
              webpush: {
                headers: {
                  Urgency: "high",
                  TTL: "86400",
                },
              },
              tokens: fcmTokens,
            }

            const response = await messaging.sendEachForMulticast(message)

            console.log("[v0] Cron: FCM sent successfully:", {
              birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
              successCount: response.successCount,
              failureCount: response.failureCount,
            })

            // Handle failed tokens
            if (response.failureCount > 0) {
              response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                  console.error(`[v0] Cron: Failed token ${idx}:`, resp.error?.message)

                  // Remove invalid tokens from database
                  if (
                    resp.error?.code === "messaging/invalid-registration-token" ||
                    resp.error?.code === "messaging/registration-token-not-registered"
                  ) {
                    supabase
                      .from("fcm_tokens")
                      .delete()
                      .eq("token", fcmTokens[idx])
                      .then(() => console.log(`[v0] Cron: Removed invalid FCM token`))
                  }
                }
              })
            }

            notificationsSent += response.successCount
            notifications.push({
              birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
              sent: response.successCount,
              failed: response.failureCount,
            })
          } catch (firebaseError) {
            console.error("[v0] Cron: Firebase error:", firebaseError)
            notifications.push({
              birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
              error: firebaseError instanceof Error ? firebaseError.message : String(firebaseError),
            })
          }
        } else {
          console.log("[v0] Cron: Firebase Admin SDK not configured, skipping")
          notifications.push({
            birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
            status: "Firebase not configured",
          })
        }
      } else {
        console.log("[v0] Cron: No FCM tokens found for user:", birthday.user_id)
        notifications.push({
          birthday: birthday.name || `${birthday.first_name} ${birthday.last_name}`,
          status: "No FCM tokens",
        })
      }

      // Also send via Telegram if user has linked their account
      const telegramChatId = userTelegramMap.get(birthday.user_id)
      if (telegramChatId) {
        const age = userNow.getFullYear() - birthDate.getFullYear()
        const fullName = birthday.name || `${birthday.first_name} ${birthday.last_name}`
        
        console.log("[v0] Cron: Sending Telegram notification to chat:", telegramChatId)
        
        const userEmail = userEmailMap.get(birthday.user_id)
        const telegramResult = await sendBirthdayReminder(telegramChatId, fullName, 0, age, birthDate, userEmail)
        
        if (telegramResult.ok) {
          console.log("[v0] Cron: Telegram notification sent successfully")
          notificationsSent++
        } else {
          console.error("[v0] Cron: Telegram notification failed:", telegramResult.error || telegramResult.description)
        }
      }
    }

    console.log("[v0] ========== CRON JOB COMPLETED ==========")
    console.log("[v0] Summary:", {
      birthdaysChecked,
      birthdaysToday: birthdaysMatched,
      notificationsSent,
      currentTime,
      timestamp: now.toISOString()
    })

    // ===== Prayer assignment auto-generation =====
    // Run once per day when the current day matches a user's prayer notify day
    let prayerGenerated = 0
    try {
      const todayDay = now.getDate()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const todayStr = now.toISOString().slice(0, 10)

      // Load all prayer-related settings
      const { data: prayerSettings } = await supabase
        .from("settings")
        .select("user_id, key, value")
        .in("key", [
          "prayer_notify_days", "prayer_telegram_notify", "prayer_list_id",
          "prayer_assignments_per_warrior", "prayer_cycle_number",
          "prayer_last_generated_date",
        ])

      // Group by user
      const prayerMap = new Map<string, Record<string, string>>()
      for (const row of prayerSettings || []) {
        if (!prayerMap.has(row.user_id)) prayerMap.set(row.user_id, {})
        if (row.key) prayerMap.get(row.user_id)![row.key] = row.value
      }

      for (const [userId, ps] of prayerMap.entries()) {
        let notifyDays: number[] = []
        try { notifyDays = JSON.parse(ps.prayer_notify_days || "[]") } catch {}
        if (!notifyDays.includes(todayDay)) continue
        if (ps.prayer_last_generated_date === todayStr) continue

        // Load warriors
        const { data: warriors } = await supabase
          .from("prayer_warriors").select("id, name").eq("user_id", userId).order("created_at")
        if (!warriors || warriors.length === 0) continue

        const perWarrior = parseInt(ps.prayer_assignments_per_warrior || "2") || 2
        let cycleNum = parseInt(ps.prayer_cycle_number || "1") || 1
        const listId = ps.prayer_list_id || "__all__"

        // Load recipients
        let rq = supabase.from("birthdays").select("id, first_name, last_name").eq("user_id", userId)
        if (listId !== "__all__") rq = rq.eq("list_id", listId)
        const { data: allBdays } = await rq
        const allRecipients = (allBdays || []).map((b: any) => ({
          id: b.id,
          name: `${b.first_name || ""} ${b.last_name || ""}`.trim(),
        }))
        if (allRecipients.length === 0) continue

        // Load per-warrior cycle settings
        const { data: warriorCycleRows } = await supabase
          .from("settings")
          .select("key, value")
          .eq("user_id", userId)
          .like("key", "prayer_warrior_cycle_%")

        const warriorCycleMap = new Map<string, number>()
        for (const s of warriorCycleRows || []) {
          const wid = s.key.replace("prayer_warrior_cycle_", "")
          warriorCycleMap.set(wid, parseInt(s.value) || 1)
        }

        // Delete current month, insert new per-warrior
        await supabase.from("prayer_assignments").delete().eq("user_id", userId).eq("assigned_month", currentMonth)

        const rows: any[] = []
        for (const w of warriors) {
          const wCycle = warriorCycleMap.get(w.id) || 1

          // Find already assigned to this warrior in their current cycle
          const { data: wAssigned } = await supabase
            .from("prayer_assignments")
            .select("recipient_id")
            .eq("user_id", userId)
            .eq("warrior_id", w.id)
            .eq("cycle_number", wCycle)

          const assignedIds = new Set((wAssigned || []).map((a: any) => a.recipient_id).filter(Boolean))
          let remaining = allRecipients.filter((r: any) => !assignedIds.has(r.id))

          let thisCycle = wCycle
          if (remaining.length < perWarrior) {
            thisCycle = wCycle + 1
            remaining = allRecipients
            await supabase.from("settings").upsert(
              [{ user_id: userId, key: `prayer_warrior_cycle_${w.id}`, value: String(thisCycle) }],
              { onConflict: "user_id,key" }
            )
          }

          const shuffled = [...remaining].sort(() => Math.random() - 0.5)
          for (let i = 0; i < perWarrior; i++) {
            if (i >= shuffled.length) break
            const r = shuffled[i]
            rows.push({ user_id: userId, warrior_id: w.id, recipient_name: r.name, recipient_id: r.id, assigned_month: currentMonth, cycle_number: thisCycle })
          }
        }
        if (rows.length === 0) continue

        await supabase.from("prayer_assignments").insert(rows)
        await supabase.from("settings").upsert(
          [{ user_id: userId, key: "prayer_last_generated_date", value: todayStr }], { onConflict: "user_id,key" }
        )
        prayerGenerated++
        console.log("[v0] Prayer: Generated", rows.length, "assignments for user", userId)

        // Send to Telegram if enabled
        if (ps.prayer_telegram_notify === "true" && userTelegramMap.has(userId)) {
          const chatId = userTelegramMap.get(userId)!
          const monthNames = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"]
          const [yr, mo] = currentMonth.split("-")
          const wMap = new Map(warriors.map((w: any) => [w.id, w.name]))
          const grouped = new Map<string, string[]>()
          for (const r of rows) {
            const wn = wMap.get(r.warrior_id) as string || "—"
            if (!grouped.has(wn)) grouped.set(wn, [])
            grouped.get(wn)!.push(r.recipient_name)
          }
          let text = `🙏 <b>Молитвенные назначения — ${monthNames[parseInt(mo)-1]} ${yr}</b>\n\n`
          for (const [wn, recs] of grouped.entries()) {
            text += `<b>${wn}</b>\n`
            recs.forEach((rn, i) => { text += `  ${i+1}. ${rn}\n` })
            text += "\n"
          }
          const { sendTelegramMessage: stm } = await import("@/lib/telegram")
          await stm({ chatId, text, parseMode: "HTML" })
        }
      }
    } catch (prayerError) {
      console.error("[v0] Prayer assignment cron error:", prayerError)
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${birthdaysChecked} birthdays, found ${birthdaysMatched} today, sent ${notificationsSent} notifications`,
      timestamp: now.toISOString(),
      currentTime,
      birthdaysChecked,
      birthdaysToday: birthdaysMatched,
      notificationsSent,
      notifications,
      prayerGenerated,
    })
  } catch (error) {
    console.error("[v0] ========== CRON JOB ERROR ==========")
    console.error("[v0] Cron: Error in cron job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
