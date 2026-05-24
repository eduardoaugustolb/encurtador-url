# Technical Specification — Bit Link

## Runtime Boundary (Next.js 16)

Next.js 16 has two separate network interceptors with different runtimes:

| File | Runtime | Purpose |
|---|---|---|
| `middleware.ts` | **Edge** | Slug redirect — runs before any route, lowest latency |
| `proxy.ts` | **Node.js** | Auth guard — reads cookies, protects `/admin/**` |

`middleware.ts` is deprecated for general use but remains the correct choice for Edge-only logic. `proxy.ts` is the new default for request interception on Node.js. Both coexist in the same project.

---

## Caching Strategy (Next.js 16 `use cache`)

Next.js 16 replaces implicit caching with the explicit `"use cache"` directive. Nothing is cached by default.

```ts
// Cache a Server Component
"use cache"
export default async function TopLinksChart({ from, to }: Props) { ... }

// Cache a data-fetching function with a custom lifetime
import { cacheLife } from 'next/cache'
"use cache"
export async function getAnalyticsSummary(from: Date, to: Date) {
  cacheLife('minutes')   // built-in profile: seconds | minutes | hours | days | max
  // ...
}

// Cache a specific function result, tagged for invalidation
import { cacheTag } from 'next/cache'
"use cache"
export async function getLinkById(id: string) {
  cacheTag(`link-${id}`)
  cacheLife('hours')
  // ...
}
```

Invalidation:

```ts
import { revalidateTag } from 'next/cache'

// Requires cacheLife profile as second arg in Next.js 16
revalidateTag(`link-${id}`, 'max')

// updateTag() for read-your-writes in Server Actions
import { updateTag } from 'next/cache'
updateTag(`link-${id}`)   // expires immediately, next request gets fresh data
```

**Rule:** every cached function must declare both `cacheLife` and `cacheTag` so invalidation is always possible.

---

## Directory Structure

```
src/
├── app/
│   ├── [slug]/
│   │   └── route.ts              # Edge redirect (NOT middleware — route handler)
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── links/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   └── page.tsx              # → redirect to /admin/links
│   ├── api/
│   │   ├── links/
│   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts      # PATCH, DELETE
│   │   ├── analytics/
│   │   │   ├── summary/route.ts
│   │   │   ├── clicks-over-time/route.ts
│   │   │   ├── top-links/route.ts
│   │   │   ├── top-referrers/route.ts
│   │   │   └── export/route.ts
│   │   └── auth/
│   │       ├── login/route.ts
│   │       └── logout/route.ts
│   └── not-found.tsx
├── components/
│   ├── ui/                       # shadcn primitives — never edit directly
│   ├── charts/
│   │   ├── clicks-over-time.tsx
│   │   ├── top-links.tsx
│   │   └── top-referrers.tsx
│   ├── links/
│   │   ├── link-list.tsx
│   │   ├── link-card.tsx
│   │   ├── create-link-form.tsx
│   │   └── edit-link-dialog.tsx
│   └── analytics/
│       ├── date-range-filter.tsx
│       └── stats-card.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts              # Drizzle client
│   │   ├── schema.ts
│   │   └── queries/
│   │       ├── links.ts
│   │       └── analytics.ts
│   ├── redis/
│   │   └── index.ts              # ioredis client + slug helpers
│   ├── analytics/
│   │   └── track.ts              # trackClick() — called via waitUntil
│   ├── auth/
│   │   └── session.ts            # JWT sign/verify + cookie helpers
│   └── validators/
│       ├── link.ts
│       └── analytics.ts
├── middleware.ts                  # Edge — slug resolution + redirect
├── proxy.ts                       # Node.js — admin auth guard
└── env.ts                         # @t3-oss/env-nextjs
```

---

## Database Schema (Drizzle)

```ts
// src/lib/db/schema.ts

export const links = pgTable('links', {
  id:             text('id').primaryKey(),
  slug:           text('slug').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  title:          text('title'),
  isActive:       boolean('is_active').notNull().default(true),
  expiresAt:      timestamp('expires_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const clicks = pgTable('clicks', {
  id:        text('id').primaryKey(),
  linkId:    text('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull(),
  referrer:  text('referrer'),
  country:   char('country', { length: 2 }),
  uaHash:    text('ua_hash'),
}, (t) => [
  index('clicks_link_id_idx').on(t.linkId),
  index('clicks_clicked_at_idx').on(t.clickedAt),
  index('clicks_link_id_clicked_at_idx').on(t.linkId, t.clickedAt),
])
```

