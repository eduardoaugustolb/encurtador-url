# Skill: Redirect Engine

## Scope

This skill covers everything related to the slug resolution and redirect path:
- `src/middleware.ts` (Edge Runtime)
- `src/lib/redis/index.ts`
- `src/lib/analytics/track.ts`

## How the Redirect Works

```
Incoming request: GET /abc123
        │
        ▼
middleware.ts (Edge)
        │
        ├─ redis.get('slug:abc123')
        │         │
        │    hit ──┤──► Response.redirect(destinationUrl, 307)
        │          │    + waitUntil(trackClick(...))
        │          │
        │    miss ─┤──► db.query.links (Postgres)
        │               │
        │          not found ──► redirect /not-found
        │               │
        │          found ──► redis.setex('slug:abc123', ttl, json)
        │                    + Response.redirect(307)
        │                    + waitUntil(trackClick(...))
        ▼
     307 to destination
```

## Redis Helpers

```ts
// src/lib/redis/index.ts
import 'server-only'
import Redis from 'ioredis'
import { env } from '@/env'

export const redis = new Redis(env.REDIS_URL)

export type CachedLink = {
  id: string
  destinationUrl: string
  isActive: boolean
  expiresAt: string | null
}

export async function resolveSlug(slug: string): Promise<CachedLink | null> {
  const raw = await redis.get(`slug:${slug}`)
  if (raw) return JSON.parse(raw) as CachedLink

  const link = await db.query.links.findFirst({
    where: eq(links.slug, slug),
    columns: { id: true, destinationUrl: true, isActive: true, expiresAt: true },
  })

  if (!link) return null

  const ttl = link.expiresAt
    ? Math.floor((new Date(link.expiresAt).getTime() - Date.now()) / 1000)
    : 86400

  if (ttl > 0) {
    await redis.setex(`slug:${slug}`, ttl, JSON.stringify(link))
  }

  return link
}

export async function invalidateSlug(slug: string) {
  await redis.del(`slug:${slug}`)
}
```

## trackClick

```ts
// src/lib/analytics/track.ts
import 'server-only'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { clicks } from '@/lib/db/schema'

interface TrackClickInput {
  linkId: string
  referrer: string | null
  country: string | null
  userAgent: string | null
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function trackClick(input: TrackClickInput): Promise<void> {
  try {
    const uaHash = input.userAgent ? await sha256hex(input.userAgent) : null

    await db.insert(clicks).values({
      id:        nanoid(),
      linkId:    input.linkId,
      clickedAt: new Date(),
      referrer:  input.referrer,
      country:   input.country?.slice(0, 2) ?? null,
      uaHash,
    })
  } catch {
    // intentionally swallowed — tracking MUST NOT affect redirect
  }
}
```

## isExpired Helper

```ts
export function isExpired(link: CachedLink): boolean {
  if (!link.expiresAt) return false
  return new Date(link.expiresAt).getTime() < Date.now()
}
```

## Edge Constraints

`middleware.ts` runs on the Edge Runtime. This means:
- No `fs`, no `path`, no Node.js built-ins
- `ioredis` does NOT work on Edge — Redis must be accessed via HTTP (Upstash REST) or the middleware must call an internal API route
- **Square Cloud Redis:** use `ioredis` only in Node.js contexts (route handlers, server actions, server components). For the Edge middleware, use a thin HTTP wrapper or switch to Upstash REST API.

### Edge-compatible Redis option

If Redis is not accessible from Edge, move slug resolution to a Node.js route handler and have `middleware.ts` proxy to it. Alternatively, keep the full resolution in `proxy.ts` (Node.js) instead of `middleware.ts` — sacrificing ~1ms for simplicity.

Preferred for Square Cloud:

```ts
// src/middleware.ts — minimal Edge, delegates to proxy
export { default } from './proxy-redirect'

// src/proxy.ts — handles both auth AND redirect for non-admin routes
```

Document the decision in `docs/DECISIONS.md`.
