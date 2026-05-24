# Skill: Analytics

## Scope

Analytics queries, chart data shapes, CSV export, and the Redis buffer flush mechanism.

**Important:** Analytics queries do **not** use `"use cache"`. They call `flushClickBuffer()` before each query to ensure read-your-writes consistency, then query Postgres directly.

---

## Query Functions

All functions live in `src/lib/db/queries/analytics.ts`. Each calls `flushClickBuffer()` first.

### Summary

```ts
export async function getAnalyticsSummary(from: Date, to: Date, linkId?: string) {
  await flushClickBuffer()

  const [{ count: totalClicks }] = await db
    .select({ count: count() })
    .from(clicks)
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to), linkId ? eq(clicks.linkId, linkId) : undefined))

  const peakRow = await db
    .select({ day: sql<string>`DATE(clicked_at)`, clicks: count() })
    .from(clicks)
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to)))
    .groupBy(sql`DATE(clicked_at)`)
    .orderBy(desc(count()))
    .limit(1)

  return {
    totalClicks: Number(totalClicks),
    peakDay:       peakRow[0]?.day ?? null,
    peakDayClicks: peakRow[0] ? Number(peakRow[0].clicks) : 0,
  }
}
```

### Clicks Over Time

```ts
export async function getClicksOverTime(from: Date, to: Date, linkId?: string) {
  await flushClickBuffer()

  return db
    .select({ date: sql<string>`DATE(clicked_at)`, clicks: count() })
    .from(clicks)
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to), linkId ? eq(clicks.linkId, linkId) : undefined))
    .groupBy(sql`DATE(clicked_at)`)
    .orderBy(asc(sql`DATE(clicked_at)`))
}
```

### Top Links

```ts
export async function getTopLinks(from: Date, to: Date, limit = 10) {
  await flushClickBuffer()

  return db
    .select({ linkId: clicks.linkId, slug: links.slug, title: links.title, clicks: count() })
    .from(clicks)
    .innerJoin(links, eq(clicks.linkId, links.id))
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to)))
    .groupBy(clicks.linkId, links.slug, links.title)
    .orderBy(desc(count()))
    .limit(limit)
}
```

### Top Referrers

```ts
export async function getTopReferrers(from: Date, to: Date, linkId?: string) {
  await flushClickBuffer()

  const rows = await db
    .select({ referrer: clicks.referrer, clicks: count() })
    .from(clicks)
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to), linkId ? eq(clicks.linkId, linkId) : undefined))
    .groupBy(clicks.referrer)
    .orderBy(desc(count()))
    .limit(20)

  return rows.map(r => ({ hostname: parseHostname(r.referrer), clicks: Number(r.clicks) }))
}

function parseHostname(referrer: string | null): string {
  if (!referrer) return 'direct'
  try { return new URL(referrer).hostname } catch { return 'unknown' }
}
```

---

## CSV Export

```ts
// src/app/api/analytics/export/route.ts
// Uses analyticsQuerySchema for validation (max 365 day range)
// Generates CSV with click data, attaches as download
```

Key details:
- Validates input via `analyticsQuerySchema` (Zod — max 365 day range)
- Limits rows to 100,000
- Escapes CSV values to prevent injection (formulas starting with `=`, `+`, `-`, `@`)
- Auth: `requireAdminWithRateLimit`

---

## flushClickBuffer — Invoked Automatically

Every analytics query function calls `flushClickBuffer()` at the start. This:

1. Acquires a distributed Redis lock (`SET NX PX 30000`)
2. Reads buffered clicks from `clicks:buffer` (Redis list)
3. Batch-inserts them into Postgres
4. Uses `LTRIM` to remove only processed items (never `DEL`)
5. Releases the lock

The lock prevents duplicate inserts when 4 analytics queries run in parallel via `Promise.all`.

---

## Date Range Filter Shape

```ts
export type DateRangePreset = '7d' | '30d' | '90d' | 'custom'

export function presetToRange(preset: DateRangePreset): { from: Date; to: Date } {
  const to = new Date()
  const from = new Date()

  if (preset === '7d')  from.setDate(to.getDate() - 7)
  if (preset === '30d') from.setDate(to.getDate() - 30)
  if (preset === '90d') from.setDate(to.getDate() - 90)

  return { from, to }
}
```
