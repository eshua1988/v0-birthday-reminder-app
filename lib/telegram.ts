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

// Функция для склонения возраста (1 год, 2 года, 5 лет)
function formatAge(age: number): string {
  const lastDigit = age % 10
  const lastTwoDigits = age % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${age} лет`
  }
  
  if (lastDigit === 1) {
    return `${age} год`
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${age} года`
  }
  
  return `${age} лет`
}

// Функция для склонения дней (1 день, 2 дня, 5 дней)
function formatDays(days: number): string {
  const lastDigit = days % 10
  const lastTwoDigits = days % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${days} дней`
  }
  
  if (lastDigit === 1) {
    return `${days} день`
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${days} дня`
  }
  
  return `${days} дней`
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
      (age ? ` — исполняется ${formatAge(age)}!` : "")
  } else if (daysUntil === 1) {
    text = `🔔 <b>Напоминание</b>\n\n` +
      `Завтра день рождения у ${birthdayPerson}` +
      (age ? ` (исполнится ${formatAge(age)})` : "")
  } else {
    text = `🔔 <b>Напоминание</b>\n\n` +
      `Через ${formatDays(daysUntil)} день рождения у ${birthdayPerson}` +
      (age ? ` (исполнится ${formatAge(age)})` : "")
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
