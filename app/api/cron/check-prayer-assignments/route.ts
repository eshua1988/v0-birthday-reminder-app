import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendTelegramMessage } from "@/lib/telegram"

const MONTH_NAMES_GEN = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
]

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-")
  return `${MONTH_NAMES_GEN[parseInt(month) - 1]} ${year}`
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date()
  const todayDay = now.getDate()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD

  console.log("[prayer-cron] Running prayer assignment check, today:", todayStr, "day:", todayDay)

  // Load all prayer-related settings grouped by user
  const { data: allSettings } = await supabase
    .from("settings")
    .select("user_id, key, value, telegram_chat_id")
    .in("key", [
      "prayer_notify_days", "prayer_telegram_notify", "prayer_list_id",
      "prayer_assignments_per_warrior", "prayer_cycle_number",
      "prayer_last_generated_date",
    ])

  if (!allSettings) {
    return NextResponse.json({ ok: true, generated: 0, message: "No settings found" })
  }

  // Group by user
  const userSettingsMap = new Map<string, Record<string, string>>()
  const userTelegramMap = new Map<string, string>()

  for (const row of allSettings) {
    if (!userSettingsMap.has(row.user_id)) userSettingsMap.set(row.user_id, {})
    if (row.key) userSettingsMap.get(row.user_id)![row.key] = row.value
    if (row.telegram_chat_id) userTelegramMap.set(row.user_id, row.telegram_chat_id)
  }

  // Also load telegram_chat_id from all settings rows (it's a direct column)
  const { data: telegramRows } = await supabase
    .from("settings")
    .select("user_id, telegram_chat_id")
    .not("telegram_chat_id", "is", null)
  for (const row of telegramRows || []) {
    if (row.telegram_chat_id) userTelegramMap.set(row.user_id, row.telegram_chat_id)
  }

  let generated = 0
  const results: any[] = []

  for (const [userId, settings] of userSettingsMap.entries()) {
    try {
      // Parse notify days
      let notifyDays: number[] = []
      try { notifyDays = JSON.parse(settings.prayer_notify_days || "[]") } catch {}
      if (notifyDays.length === 0) continue

      // Check if today is a notify day
      if (!notifyDays.includes(todayDay)) continue

      // Check if already generated today (prevent duplicate generation from multiple cron runs)
      if (settings.prayer_last_generated_date === todayStr) {
        console.log("[prayer-cron] Skipping user", userId, "- already generated today")
        continue
      }

      console.log("[prayer-cron] Generating assignments for user", userId)

      // Load warriors
      const { data: warriors } = await supabase
        .from("prayer_warriors")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at")

      if (!warriors || warriors.length === 0) {
        console.log("[prayer-cron] No warriors for user", userId)
        continue
      }

      const assignmentsPerWarrior = parseInt(settings.prayer_assignments_per_warrior || "2") || 2
      let cycleNumber = parseInt(settings.prayer_cycle_number || "1") || 1
      const listId = settings.prayer_list_id || "__all__"

      // Load all recipients
      let q = supabase.from("birthdays").select("id, first_name, last_name").eq("user_id", userId)
      if (listId !== "__all__") q = q.eq("list_id", listId)
      const { data: allBirthdays } = await q

      const allRecipients = (allBirthdays || []).map((b: any) => ({
        id: b.id,
        name: `${b.first_name || ""} ${b.last_name || ""}`.trim(),
      }))

      if (allRecipients.length === 0) continue

      // Recipients already assigned in current cycle
      const { data: cycleAssignments } = await supabase
        .from("prayer_assignments")
        .select("recipient_id")
        .eq("user_id", userId)
        .eq("cycle_number", cycleNumber)

      const assignedIds = new Set(
        (cycleAssignments || []).map((a: any) => a.recipient_id).filter(Boolean)
      )

      let remaining = allRecipients.filter((r: any) => !assignedIds.has(r.id))
      const needed = warriors.length * assignmentsPerWarrior

      // Start new cycle if not enough remaining
      if (remaining.length < needed) {
        cycleNumber++
        remaining = allRecipients
        await supabase.from("settings").upsert(
          [{ user_id: userId, key: "prayer_cycle_number", value: String(cycleNumber) }],
          { onConflict: "user_id,key" }
        )
        console.log("[prayer-cron] New cycle", cycleNumber, "for user", userId)
      }

      // Delete existing assignments for current month
      await supabase
        .from("prayer_assignments")
        .delete()
        .eq("user_id", userId)
        .eq("assigned_month", currentMonth)

      // Create new assignments
      const shuffled = shuffle(remaining)
      const rows: any[] = []
      let idx = 0
      for (const warrior of warriors) {
        for (let i = 0; i < assignmentsPerWarrior; i++) {
          if (idx >= shuffled.length) break
          const recipient = shuffled[idx++]
          rows.push({
            user_id: userId,
            warrior_id: warrior.id,
            recipient_name: recipient.name,
            recipient_id: recipient.id,
            assigned_month: currentMonth,
            cycle_number: cycleNumber,
          })
        }
      }

      if (rows.length === 0) continue

      await supabase.from("prayer_assignments").insert(rows)

      // Save last generated date to prevent double generation
      await supabase.from("settings").upsert(
        [{ user_id: userId, key: "prayer_last_generated_date", value: todayStr }],
        { onConflict: "user_id,key" }
      )

      generated++
      results.push({ userId, rows: rows.length })
      console.log("[prayer-cron] Generated", rows.length, "assignments for user", userId)

      // Send to Telegram if enabled
      const telegramEnabled = settings.prayer_telegram_notify === "true"
      const chatId = userTelegramMap.get(userId)
      if (telegramEnabled && chatId) {
        // Group by warrior
        const warriorMap = new Map((warriors || []).map((w: any) => [w.id, w.name]))
        const grouped = new Map<string, string[]>()
        for (const r of rows) {
          const wname = warriorMap.get(r.warrior_id) as string || "—"
          if (!grouped.has(wname)) grouped.set(wname, [])
          grouped.get(wname)!.push(r.recipient_name)
        }

        let text = `🙏 <b>Молитвенные назначения — ${formatMonth(currentMonth)}</b>\n<i>${todayStr}</i>\n\n`
        for (const [warrior, recipients] of grouped.entries()) {
          text += `<b>${warrior}</b>\n`
          recipients.forEach((r, i) => { text += `  ${i + 1}. ${r}\n` })
          text += "\n"
        }

        await sendTelegramMessage({ chatId, text, parseMode: "HTML" })
        console.log("[prayer-cron] Sent Telegram notification for user", userId)
      }
    } catch (e) {
      console.error("[prayer-cron] Error for user", userId, e)
    }
  }

  return NextResponse.json({
    ok: true,
    generated,
    todayDay,
    todayStr,
    results,
  })
}
