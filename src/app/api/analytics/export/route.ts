import { and, desc, eq, gte, lte } from "drizzle-orm";
import { requireAdminWithRateLimit } from "@/lib/auth/require-admin-with-rate-limit";
import { db } from "@/lib/db";
import { clicks, links } from "@/lib/db/schema";
import { analyticsQuerySchema } from "@/lib/validators/analytics";

const MAX_ROWS = 100_000;

function escapeCSV(value: string | null): string {
  if (value === null || value === undefined) return "";

  const dangerous = /^[=+\-@]/.test(value);
  const escaped = dangerous ? `'${value}` : value;

  if (
    escaped.includes('"') ||
    escaped.includes(",") ||
    escaped.includes("\n")
  ) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }

  return escaped;
}

export async function GET(req: Request) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const parsed = analyticsQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    linkId: url.searchParams.get("linkId") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      clickedAt: clicks.clickedAt,
      referrer: clicks.referrer,
      country: clicks.country,
      slug: links.slug,
    })
    .from(clicks)
    .innerJoin(links, eq(clicks.linkId, links.id))
    .where(
      and(
        gte(clicks.clickedAt, new Date(parsed.data.from)),
        lte(clicks.clickedAt, new Date(parsed.data.to)),
        parsed.data.linkId ? eq(clicks.linkId, parsed.data.linkId) : undefined,
      ),
    )
    .orderBy(desc(clicks.clickedAt))
    .limit(MAX_ROWS);

  const csv = [
    "clicked_at,slug,referrer,country",
    ...rows.map((r) =>
      [
        r.clickedAt.toISOString(),
        r.slug,
        escapeCSV(r.referrer),
        escapeCSV(r.country),
      ].join(","),
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="clicks-export.csv"',
    },
  });
}
