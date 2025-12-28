import { type NextRequest, NextResponse } from "next/server"

/**
 * Test endpoint to manually trigger cron job for testing
 * Usage: GET /api/test-cron
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({
        error: "CRON_SECRET not configured",
        message: "Add CRON_SECRET environment variable to Vercel"
      }, { status: 500 })
    }

    // Get the base URL
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const host = request.headers.get('host') || 'localhost:3000'
    const cronUrl = `${protocol}://${host}/api/cron/check-birthdays`

    console.log("[Test Cron] Calling cron endpoint:", cronUrl)

    // Call the cron endpoint
    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    })

    const data = await response.json()

    console.log("[Test Cron] Response:", {
      status: response.status,
      data
    })

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      cronResponse: data,
      message: response.ok 
        ? "✅ Cron job executed successfully" 
        : "❌ Cron job failed"
    })

  } catch (error: any) {
    console.error("[Test Cron] Error:", error)
    return NextResponse.json({
      error: "Failed to test cron",
      message: error.message
    }, { status: 500 })
  }
}
