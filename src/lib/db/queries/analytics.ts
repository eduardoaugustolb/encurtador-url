import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import "server-only";

export async function getAnalyticsSummary(
  from: Date,
  to: Date,
  linkId?: string,
) {
  const [{ count: totalClicks }] = await db
    .select({ count: count() })
    .from(clicks)
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined,
      ),
    );

  const peakRow = await db
    .select({
      day: sql<string>`DATE(clicked_at)`,
      clicks: count(),
    })
    .from(clicks)
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to)))
    .groupBy(sql`DATE(clicked_at)`)
    .orderBy(desc(count()))
    .limit(1);

  return {
    totalClicks: Number(totalClicks),
    peakDay: peakRow[0]?.day ?? null,
    peakDayClicks: peakRow[0] ? Number(peakRow[0].clicks) : 0,
  };
}

export async function getClicksOverTime(from: Date, to: Date, linkId?: string) {
  return db
    .select({
      date: sql<string>`DATE(clicked_at)`,
      clicks: count(),
    })
    .from(clicks)
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined,
      ),
    )
    .groupBy(sql`DATE(clicked_at)`)
    .orderBy(asc(sql`DATE(clicked_at)`));
}

export async function getTopLinks(from: Date, to: Date, limit = 10) {
  return db
    .select({
      linkId: clicks.linkId,
      slug: links.slug,
      title: links.title,
      clicks: count(),
    })
    .from(clicks)
    .innerJoin(links, eq(clicks.linkId, links.id))
    .where(and(gte(clicks.clickedAt, from), lte(clicks.clickedAt, to)))
    .groupBy(clicks.linkId, links.slug, links.title)
    .orderBy(desc(count()))
    .limit(limit);
}

export async function getTopReferrers(from: Date, to: Date, linkId?: string) {
  const rows = await db
    .select({ referrer: clicks.referrer, clicks: count() })
    .from(clicks)
    .where(
      and(
        gte(clicks.clickedAt, from),
        lte(clicks.clickedAt, to),
        linkId ? eq(clicks.linkId, linkId) : undefined,
      ),
    )
    .groupBy(clicks.referrer)
    .orderBy(desc(count()))
    .limit(20);

  return rows.map((r) => ({
    hostname: parseHostname(r.referrer),
    clicks: Number(r.clicks),
  }));
}

function parseHostname(referrer: string | null): string {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname;
  } catch {
    return "unknown";
  }
}
