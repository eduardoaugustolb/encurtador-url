import "server-only";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";

interface PaginateInput {
  cursor?: string;
  limit?: number;
}

export async function paginateLinks({ cursor, limit = 20 }: PaginateInput) {
  const decoded = cursor
    ? (JSON.parse(atob(cursor)) as { createdAt: string; id: string })
    : null;

  const rows = await db
    .select()
    .from(links)
    .where(
      decoded
        ? or(
            lt(links.createdAt, new Date(decoded.createdAt)),
            and(
              eq(links.createdAt, new Date(decoded.createdAt)),
              lt(links.id, decoded.id),
            ),
          )
        : undefined,
    )
    .orderBy(desc(links.createdAt), desc(links.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);

  return {
    data,
    nextCursor:
      hasMore && last
        ? btoa(JSON.stringify({ createdAt: last.createdAt, id: last.id }))
        : null,
  };
}

export async function getLinkById(id: string) {
  return db.query.links.findFirst({
    where: eq(links.id, id),
  });
}

export async function getLinkBySlug(slug: string) {
  return db.query.links.findFirst({
    where: eq(links.slug, slug),
    columns: {
      id: true,
      destinationUrl: true,
      isActive: true,
    },
  });
}

interface CreateLinkData {
  id: string;
  slug: string;
  destinationUrl: string;
  title?: string | null;
}

export async function createLink(data: CreateLinkData) {
  const [link] = await db
    .insert(links)
    .values({
      id: data.id,
      slug: data.slug,
      destinationUrl: data.destinationUrl,
      title: data.title ?? null,
    })
    .returning();
  return link;
}

interface UpdateLinkData {
  destinationUrl?: string;
  title?: string | null;
  isActive?: boolean;
}

export async function updateLink(id: string, data: UpdateLinkData) {
  const [link] = await db
    .update(links)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(links.id, id))
    .returning();
  return link;
}

export async function deleteLink(id: string) {
  await db.delete(links).where(eq(links.id, id));
}
