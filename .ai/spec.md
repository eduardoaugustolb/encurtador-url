# Technical Specification — Bit Link

## Runtime Boundary (Next.js 16)

Next.js 16 has two separate network interceptors with different runtimes:

| File | Runtime | Purpose |
|---|---|---|
| `proxy.ts` | **Node.js** | Auth guard — protects `/admin/**` routes |
| `src/app/[slug]/route.ts` | **Node.js** | Slug resolution + redirect (route handler, not middleware) |

`middleware.ts` (Edge) is **not used** in this project. Slug resolution runs in a Node.js route handler for full DB/Redis access.

---

## Caching Strategy

Analytics queries use **no `use cache`**. Instead, they call `flushClickBuffer()` before each query to persist Redis-buffered clicks to Postgres, then query directly. This ensures read-your-writes consistency without cache staleness.

Redis is used for:
- Slug cache (`slug:{slug}`) — cache-aside pattern, 24h TTL
- Rate limiting — sorted sets with Lua script
- Click buffer — `clicks:buffer` list (LPUSH + LTRIM, capped at 5,000)

The redirect path never uses `use cache`.

---

## Directory Structure

```
src/
├── app/
│   ├── [slug]/
│   │   └── route.ts              # Slug resolve + redirect (Node.js)
│   ├── admin/
│   │   ├── layout.tsx             # QueryProvider wrapper
│   │   ├── login/
│   │   │   └── page.tsx           # Client component with GSAP animations
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx         # Dashboard nav + GSAP entrance
│   │   │   ├── links/
│   │   │   │   └── page.tsx
│   │   │   └── analytics/
│   │   │       └── page.tsx
│   │   └── page.tsx               # → redirect to /admin/links
│   ├── api/
│   │   ├── links/
│   │   │   ├── route.ts           # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts       # PATCH, DELETE
│   │   ├── analytics/
│   │   │   ├── summary/route.ts
│   │   │   ├── clicks-over-time/route.ts
│   │   │   ├── top-links/route.ts
│   │   │   ├── top-referrers/route.ts
│   │   │   └── export/route.ts
│   │   ├── cache/
│   │   │   └── wipe/route.ts      # Clear slug cache
│   │   └── auth/
│   │       └── login/route.ts
│   ├── not-found.tsx              # 404 page with ASCII art
│   ├── layout.tsx                 # Root layout with fonts, theme, JSON-LD, analytics
│   ├── page.tsx                   # Home page
│   ├── robots.ts
│   ├── sitemap.ts
│   ├── manifest.ts
│   ├── icon.tsx / apple-icon.tsx / opengraph-image.tsx / twitter-image.tsx
│   └── error.tsx
├── components/
│   ├── ui/                        # shadcn primitives — never edit directly
│   ├── charts/
│   │   ├── clicks-over-time.tsx
│   │   ├── top-links.tsx
│   │   └── top-referrers.tsx
│   ├── links/
│   │   ├── link-list.tsx
│   │   ├── link-card.tsx
│   │   ├── create-link-form.tsx
│   │   ├── edit-link-dialog.tsx
│   │   └── types.ts
│   ├── analytics/
│   │   ├── date-range-filter.tsx
│   │   └── stats-card.tsx
│   ├── query-provider.tsx
│   ├── logo.tsx
│   └── ascii-text.tsx
├── lib/
│   ├── db/
│   │   ├── index.ts               # Drizzle client
│   │   ├── schema.ts
│   │   └── queries/
│   │       ├── links.ts
│   │       ├── analytics.ts
│   │       └── audit.ts
│   ├── redis/
│   │   ├── index.ts               # ioredis client + slug helpers
│   │   ├── cache.ts               # clearSlugCache (SCAN + DEL)
│   │   └── rate-limit.ts          # Sorted-set Lua script rate limiter
│   ├── analytics/
│   │   ├── track.ts               # trackClick() — Redis pipeline (LPUSH + LTRIM)
│   │   └── flush-clicks.ts        # Distributed-lock flush from Redis → PG
│   ├── auth/
│   │   ├── session.ts             # JWT sign/verify + cookie helpers
│   │   ├── require-admin.ts       # Cookie auth guard
│   │   ├── require-admin-with-rate-limit.ts  # Auth + rate limit combined
│   │   ├── validate-origin.ts     # CSRF protection via Origin/Referer
│   │   └── actions.ts             # logoutAction Server Action
│   ├── validators/
│   │   ├── link.ts                # createLinkSchema + updateLinkSchema + validateDestinationUrl
│   │   ├── link-schema.ts
│   │   ├── analytics.ts
│   │   └── analytics-schema.ts
│   ├── hooks/
│   │   ├── use-infinite-links.ts
│   │   └── use-intersection.ts
│   ├── audit.ts                   # createAudit() — request-level structured logging
│   ├── telemetry.ts               # OpenTelemetry traceStep wrapper
│   └── utils.ts
├── middleware.ts                   # NOT USED — no such file in this project
├── proxy.ts                        # Node.js — admin auth guard (/admin/:path*)
├── env.ts                          # @t3-oss/env-nextjs
└── instrumentation.ts              # Vercel OTel registration
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
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id:         text('id').primaryKey(),
  action:     text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId:   text('entity_id').notNull(),
  payload:    jsonb('payload'),
  ip:         text('ip'),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

Migrations in `drizzle/` at project root. Run via `bunx drizzle-kit migrate`.

---

## Redis Key Schema

| Key | Type | TTL |
|---|---|---|
| `slug:{slug}` | String (JSON) | 24h fixed |
| `ratelimit:{prefix}:{identifier}` | Sorted Set | 1 min |
| `clicks:buffer` | List | — (ephemeral, capped at 5,000) |
| `clicks:flush:lock` | String (lock) | 30s (NX) |

On link update or delete: `redis.del(`slug:${slug}`)`.

---

## Redirect Flow (src/app/[slug]/route.ts — Node.js)

`[slug]/route.ts` resolves slugs and redirects. It does **not** use middleware — `proxy.ts` handles auth only.

```ts
// src/app/[slug]/route.ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Rate limit + resolve slug in parallel
  const [rl, link] = await Promise.all([
    checkRateLimit({ windowMs: 60_000, max: 100, key: rateLimitKey("slug-resolve", ip) }),
    resolveSlug(slug),
  ]);

  if (!rl.allowed || !link || !link.isActive) notFound();

  // Fire-and-forget click tracking via after()
  after(async () => {
    await trackClick({ linkId: link.id, referrer, country, userAgent });
  });

  return Response.redirect(link.destinationUrl, 307);
}
```

---

## Auth Guard (proxy.ts — Node.js)

```ts
// src/proxy.ts
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const token = req.cookies.get("admin_session")?.value;
  if (!token || !(await verifySession(token))) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
