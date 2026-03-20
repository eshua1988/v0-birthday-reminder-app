import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MONTH_NAMES = [
  "январь","февраль","март","апрель","май","июнь",
  "июль","август","сентябрь","октябрь","ноябрь","декабрь",
]

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-")
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Load prayer sheets settings
    const { data: settingsRows } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .eq("user_id", user.id)
      .in("key", ["prayer_sheets_connection_id", "google_sheets_connections", "prayer_list_id"])

    const settingsMap: Record<string, string> = {}
    for (const s of settingsRows || []) settingsMap[s.key] = s.value

    const connectionId = settingsMap["prayer_sheets_connection_id"]
    const prayerListId = settingsMap["prayer_list_id"] || "__all__"
    let connections: any[] = []
    try { connections = JSON.parse(settingsMap["google_sheets_connections"] || "[]") } catch {}

    const conn = connections.find((c: any) => c.id === connectionId)
    if (!conn || !conn.spreadsheet_id) {
      return NextResponse.json({ error: "Google Sheets не настроены для молитвенных назначений" }, { status: 400 })
    }

    // Get current month assignments
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: assignments } = await supabaseAdmin
      .from("prayer_assignments")
      .select("warrior_id, recipient_name")
      .eq("user_id", user.id)
      .eq("assigned_month", currentMonth)

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: "Нет назначений на текущий месяц" }, { status: 400 })
    }

    const { data: warriors } = await supabaseAdmin
      .from("prayer_warriors")
      .select("id, name")
      .eq("user_id", user.id)

    const warriorMap = new Map((warriors || []).map((w: any) => [w.id, w.name]))

    // Build table data
    const warriorOrder: string[] = []
    const grouped = new Map<string, string[]>()
    for (const a of assignments) {
      const wname = warriorMap.get(a.warrior_id) || a.recipient_name
      if (!grouped.has(wname)) { grouped.set(wname, []); warriorOrder.push(wname) }
      grouped.get(wname)!.push(a.recipient_name)
    }

    // Fetch birthdays for current month to populate column C (Именинники)
    const birthMonthNum = new Date().getMonth() + 1
    let bdayQ = supabaseAdmin
      .from("birthdays")
      .select("first_name, last_name, birth_date")
      .eq("user_id", user.id)
    if (prayerListId !== "__all__") bdayQ = (bdayQ as any).eq("list_id", prayerListId)
    const { data: bdayData } = await bdayQ
    const birthdayNamesThisMonth = new Set<string>()
    for (const b of (bdayData || []) as any[]) {
      if (b.birth_date && new Date(b.birth_date).getMonth() + 1 === birthMonthNum) {
        birthdayNamesThisMonth.add(`${b.first_name || ""} ${b.last_name || ""}`.trim())
      }
    }

    const headers = ["Молящийся", "Участники", "Именинники"]
    const values: string[][] = [headers]
    for (const wname of warriorOrder) {
      const recs = grouped.get(wname) || []
      const bdays = recs.filter(r => birthdayNamesThisMonth.has(r))
      values.push([wname, recs.join(", "), bdays.join(", ")])
    }

    // If a specific participants list is selected for prayer — append participants below prayer assignments
    if (prayerListId !== "__all__") {
      const { data: birthdays } = await supabaseAdmin
        .from("birthdays")
        .select("id, first_name, last_name, birth_date, phone, email")
        .eq("user_id", user.id)
        .eq("list_id", prayerListId)
        .order("birth_date")
      if (birthdays && birthdays.length > 0) {
        values.push([""]) // separator row
        values.push(["ID", "ФИО", "Дата рождения", "Телефон", "Email"])
        for (const b of birthdays as any[]) {
          values.push([
            b.id || "",
            [b.last_name, b.first_name].filter(Boolean).join(" "),
            b.birth_date ? format(new Date(b.birth_date), "dd.MM.yyyy") : "",
            b.phone || "",
            b.email || "",
          ])
        }
      }
    }

    // Determine range
    const range = conn.sheet_range || `'${conn.sheet_name}'!A:Z`

    // Write to Google Sheets via existing /api/google-sheets route
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/google-sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "write", spreadsheetId: conn.spreadsheet_id, range, values }),
    })
    const resData = await res.json()
    if (!res.ok) throw new Error(resData.error || "Ошибка записи в таблицу")

    return NextResponse.json({ success: true, rows: values.length - 1 })
  } catch (e: any) {
    console.error("[prayer sync-sheets]", e)
    return NextResponse.json({ error: e.message || "Ошибка" }, { status: 500 })
  }
}
