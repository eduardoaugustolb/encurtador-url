# Skill: Redirect Engine

## Scope

This skill covers everything related to the slug resolution and redirect path:
- `src/app/[slug]/route.ts` (Node.js Route Handler)
- `src/lib/redis/index.ts`
- `src/lib/analytics/track.ts`
- `src/lib/analytics/flush-clicks.ts`

## How the Redirect Works

Redirect runs in `[slug]/route.ts` (Node.js), **not** in `middleware.ts`. There is no Edge middleware in this project.

```
Incoming request: GET /abc123
        │
        ▼
[slug]/route.ts (Node.js Route Handler)
        │
        ├─ checkRateLimit (Lua sorted-set, 100 req/min)
        ├─ resolveSlug (Redis → Postgres fallback)
        │
        ├─ rate limited or not found → notFound()
        │
        ├─ after() → trackClick() [fire-and-forget, Redis pipeline]
        │
        ▼
     307 redirect to destinationUrl
```

## Redis Helpers

```ts
// src/lib/redis/index.ts
import 'server-only'
import Redis from 'ioredis'
import { env } from '@/env'

export const redis = new Redis(env.REDIS_URL, {
  keepAlive: 30_000,
  retryStrategy: (times) => Math.min(times * 100, 3_000),
})

export type CachedLink = {
  id: string
  destinationUrl: string
  isActive: boolean
}

export async function resolveSlug(slug: string): Promise<CachedLink | null> {
  const raw = await redis.get(`slug:${slug}`)
  if (raw) return JSON.parse(raw) as CachedLink

  const link = await db.query.links.findFirst({
    where: eq(links.slug, slug),
    columns: { id: true, destinationUrl: true, isActive: true },
  })

  if (!link) return null
  await redis.setex(`slug:${slug}`, 86400, JSON.stringify(link))
  return link
}

export async function invalidateSlug(slug: string) {
  await redis.del(`slug:${slug}`)
}
```

## trackClick — Redis Pipeline (not direct DB insert)

```ts
// src/lib/analytics/track.ts
import 'server-only'
import { createHash } from 'node:crypto'
import { redis } from '@/lib/redis'

const BUFFER_KEY = 'clicks:buffer'
const MAX_BUFFER = 5_000

export async function trackClick(input: TrackClickInput): Promise<void> {
  try {
    const uaHash = input.userAgent
      ? createHash('sha256').update(input.userAgent).digest('hex')
      : null

    const entry = JSON.stringify({
      linkId: input.linkId,
      clickedAt: new Date().toISOString(),
      referrer: input.referrer,
      country: input.country?.slice(0, 2) ?? null,
      uaHash,
    })

    await redis.pipeline()
      .lpush(BUFFER_KEY, entry)
      .ltrim(BUFFER_KEY, 0, MAX_BUFFER - 1)
      .exec()
  } catch {
    // intentionally swallowed — tracking MUST NOT affect redirect
  }
}
```

## flushClickBuffer — Distributed Lock

```ts
// src/lib/analytics/flush-clicks.ts
import { nanoid } from 'nanoid'

const LOCK_KEY = 'clicks:flush:lock'
const LOCK_TTL_MS = 30_000

export async function flushClickBuffer(): Promise<void> {
  if (!await acquireLock()) return

  try {
    const raw = await redis.lrange(BUFFER_KEY, 0, -1)
    if (raw.length === 0) return

    const records = raw.map(entry => {
      const data = JSON.parse(entry) as BufferedClick
      return { id: nanoid(), linkId: data.linkId, clickedAt: new Date(data.clickedAt), referrer: data.referrer, country: data.country, uaHash: data.uaHash }
    })

    await db.insert(clicks).values(records)
    await redis.ltrim(BUFFER_KEY, raw.length, -1)  // remove only processed items
  } catch {
    // flush errors must never break analytics queries
  } finally {
    await releaseLock()
  }
}
```

## Key Differences From Common Patterns

| Aspect | This project |
|---|---|
| Runtime | Node.js via `[slug]/route.ts` (not Edge middleware) |
| Background task | `after()` from `next/server` (not `waitUntil`) |
| Click storage | Redis pipeline (LPUSH + LTRIM), batch-flushed to PG |
| Rate limiting | Yes — sorted-set Lua script, 100 req/min per IP |
| `CachedLink.expiresAt` | Not stored — uses fixed 24h TTL |
| Slug cache invalidation | `invalidateSlug()` on create/update/delete |
| Full cache wipe | `POST /api/cache/wipe` — SCAN + DEL on `slug:*` |

## Rate Limiting on Redirect

Rate limiting runs **before** slug resolution (parallel Promise.all):

```ts
const [rl, link] = await Promise.all([
  checkRateLimit({ windowMs: 60_000, max: 100, key: rateLimitKey("slug-resolve", ip) }),
  resolveSlug(slug),
]);
```

On rate limit exceed → `notFound()` (no hint to caller).
