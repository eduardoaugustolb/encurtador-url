# Skill: Authentication

## Scope

Admin login, session management, `proxy.ts` guard, logout.

---

## Session Helpers

```ts
// src/lib/auth/session.ts
import 'server-only'
import { jwtVerify, SignJWT } from 'jose'
import { env } from '@/env'

const secret = new TextEncoder().encode(env.ADMIN_SECRET)
const COOKIE_NAME = 'admin_session'
const EXPIRY = '7d'

export async function signSession(): Promise<string> {
  return new SignJWT({ sub: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret)
}

export async function verifySession(token: string): Promise<boolean> {
  try { await jwtVerify(token, secret); return true }
  catch { return false }
}

export function sessionCookieOptions() {
  return {
    name:     COOKIE_NAME,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     '/',
  }
}
```

---

## Login Route Handler

```ts
// src/app/api/auth/login/route.ts
// Rate-limited: 5 req/min per IP
// Uses timingSafeEqual for password comparison
// Sets HttpOnly cookie on success
```

The login rate limiter uses the same `checkRateLimit` Lua-script mechanism as other rate limiters, with prefix `ratelimit:login:{ip}`.

---

## proxy.ts Guard

```ts
// src/proxy.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/session'

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get('admin_session')?.value
  if (!token || !(await verifySession(token))) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

Uses `config.matcher` to scope to admin routes — no manual pathname check needed.

---

## Logout (Server Action, not API route)

```ts
// src/lib/auth/actions.ts
'use server'

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(getCookieName())
  redirect('/')
}
```

Called via `<form action={logoutAction}>` in the dashboard layout — no `/api/auth/logout` route exists.

---

## Login Page (Client Component with GSAP)

```tsx
// src/app/admin/login/page.tsx
"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"

export default function LoginPage() {
  // Staggered entrance animation: logo → title → subtitle → form
  // GSAP timeline with blur + translateY
  // Uses shadcn/ui components: Button, Input, Label
  // Fetches POST /api/auth/login, redirects to /admin/links on success
}
```
