import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, linkCode } = await request.json()

    if (!userId || !linkCode) {
      return NextResponse.json({ error: "Missing userId or linkCode" }, { status: 400 })
    }

    // Find pending link with this code
    const { data: pendingLink, error: findError } = await supabase
      .from("telegram_pending_links")
      .select("*")
      .eq("link_code", linkCode.toUpperCase())
      .single()

    if (findError || !pendingLink) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 })
    }

    // Check if code is not older than 10 minutes
    const codeAge = Date.now() - new Date(pendingLink.created_at).getTime()
    if (codeAge > 10 * 60 * 1000) {
      // Delete expired code
      await supabase
        .from("telegram_pending_links")
        .delete()
        .eq("id", pendingLink.id)
      
      return NextResponse.json({ error: "Code expired" }, { status: 410 })
    }

    // Update user settings with telegram_chat_id
    const { error: updateError } = await supabase
      .from("settings")
      .upsert({
        user_id: userId,
        telegram_chat_id: pendingLink.chat_id,
        telegram_username: pendingLink.username,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })

    if (updateError) {
      console.error("[Telegram Link] Update error:", updateError)
      return NextResponse.json({ error: "Failed to link account" }, { status: 500 })
    }

    // Delete the used pending link
    await supabase
      .from("telegram_pending_links")
      .delete()
      .eq("id", pendingLink.id)

    // Send confirmation message to Telegram
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    if (TELEGRAM_BOT_TOKEN) {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: pendingLink.chat_id,
            text: `✅ <b>Аккаунт успешно привязан!</b>\n\nТеперь вы будете получать поздравления в Telegram.`,
            parse_mode: "HTML",
          }),
        }
      )
    }

    return NextResponse.json({ 
      success: true, 
      username: pendingLink.username,
      firstName: pendingLink.first_name 
    })
  } catch (error) {
    console.error("[Telegram Link] Error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
