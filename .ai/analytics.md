# Skill: Analytics

## Scope

Analytics queries, chart data shapes, CSV export, and the `use cache` strategy for dashboard performance.

---

## Query Functions

All functions live in `src/lib/db/queries/analytics.ts`. All are cached with `"use cache"`.

### Summary

```ts
"use cache"
export async function getAnalyticsSummary(from: Date, to: Date, linkId?: string) {
  cacheTag('analytics-summary')
  cacheLife('minutes')

  const base = db
    .select({ count: count() })
    .from(clicks)
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined
      )
    )

  const [{ count: totalClicks }] = await base

  // Peak day sub-query
  const peakRow = await db
    .select({
      day:    sql<string>`DATE(clicked_at)`,
      clicks: count(),
    })
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
"use cache"
export async function getClicksOverTime(from: Date, to: Date, linkId?: string) {
  cacheTag('analytics-clicks')
  cacheLife('minutes')

  return db
    .select({
      date:   sql<string>`DATE(clicked_at)`,
      clicks: count(),
    })
    .from(clicks)
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined
      )
    )
    .groupBy(sql`DATE(clicked_at)`)
    .orderBy(asc(sql`DATE(clicked_at)`))
}
```

### Top Links

```ts
"use cache"
export async function getTopLinks(from: Date, to: Date, limit = 10) {
  cacheTag('analytics-top-links')
  cacheLife('minutes')

  return db
    .select({
      linkId: clicks.linkId,
      slug:   links.slug,
      title:  links.title,
      clicks: count(),
    })
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
"use cache"
export async function getTopReferrers(from: Date, to: Date, linkId?: string) {
  cacheTag('analytics-referrers')
  cacheLife('minutes')

  const rows = await db
    .select({ referrer: clicks.referrer, clicks: count() })
    .from(clicks)
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined
      )
    )
    .groupBy(clicks.referrer)
    .orderBy(desc(count()))
    .limit(20)

  return rows.map(r => ({
    hostname: parseHostname(r.referrer),
    clicks: Number(r.clicks),
  }))
}

function parseHostname(referrer: string | null): string {
  if (!referrer) return 'direct'
  try {
    return new URL(referrer).hostname
  } catch {
    return 'unknown'
  }
}
```

---

## CSV Export

```ts
// src/app/api/analytics/export/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from   = new Date(searchParams.get('from')!)
  const to     = new Date(searchParams.get('to')!)
  const linkId = searchParams.get('linkId') ?? undefined

  const rows = await db
    .select({
      clickedAt: clicks.clickedAt,
      referrer:  clicks.referrer,
      country:   clicks.country,
      slug:      links.slug,
    })
    .from(clicks)
    .innerJoin(links, eq(clicks.linkId, links.id))
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined
      )
    )
    .orderBy(desc(clicks.clickedAt))

  const csv = [
    'clicked_at,slug,referrer,country',
    ...rows.map(r =>
      [r.clickedAt.toISOString(), r.slug, r.referrer ?? '', r.country ?? ''].join(',')
    ),
  ].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="clicks-export.csv"`,
    },
  })
}
```

---

## Cache Invalidation After Tracking

After bulk inserts (or periodically), invalidate analytics caches:

```ts
// In a Server Action or after trackClick batches
revalidateTag('analytics-summary', 'minutes')
revalidateTag('analytics-clicks', 'minutes')
revalidateTag('analytics-top-links', 'minutes')
revalidateTag('analytics-referrers', 'minutes')
```

For the v1 dashboard, a manual "Refresh" button calling these revalidations is acceptable.

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
