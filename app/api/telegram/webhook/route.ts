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
  // Add structured error handling and more verbose logs to aid debugging in production
  try {
    const update: TelegramUpdate = await request.json()

    console.log("[Telegram Webhook] Received update (truncated):", JSON.stringify(update, (k, v) => {
      // avoid logging huge buffers
      if (typeof v === 'string' && v.length > 1000) return v.slice(0, 1000) + '...'
      return v
    }, 2))

    if (!update) {
      console.error("[Telegram Webhook] Empty update payload")
      return NextResponse.json({ ok: false, error: "Empty payload" }, { status: 400 })
    }

    if (update.message?.text) {
      const chatId = update.message.chat.id
      const text = update.message.text
      const username = update.message.from.username
      const firstName = update.message.from.first_name

      try {
        if (text === "/start") {
          const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase()

          try {
            await supabase
              .from("telegram_pending_links")
              .upsert({
                chat_id: chatId.toString(),
                link_code: linkCode,
                username: username || null,
                first_name: firstName,
                created_at: new Date().toISOString(),
              }, { onConflict: "chat_id" })
          } catch (dbErr) {
            console.error("[Telegram Webhook] DB upsert failed:", dbErr)
            // continue - we still want to notify the user even if DB write failed
          }

          try {
            await sendTelegramMessage(
              chatId,
              `🎂 <b>Добро пожаловать в Birthday Reminder Bot!</b>\n\n` +
              `Для привязки вашего аккаунта введите этот код в приложении:\n\n` +
              `<code>${linkCode}</code>\n\n` +
              `Код действителен 10 минут.`
            )
          } catch (sendErr) {
            console.error("[Telegram Webhook] SendMessage failed:", sendErr)
            return NextResponse.json({ ok: false, error: String(sendErr) }, { status: 502 })
          }

        } else if (text === "/status") {
          try {
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
          } catch (statusErr) {
            console.error("[Telegram Webhook] Status handling failed:", statusErr)
            return NextResponse.json({ ok: false, error: String(statusErr) }, { status: 502 })
          }

        } else if (text === "/help") {
          try {
            await sendTelegramMessage(
              chatId,
              `🎂 <b>Birthday Reminder Bot</b>\n\n` +
              `Команды:\n` +
              `/start - Получить код для привязки аккаунта\n` +
              `/status - Проверить статус привязки\n` +
              `/help - Показать эту справку`
            )
          } catch (helpErr) {
            console.error("[Telegram Webhook] Help message failed:", helpErr)
            return NextResponse.json({ ok: false, error: String(helpErr) }, { status: 502 })
          }
        }
      } catch (handlerErr) {
        console.error("[Telegram Webhook] Handler error:", handlerErr)
        return NextResponse.json({ ok: false, error: String(handlerErr) }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[Telegram Webhook] Unexpected error:", error?.stack || error?.message || error)
    const message = (error && (error.message || String(error))) || "Internal error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET method for webhook verification
export async function GET() {
  return NextResponse.json({ status: "Telegram webhook is active" })
}