Migrations in `drizzle/` at project root. Run via `drizzle-kit migrate`.

---

## Redis Key Schema

| Key | Type | TTL |
|---|---|---|
| `slug:{slug}` | String (JSON) | Until `expiresAt` or 24h |

On link update or delete: `redis.del(`slug:${slug}`)`.

---

## Redirect Flow (middleware.ts — Edge)

`middleware.ts` resolves slugs at the Edge and redirects immediately. It does **not** guard admin routes — that is `proxy.ts`'s job.

```ts
// src/middleware.ts
import type { NextRequest } from 'next/server'
import { resolveSlug } from '@/lib/redis'

export const config = {
  matcher: ['/((?!admin|api|_next|favicon.ico).*)'],
}

export default async function middleware(req: NextRequest) {
  const slug = req.nextUrl.pathname.slice(1)
  if (!slug) return // let Next.js handle root

  const link = await resolveSlug(slug)

  if (!link || !link.isActive || isExpired(link)) {
    return Response.redirect(new URL('/not-found', req.url))
  }

  req.waitUntil(
    trackClick({
      linkId:    link.id,
      referrer:  req.headers.get('referer'),
      country:   req.headers.get('x-vercel-ip-country'),
      userAgent: req.headers.get('user-agent'),
    })
  )

  return Response.redirect(link.destinationUrl, 307)
}
```

---

## Auth Guard (proxy.ts — Node.js)

```ts
// src/proxy.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth/session'

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()
  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get('admin_session')?.value
  const valid = token ? await verifySession(token) : false

  if (!valid) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}
```

---

## API Routes

All inputs validated with Zod. All routes return `application/json` unless noted.

### Links

```
GET    /api/links?cursor=<cursor>&limit=20
POST   /api/links
PATCH  /api/links/:id
DELETE /api/links/:id   → 204
```

### Analytics

```
GET /api/analytics/summary?from=&to=&linkId=
GET /api/analytics/clicks-over-time?from=&to=&linkId=
GET /api/analytics/top-links?from=&to=&limit=10
GET /api/analytics/top-referrers?from=&to=&linkId=
GET /api/analytics/export?from=&to=&linkId=    → text/csv
```

---

## Pagination Contract

Every paginated endpoint follows this contract exactly — no exceptions.

**Cursor encoding:** `btoa(JSON.stringify({ createdAt: string, id: string }))`

**Response shape:**
```ts
{ data: T[], nextCursor: string | null }
```

**TanStack Query pattern:**
```ts
useInfiniteQuery({
  queryKey: ['links', filters],
  queryFn:  ({ pageParam }) => fetchLinks({ cursor: pageParam, ...filters }),
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  initialPageParam: undefined,
})
```

Both `useInfiniteLinks` and `useInfiniteClicks` must follow this pattern identically.

---

## `use cache` Application Map

| What | Directive location | cacheLife | cacheTag | Invalidated by |
|---|---|---|---|---|
| `getLinkById` | function | `'hours'` | `link-{id}` | `updateTag` on PATCH/DELETE |
| `getAnalyticsSummary` | function | `'minutes'` | `analytics-summary` | `revalidateTag` on new click batch |
| `TopLinksChart` | component | `'minutes'` | `analytics-top-links` | `revalidateTag` |
| `ClicksOverTimeChart` | component | `'minutes'` | `analytics-clicks` | `revalidateTag` |

The redirect path **never** uses `use cache` — Redis handles that layer.

---

## Environment Validation

```ts
// src/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL:   z.string().url(),
    REDIS_URL:      z.string().url(),
    ADMIN_PASSWORD: z.string().min(8),
    ADMIN_SECRET:   z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL:        process.env.DATABASE_URL,
    REDIS_URL:           process.env.REDIS_URL,
    ADMIN_PASSWORD:      process.env.ADMIN_PASSWORD,
    ADMIN_SECRET:        process.env.ADMIN_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
})
```

---

## Branch Strategy

```
main      → production (Vercel auto-deploy)
dev       → integration branch
feature/* → human-authored features  (PR → dev)
agent/*   → AI agent features        (PR → dev, never main directly)
```
