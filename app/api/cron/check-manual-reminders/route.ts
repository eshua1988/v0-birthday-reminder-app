import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { sendTelegramMessage } from "@/lib/telegram"

type ManualReminder = {
  id: string
  date: string
  time: string
  fullName: string
  text: string
  telegramMessage?: string
  telegramPrivate?: string
  telegramGroup?: string
  sendPrivate?: boolean
  sendGroup?: boolean
  sentPrivateAt?: string
  sentGroupAt?: string
}

type ReminderSetting = {
  id?: string
  user_id: string
  key: string
  value: string | null
}

const SETTINGS_KEY = "manual_reminders"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function sanitizeTelegramHtml(value: string) {
  return escapeHtml(value).replace(
    /&lt;(\/?)(b|strong|i|em|u|ins|s|strike|del|code|pre)&gt;/gi,
    "<$1$2>",
  )
}

function normalizeTime(value: string) {
  if (!value) return "00:00"
  return value.slice(0, 5)
}

function getNowForTimezone(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find((part) => part.type === type)?.value || ""

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  }
}

function buildMessage(reminder: ManualReminder) {
  const customMessage = reminder.telegramMessage?.trim()

  if (customMessage) {
    return sanitizeTelegramHtml(customMessage)
      .replaceAll("{name}", escapeHtml(reminder.fullName))
      .replaceAll("{text}", escapeHtml(reminder.text))
      .replaceAll("{date}", escapeHtml(reminder.date))
      .replaceAll("{time}", escapeHtml(normalizeTime(reminder.time)))
  }

  return [
    "🔔 <b>Напоминание</b>",
    "",
    `<b>${escapeHtml(reminder.fullName)}</b>`,
    escapeHtml(reminder.text),
    "",
    `📅 ${escapeHtml(reminder.date)} ${escapeHtml(normalizeTime(reminder.time))}`,
  ].join("\n")
}

function isDue(reminder: ManualReminder, localNow: { date: string; time: string }) {
  const reminderDateTime = `${reminder.date} ${normalizeTime(reminder.time)}`
  const nowDateTime = `${localNow.date} ${localNow.time}`
  return reminderDateTime <= nowDateTime
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const now = new Date()

    const { data: reminderSettings, error: reminderError } = await supabase
      .from("settings")
      .select("*")
      .eq("key", SETTINGS_KEY)

    if (reminderError) {
      console.error("[manual-reminders] Failed to load reminders:", reminderError)
      return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 })
    }

    const { data: timezoneSettings } = await supabase
      .from("settings")
      .select("user_id,value")
      .eq("key", "timezone")

    const timezones = new Map<string, string>()
    for (const setting of timezoneSettings || []) {
      timezones.set(setting.user_id, setting.value || "UTC")
    }

    let checked = 0
    let due = 0
    let sent = 0
    const results: any[] = []

    for (const setting of (reminderSettings || []) as ReminderSetting[]) {
      let reminders: ManualReminder[] = []
      try {
        const parsed = JSON.parse(setting.value || "[]")
        reminders = Array.isArray(parsed) ? parsed : []
      } catch {
        reminders = []
      }

      if (reminders.length === 0) continue

      const timezone = timezones.get(setting.user_id) || "UTC"
      const localNow = getNowForTimezone(now, timezone)
      let changed = false

      for (const reminder of reminders) {
        checked++

        if (!isDue(reminder, localNow)) continue
        due++

        const message = buildMessage(reminder)

        if (reminder.sendPrivate && reminder.telegramPrivate && !reminder.sentPrivateAt) {
          const response = await sendTelegramMessage({ chatId: reminder.telegramPrivate, text: message })
          results.push({
            reminderId: reminder.id,
            userId: setting.user_id,
            target: "private",
            chatId: reminder.telegramPrivate,
            ok: Boolean(response?.ok),
          })

          if (response?.ok) {
            reminder.sentPrivateAt = now.toISOString()
            sent++
            changed = true
          }
        }

        if (reminder.sendGroup && reminder.telegramGroup && !reminder.sentGroupAt) {
          const response = await sendTelegramMessage({ chatId: reminder.telegramGroup, text: message })
          results.push({
            reminderId: reminder.id,
            userId: setting.user_id,
            target: "group",
            chatId: reminder.telegramGroup,
            ok: Boolean(response?.ok),
          })

          if (response?.ok) {
            reminder.sentGroupAt = now.toISOString()
            sent++
            changed = true
          }
        }
      }

      if (changed) {
        const { error } = await supabase
          .from("settings")
          .update({ value: JSON.stringify(reminders) })
          .eq("user_id", setting.user_id)
          .eq("key", SETTINGS_KEY)

        if (error) {
          console.error("[manual-reminders] Failed to mark reminders sent:", error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      due,
      sent,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error("[manual-reminders] Cron error:", error)
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
}
