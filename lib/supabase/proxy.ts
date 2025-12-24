import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("[v0] Supabase not configured - auth middleware disabled")
    console.log("[v0] Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vars to enable authentication")
    // Пропускаем все запросы без проверки авторизации
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Защищенные маршруты - требуют авторизации
  const protectedPaths = ["/", "/calendar", "/settings", "/profile"]
  const isProtectedPath = protectedPaths.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Если пользователь авторизован и пытается зайти на страницы auth, перенаправляем на главную
  if (request.nextUrl.pathname.startsWith("/auth/") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
