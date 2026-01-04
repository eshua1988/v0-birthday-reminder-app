const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export interface TelegramMessage {
  chatId: string
  text: string
  parseMode?: "HTML" | "Markdown"
}

export async function sendTelegramMessage({ chatId, text, parseMode = "HTML" }: TelegramMessage) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("[Telegram] Bot token not configured")
    return { ok: false, error: "Bot token not configured" }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      }
    )

    const result = await response.json()
    
    if (!result.ok) {
      console.error("[Telegram] Send error:", result.description)
    }
    
    return result
  } catch (error) {
    console.error("[Telegram] Request error:", error)
    return { ok: false, error: String(error) }
  }
}

export async function sendBirthdayReminder(
  chatId: string,
  birthdayPerson: string,
  daysUntil: number,
  age?: number
) {
  let text: string

  if (daysUntil === 0) {
    text = `🎂 <b>Сегодня день рождения!</b>\n\n` +
      `🎉 ${birthdayPerson}` +
      (age ? ` исполняется ${age} лет!` : "")
  } else if (daysUntil === 1) {
    text = `🔔 <b>Напоминание</b>\n\n` +
      `Завтра день рождения у ${birthdayPerson}` +
      (age ? ` (исполнится ${age} лет)` : "")
  } else {
    text = `🔔 <b>Напоминание</b>\n\n` +
      `Через ${daysUntil} дней день рождения у ${birthdayPerson}` +
      (age ? ` (исполнится ${age} лет)` : "")
  }

  return sendTelegramMessage({ chatId, text })
}

export async function sendGreeting(
  chatId: string,
  birthdayPerson: string,
  greetingText: string
) {
  const text = `🎂 <b>Поздравление для ${birthdayPerson}</b>\n\n` +
    `${greetingText}`

  return sendTelegramMessage({ chatId, text })
}
