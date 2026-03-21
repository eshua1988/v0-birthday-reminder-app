import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Remove any existing deep link tokens for this user
    await supabase
      .from("telegram_pending_links")
      .delete()
      .eq("user_id", userId)

    // Generate a random token (URL-safe, uppercase)
    const token =
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      Math.random().toString(36).substring(2, 10).toUpperCase()

    const { error } = await supabase
      .from("telegram_pending_links")
      .insert({
        link_code: token,
        user_id: userId,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error("[Generate DeepLink] DB error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const botName = process.env.TELEGRAM_BOT_NAME || "ChurchBirthdayReminderBot"
    const url = `https://t.me/${botName}?start=${token}`

    return NextResponse.json({ url, token })
  } catch (error: any) {
    console.error("[Generate DeepLink] Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 })
  }
}
