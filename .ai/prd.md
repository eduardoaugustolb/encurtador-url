# Product Requirements Document — Bit Link

## Overview

Bit Link is a self-hosted URL shortener with a real-time analytics dashboard. It is designed for a single admin user who manages all links and monitors traffic. The primary design constraint is speed: redirect latency must be imperceptible to end users, and the dashboard must feel instant.

## Goals

- Redirect end users with sub-10ms latency on cache hit
- Give the admin a clear view of link performance without leaving the dashboard
- Keep infrastructure simple: Vercel + external Postgres + external Redis (Square Cloud)
- Be fully self-contained: no third-party analytics services

## Non-Goals

- Multi-tenant or team features
- Public link creation (no sign-up flow)
- Real-time push updates to the dashboard (polling or manual refresh is acceptable)
- Custom domain per link

---

## Users

**End user** — clicks a short link somewhere on the internet, expects to be redirected immediately. Has no interaction with the product beyond the redirect.

**Admin** — a single person (the owner) who logs in to create and manage links, and to review analytics. Authenticated via a hardcoded secret stored in environment variables.

---

## Core Features

### 1. Redirect Engine

- `GET /:slug` runs on Vercel Edge Runtime via `middleware.ts` (Edge-only, `proxy.ts` runs on Node.js)
- Lookup order: Redis cache → Postgres fallback
- On cache hit: redirect `307` immediately, track click in background via `waitUntil`
- On cache miss: query Postgres, warm Redis with TTL tied to `expires_at`, redirect, track click
- Expired or inactive slug → `404`
- Referrer parsed from `Referer` header — store full URL, display hostname in dashboard

### 2. Link Management

- Create: destination URL (required), title (optional), custom slug (optional), expiry date (optional)
- Auto-generate slug with nanoid (7 chars) when none provided
- Custom slug must match `^[a-zA-Z0-9_-]{3,50}$`
- Edit: title, destination URL, active/inactive toggle, expiry date
- Delete: hard delete with cascade on clicks
- List: cursor-based pagination, 20 per page, infinite scroll

### 3. Analytics Tracking

On every redirect, record:

| Field | Source |
|---|---|
| `link_id` | resolved from slug |
| `clicked_at` | `Date.now()` on Edge |
| `referrer` | `Referer` request header (full URL stored, hostname displayed) |
| `country` | `x-vercel-ip-country` header |
| `ua_hash` | SHA-256 of `User-Agent` — never raw UA |

Tracking is fire-and-forget via `waitUntil`. A failed INSERT must never affect the redirect.

### 4. Analytics Dashboard

Charts rendered with Recharts. All charts respond to a shared date range filter (Last 7d / 30d / 90d / custom) and an optional per-link filter.

| Chart | Description |
|---|---|
| Clicks over time | Bar chart, day granularity |
| Top links | Horizontal bar, ranked by clicks in selected period |
| Top referrers | Horizontal bar, by parsed hostname |
| Peak day | Stat card — highest traffic day in period |

Export: CSV download of raw clicks for the selected period and filters.

### 5. Authentication

- Login form at `/admin/login`
- Password compared against `ADMIN_PASSWORD` env var via `timingSafeEqual`
- On success: signed JWT set as `HttpOnly; Secure; SameSite=Lax` cookie, 7-day expiry
- `proxy.ts` protects all `/admin/**` routes (Node.js runtime, cookie reading)
- `middleware.ts` handles Edge-only redirect logic (slug routing)

---

## Performance Requirements

| Metric | Target |
|---|---|
| Redirect (cache hit) | < 10ms TTFB |
| Redirect (cache miss) | < 80ms TTFB |
| Dashboard initial load | < 1.5s LCP |
| Analytics API (aggregates) | < 200ms |

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | Edge redirect, RSC dashboard, `use cache` for perf |
| Database | Postgres + Drizzle ORM | Type-safe queries, migrations as code |
| Cache | Redis via ioredis | Sub-millisecond slug lookup |
| UI | shadcn/ui + Tailwind | Accessible, unstyled base |
| Charts | Recharts | Composable, React-native |
| Data fetching | TanStack Query v5 | Infinite scroll, background refetch |
| Validation | Zod | Shared schema between client and server |
| Env | @t3-oss/env-nextjs | Build-time env validation, fails fast |
| ID generation | nanoid | URL-safe short IDs |

---

## Environment Variables

```
DATABASE_URL=
REDIS_URL=
ADMIN_PASSWORD=        # compared via timingSafeEqual
ADMIN_SECRET=          # JWT signing secret, min 32 chars
NEXT_PUBLIC_APP_URL=   # used to build short URLs in the UI
```

---

## Out of Scope for v1

- Rate limiting on redirect
- QR code generation
- Click deduplication
- Webhooks on click events
- Open Graph preview cards
