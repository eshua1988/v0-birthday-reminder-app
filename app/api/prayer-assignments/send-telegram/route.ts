import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendTelegramMessage } from "@/lib/telegram"

const MONTH_NAMES_GEN = [
  "января","февраля","марта","апреля","мая","июня",
  "июля","августа","сентября","октября","ноября","декабря",
]

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-")
  const m = parseInt(month) - 1
  return `${MONTH_NAMES_GEN[m]} ${year}`
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get Telegram chat ID
    const { data: settingsRow } = await supabase
      .from("settings")
      .select("telegram_chat_id")
      .eq("user_id", user.id)
      .maybeSingle()

    const chatId = settingsRow?.telegram_chat_id
    if (!chatId) {
      return NextResponse.json({ error: "Telegram не подключён. Подключите бота в настройках." }, { status: 400 })
    }

    // Get current month assignments
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: assignments } = await supabase
      .from("prayer_assignments")
      .select("warrior_id, recipient_name")
      .eq("user_id", user.id)
      .eq("assigned_month", currentMonth)

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: "Нет назначений на текущий месяц" }, { status: 400 })
    }

    // Get warrior names
    const { data: warriors } = await supabase
      .from("prayer_warriors")
      .select("id, name")
      .eq("user_id", user.id)

    const warriorMap = new Map((warriors || []).map((w: any) => [w.id, w.name]))

    // Group by warrior
    const grouped = new Map<string, string[]>()
    for (const a of assignments) {
      const name = warriorMap.get(a.warrior_id) as string || "—"
      if (!grouped.has(name)) grouped.set(name, [])
      grouped.get(name)!.push(a.recipient_name)
    }

    // Build message
    let text = `🙏 <b>Молитвенные назначения — ${formatMonth(currentMonth)}</b>\n\n`
    for (const [warrior, recipients] of grouped.entries()) {
      text += `<b>${warrior}</b>\n`
      recipients.forEach((r, i) => {
        text += `  ${i + 1}. ${r}\n`
      })
      text += "\n"
    }

    const result = await sendTelegramMessage({ chatId, text, parseMode: "HTML" })
    if (!result.ok) {
      return NextResponse.json({ error: result.description || "Ошибка отправки" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