```

---

## API Routes

All inputs validated with Zod. All routes return `application/json` unless noted.

### Links

```
GET    /api/links?cursor=<cursor>&limit=20
POST   /api/links                     # + CSRF (Origin validation)
PATCH  /api/links/:id                 # + CSRF
DELETE /api/links/:id  → 204          # + CSRF
```

### Analytics

```
GET /api/analytics/summary?from=&to=&linkId=
GET /api/analytics/clicks-over-time?from=&to=&linkId=
GET /api/analytics/top-links?from=&to=&limit=10
GET /api/analytics/top-referrers?from=&to=&linkId=
GET /api/analytics/export?from=&to=&linkId=    → text/csv
```

### Cache

```
POST /api/cache/wipe                           → { ok, deletedKeys }
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

---

## Rate Limiting

Three rate limiters, all using Redis sorted sets + Lua script:

| Endpoint | Window | Max requests | Key prefix |
|---|---|---|---|
| `POST /api/auth/login` | 1 min | 5 | `ratelimit:login:{ip}` |
| Admin API routes | 1 min | 60 | `ratelimit:admin-api:{ip}` |
| `GET /[slug]` (redirect) | 1 min | 100 | `ratelimit:slug-resolve:{ip}` |

On Redis failure, all rate limiters fail open (allow).

---

## Logout

Logout uses a Server Action (`src/lib/auth/actions.ts`), not an API route:

```ts
"use server"
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName());
  redirect("/");
}
```

---

## Environment Validation

```ts
// src/env.ts
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
feature/* → human-authored features (PR → main)
fix/*     → bug fixes (PR → main)
```

All work happens in sub-branches. Never commit directly to `main`.
