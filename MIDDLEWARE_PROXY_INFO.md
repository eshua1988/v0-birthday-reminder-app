# Middleware vs Proxy in Next.js 16

## Important Note About Authentication Middleware

This project uses **Next.js 16**, which has changed how middleware works for authentication and request handling.

### Next.js 16 Change: `middleware.ts` → `proxy.ts`

In Next.js 16, the authentication/session handling file has been renamed from `middleware.ts` to `proxy.ts`.

**Current Implementation:**
- ✅ File: `proxy.ts` (root directory)
- ✅ Imports: `updateSession` from `@/lib/supabase/proxy`
- ✅ Function: `proxy(request: NextRequest)`
- ✅ Configuration: Proper matcher to exclude static files

### What This Means

1. **No `middleware.ts` needed** - Next.js 16 uses `proxy.ts` instead
2. **Both files cannot coexist** - Next.js 16 will throw an error if both exist
3. **Authentication works** - The `proxy.ts` file handles all auth and session management

### Error if Both Files Exist

If you try to have both `middleware.ts` and `proxy.ts`, Next.js 16 will fail with:
```
Error: Both middleware file "./middleware.ts" and proxy file "./proxy.ts" are detected. 
Please use "./proxy.ts" only.
```

### Current Configuration

The existing `proxy.ts` file:
```typescript
import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

This configuration:
- ✅ Handles authentication for protected routes
- ✅ Redirects unauthenticated users to `/auth/login`
- ✅ Redirects authenticated users away from login pages
- ✅ Excludes static files and assets from processing

### References

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/messages/middleware-to-proxy)
- Project file: `/lib/supabase/proxy.ts` (contains the `updateSession` logic)
