import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import crypto from "crypto"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function base64url(input: Buffer | string) {
  const base64 = (typeof input === "string" ? Buffer.from(input) : input).toString("base64")
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function buildRange(sheetName: string, rangeInput: string): string {
  const range = (rangeInput || "A:Z").trim()
  const name = (sheetName || "").trim()
  if (range.includes("!")) return range
  if (!name) return range
  const quotedName = name.startsWith("'") ? name : `'${name.replace(/'/g, "\\'")}'`
  return `${quotedName}!${range}`
}

async function getGoogleToken(raw: string): Promise<string> {
  let sa: any
  try { sa = JSON.parse(raw) } catch {
    try { sa = JSON.parse(raw.replace(/\\n/g, "\n")) } catch { sa = null }
  }
  if (!sa) throw new Error("Invalid service account JSON")
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n").replace(/\r/g, "").trim()

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now - 30,
  }
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(unsigned, "utf8")
  sign.end()
  const jwt = `${unsigned}.${base64url(sign.sign(sa.private_key))}`

  const tokenRes = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  })
  if (!tokenRes.ok) throw new Error(`Token error: ${await tokenRes.text()}`)
  return (await tokenRes.json()).access_token
}

async function writeToSheets(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT || ""
  if (!raw) throw new Error("No service account configured")
  const token = await getGoogleToken(raw)

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) throw new Error(`Sheets write error: ${await res.text()}`)
}

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
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("prayer_assignments")
      .select("warrior_id, recipient_name")
      .eq("user_id", user.id)
      .eq("assigned_month", currentMonth)

    if (assignError) {
      console.error("[prayer sync-sheets] assignments error:", assignError)
      // Table doesn't exist or other DB error — skip gracefully
      return NextResponse.json({ error: assignError.message }, { status: 400 })
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: "Нет назначений на текущий месяц" }, { status: 400 })
    }

    const { data: warriors, error: warriorError } = await supabaseAdmin
      .from("prayer_warriors")
      .select("id, name")
      .eq("user_id", user.id)

    if (warriorError) {
      console.error("[prayer sync-sheets] warriors error:", warriorError)
      return NextResponse.json({ error: warriorError.message }, { status: 400 })
    }

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

    // Append participants below prayer assignments (same as manual Export button in settings)
    {
      let bdayQuery = supabaseAdmin
        .from("birthdays")
        .select("id, first_name, last_name, birth_date, phone, email")
        .eq("user_id", user.id)
        .order("birth_date")
      const listFilter = prayerListId !== "__all__" ? prayerListId : (conn.list_id || null)
      if (listFilter) bdayQuery = (bdayQuery as any).eq("list_id", listFilter)
      const { data: birthdays } = await bdayQuery
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
    const range = buildRange(conn.sheet_name, conn.sheet_range || "A:Z")

    // Write directly to Google Sheets API (avoid internal fetch which fails server-side)
    await writeToSheets(conn.spreadsheet_id, range, values)

    return NextResponse.json({ success: true, rows: values.length - 1 })
  } catch (e: any) {
    console.error("[prayer sync-sheets]", e)
    return NextResponse.json({ error: e.message || "Ошибка" }, { status: 500 })
  }
}
