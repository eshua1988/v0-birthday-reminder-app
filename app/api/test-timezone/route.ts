import { type NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Test endpoint to manually set user timezone
 * URL: /api/test-timezone?userId=xxx&timezone=Europe/Warsaw
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const timezone = searchParams.get('timezone') || 'Europe/Warsaw'

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Upsert timezone setting
    const { data, error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: userId,
          key: "timezone",
          value: timezone,
        },
        {
          onConflict: "user_id,key",
        }
      )
      .select()

    if (error) {
      console.error("[Test Timezone] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[Test Timezone] Set timezone:", timezone, "for user:", userId)

    return NextResponse.json({
      success: true,
      message: `Timezone ${timezone} set for user ${userId}`,
      data,
    })
  } catch (error: any) {
    console.error("[Test Timezone] Exception:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
