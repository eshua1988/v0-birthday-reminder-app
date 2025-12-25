import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase environment variables not found. Please add them in the Vars section.")
    // Возвращаем null для предотвращения ошибок
    return null as any
  }

  const cookieStore = await cookies()

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
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

    if (!supabase) {
      return null
    }

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
