import "server-only";
import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { db, type DB } from "@/lib/db";
import { links } from "@/lib/db/schema";

type Link = typeof links.$inferSelect;

interface PositionCursor {
  position: number;
  createdAt: string;
  id: string;
}

interface CreateData {
  id: string;
  slug: string;
  destinationUrl: string;
  title?: string | null;
  icon?: string | null;
}

interface UpdateData {
  destinationUrl?: string;
  title?: string | null;
  isActive?: boolean;
  showOnHome?: boolean;
  icon?: string | null;
}

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
  paginateHomeLinks(cursor?: string, limit?: number): Promise<{
    data: Pick<Link, "slug" | "title" | "icon" | "createdAt" | "id">[];
    nextCursor: string | null;
  }>;
  create(data: CreateData): Promise<Link>;
  update(id: string, data: UpdateData): Promise<Link>;
  delete(id: string): Promise<void>;
  updatePositions(items: { id: string; position: number }[]): Promise<void>;
}

export class LinkRepository implements ILinkRepository {
  constructor(private db: DB) {}

  async paginate(cursor?: string, limit = 20) {
    const decoded: PositionCursor | null = cursor
      ? JSON.parse(atob(cursor))
      : null;

    const rows = await this.db
      .select()
      .from(links)
      .where(
        decoded
          ? or(
              gt(links.position, decoded.position),
              and(
                eq(links.position, decoded.position),
                or(
                  lt(links.createdAt, new Date(decoded.createdAt)),
                  and(
                    eq(links.createdAt, new Date(decoded.createdAt)),
                    lt(links.id, decoded.id),
                  ),
                ),
              ),
            )
          : undefined,
      )
      .orderBy(asc(links.position), desc(links.createdAt), desc(links.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data.at(-1);

    return {
      data,
      nextCursor:
        hasMore && last
          ? btoa(
              JSON.stringify({
                position: last.position,
                createdAt: last.createdAt,
                id: last.id,
              }),
            )
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

  async paginateHomeLinks(cursor?: string, limit = 20) {
    const decoded = cursor
      ? (JSON.parse(atob(cursor)) as { createdAt: string; id: string })
      : null;

    const rows = await this.db
      .select({
        slug: links.slug,
        title: links.title,
        icon: links.icon,
        createdAt: links.createdAt,
        id: links.id,
      })
      .from(links)
      .where(
        and(
          eq(links.showOnHome, true),
          eq(links.isActive, true),
          decoded
            ? or(
                lt(links.createdAt, new Date(decoded.createdAt)),
                and(
                  eq(links.createdAt, new Date(decoded.createdAt)),
                  lt(links.id, decoded.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(links.createdAt), desc(links.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      nextCursor:
        hasMore && data.length > 0
          ? btoa(
              JSON.stringify({
                createdAt: data[data.length - 1]!.createdAt,
                id: data[data.length - 1]!.id,
              }),
            )
          : null,
    };
  }

  async create(data: CreateData) {
    const [link] = await this.db.transaction(async (tx) => {
      const [result] = await tx
        .select({ maxPosition: sql<number>`COALESCE(MAX(${links.position}), 0) + 1` })
        .from(links);

      const nextPosition = result?.maxPosition ?? 1;

      return tx
        .insert(links)
        .values({
          id: data.id,
          slug: data.slug,
          destinationUrl: data.destinationUrl,
          title: data.title ?? null,
          icon: data.icon ?? null,
          position: nextPosition,
        })
        .returning();
    });
    return link;
  }

  async update(
    id: string,
    data: {
      destinationUrl?: string;
      title?: string | null;
      isActive?: boolean;
      showOnHome?: boolean;
      icon?: string | null;
    },
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

  async updatePositions(items: { id: string; position: number }[]) {
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(links)
          .set({ position: item.position, updatedAt: new Date() })
          .where(eq(links.id, item.id));
      }
    });
  }
}

export const linkRepository = new LinkRepository(db);
