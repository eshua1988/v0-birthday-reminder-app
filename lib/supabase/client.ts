import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function createClient() {
  // Если клиент уже создан, возвращаем его
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase environment variables not found. Please add them in the Vars section.")
    // Возвращаем mock клиент для предотвращения ошибок
    return null as any
  }

  // Создаем новый клиент только если его еще нет
  client = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return client
}
