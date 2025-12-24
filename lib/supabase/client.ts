import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function createClient() {
  // Если клиент уже создан, возвращаем его
  if (client) {
    return client
  }

  // Создаем новый клиент только если его еще нет
  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  return client
}
