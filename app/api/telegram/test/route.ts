import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendTelegramMessage, sendBirthdayReminder } from "@/lib/telegram"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, message, testBirthday } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Get user's telegram_chat_id from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("telegram_chat_id")
      .eq("user_id", userId)
      .single()

    if (!settings?.telegram_chat_id) {
      return NextResponse.json({ error: "Telegram not linked for this user" }, { status: 404 })
    }

    let result

    if (testBirthday) {
      // Send test birthday reminder with a sample birth date
      const sampleBirthDate = new Date(1995, 4, 15) // May 15, 1995
      result = await sendBirthdayReminder(
        settings.telegram_chat_id,
        "Тест Тестович",
        0,
        30,
        sampleBirthDate
      )
    } else {
      // Send custom message
      result = await sendTelegramMessage({
        chatId: settings.telegram_chat_id,
        text: message || "🔔 Тестовое сообщение из Birthday Reminder!",
      })
    }

    if (result.ok) {
      return NextResponse.json({ success: true, result })
    } else {
      return NextResponse.json({ error: result.description || "Failed to send" }, { status: 500 })
    }
  } catch (error) {
    console.error("[Telegram Test] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
