import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      type: string
    }
    date: number
    text?: string
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    }
  )
  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json()
    
    console.log("[Telegram Webhook] Received update:", JSON.stringify(update, null, 2))

    if (update.message?.text) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const username = update.message.from.username
      const firstName = update.message.from.first_name

      if (text === "/start") {
        // Generate a unique link code
        const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase()
        
        // Store the pending link in database
        await supabase
          .from("telegram_pending_links")
          .upsert({
            chat_id: chatId.toString(),
            link_code: linkCode,
            username: username || null,
            first_name: firstName,
            created_at: new Date().toISOString(),
          }, { onConflict: "chat_id" })

        await sendTelegramMessage(
          chatId,
          `🎂 <b>Добро пожаловать в Birthday Reminder Bot!</b>\n\n` +
          `Для привязки вашего аккаунта введите этот код в приложении:\n\n` +
          `<code>${linkCode}</code>\n\n` +
          `Код действителен 10 минут.`
        )
      } else if (text === "/status") {
        // Check if user is linked
        const { data: settings } = await supabase
          .from("settings")
          .select("*")
          .eq("telegram_chat_id", chatId.toString())
          .single()

        if (settings) {
          await sendTelegramMessage(
            chatId,
            `✅ <b>Ваш аккаунт привязан!</b>\n\n` +
            `Вы будете получать поздравления в Telegram.`
          )
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ <b>Аккаунт не привязан</b>\n\n` +
            `Отправьте /start для получения кода привязки.`
          )
        }
      } else if (text === "/help") {
        await sendTelegramMessage(
          chatId,
          `🎂 <b>Birthday Reminder Bot</b>\n\n` +
          `Команды:\n` +
          `/start - Получить код для привязки аккаунта\n` +
          `/status - Проверить статус привязки\n` +
          `/help - Показать эту справку`
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error)
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}

// GET method for webhook verification
export async function GET() {
  return NextResponse.json({ status: "Telegram webhook is active" })
}
