import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Метод setAll был вызван из Server Component
          // Можно игнорировать если используется proxy для обновления сессий
        }
      },
    },
  })
}

export const createServerClient = createClient

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("[v0] Error getting current user:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("[v0] Exception getting current user:", error)
    return null
  }
}
