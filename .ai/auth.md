# Skill: Authentication

## Scope

Admin login, session management, `proxy.ts` guard.

---

## Session Helpers

```ts
// src/lib/auth/session.ts
import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
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
  try {
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export function sessionCookieOptions() {
  return {
    name:     COOKIE_NAME,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 7, // 7 days in seconds
    path:     '/',
  }
}
```

---

## Login Route Handler

```ts
// src/app/api/auth/login/route.ts
import { timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { signSession, sessionCookieOptions } from '@/lib/auth/session'
import { env } from '@/env'

const loginSchema = z.object({ password: z.string().min(1) })

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }

  const a = Buffer.from(parsed.data.password)
  const b = Buffer.from(env.ADMIN_PASSWORD)

  const match =
    a.length === b.length && timingSafeEqual(a, b)

  if (!match) {
    // Constant-time delay to prevent timing attacks
    await new Promise(r => setTimeout(r, 200))
    return Response.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signSession()
  const cookieStore = await cookies()
  cookieStore.set(sessionCookieOptions().name, token, sessionCookieOptions())

  return Response.json({ ok: true })
}
```

---

## Logout Route Handler

```ts
// src/app/api/auth/logout/route.ts
import { cookies } from 'next/headers'
import { sessionCookieOptions } from '@/lib/auth/session'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(sessionCookieOptions().name)
  return Response.json({ ok: true })
}
```

---

## proxy.ts Guard

```ts
// src/proxy.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/session'

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard admin routes
  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get('admin_session')?.value

  if (!token || !(await verifySession(token))) {
    const loginUrl = new URL('/admin/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
```

---

## Login Page (Client Component)

```tsx
// src/app/admin/login/page.tsx
"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const password = new FormData(e.currentTarget).get('password') as string

    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin/links')
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="password" type="password" required autoFocus />
      {error && <p>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

Note: no `<form action={serverAction}>` here — the password must go through the API route for the `timingSafeEqual` comparison and cookie setting.
