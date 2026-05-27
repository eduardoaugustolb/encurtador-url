import "server-only";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db, type DB } from "@/lib/db";
import { links } from "@/lib/db/schema";

type Link = typeof links.$inferSelect;

export interface ILinkRepository {
  paginate(cursor?: string, limit?: number): Promise<{
    data: Link[];
    nextCursor: string | null;
  }>;
  findById(id: string): Promise<Link | undefined>;
  findBySlug(slug: string): Promise<{
    id: string;
    destinationUrl: string;
    isActive: boolean;
  } | undefined>;
  create(data: {
    id: string;
    slug: string;
    destinationUrl: string;
    title?: string | null;
  }): Promise<Link>;
  update(
    id: string,
    data: { destinationUrl?: string; title?: string | null; isActive?: boolean },
  ): Promise<Link>;
  delete(id: string): Promise<void>;
}

export class LinkRepository implements ILinkRepository {
  constructor(private db: DB) {}

  async paginate(cursor?: string, limit = 20) {
    const decoded = cursor
      ? (JSON.parse(atob(cursor)) as { createdAt: string; id: string })
      : null;

    const rows = await this.db
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

  async findById(id: string) {
    return this.db.query.links.findFirst({
      where: eq(links.id, id),
    });
  }

  async findBySlug(slug: string) {
    return this.db.query.links.findFirst({
      where: eq(links.slug, slug),
      columns: { id: true, destinationUrl: true, isActive: true },
    });
  }

  async create(data: {
    id: string;
    slug: string;
    destinationUrl: string;
    title?: string | null;
  }) {
    const [link] = await this.db
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

  async update(
    id: string,
    data: { destinationUrl?: string; title?: string | null; isActive?: boolean },
  ) {
    const [link] = await this.db
      .update(links)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(links.id, id))
      .returning();
    return link;
  }

  async delete(id: string) {
    await this.db.delete(links).where(eq(links.id, id));
  }
}

export const linkRepository = new LinkRepository(db);
