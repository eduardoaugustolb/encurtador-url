import "server-only";
import { eq } from "drizzle-orm";
import Redis from "ioredis";
import { env } from "@/env";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";

export const redis = new Redis(env.REDIS_URL);

export type CachedLink = {
  id: string;
  destinationUrl: string;
  isActive: boolean;
};

export async function resolveSlug(slug: string): Promise<CachedLink | null> {
  const raw = await redis.get(`slug:${slug}`);
  if (raw) return JSON.parse(raw) as CachedLink;

  const link = await db.query.links.findFirst({
    where: eq(links.slug, slug),
    columns: {
      id: true,
      destinationUrl: true,
      isActive: true,
    },
  });

  if (!link) return null;

  await redis.setex(`slug:${slug}`, 86400, JSON.stringify(link));

  return link;
}

export async function invalidateSlug(slug: string) {
  await redis.del(`slug:${slug}`);
}
