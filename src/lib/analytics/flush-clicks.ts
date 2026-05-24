import "server-only";
import { nanoid } from "nanoid";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";

const BUFFER_KEY = "clicks:buffer";
const LOCK_KEY = "clicks:flush:lock";
const LOCK_TTL_MS = 30_000;

interface BufferedClick {
  linkId: string;
  clickedAt: string;
  referrer: string | null;
  country: string | null;
  uaHash: string | null;
}

async function acquireLock(): Promise<boolean> {
  const ok = await redis.set(LOCK_KEY, "1", "PX", LOCK_TTL_MS, "NX");
  return ok === "OK";
}

async function releaseLock(): Promise<void> {
  await redis.del(LOCK_KEY).catch(() => {});
}

export async function flushClickBuffer(): Promise<void> {
  let acquired = false;
  try {
    acquired = await acquireLock();
    if (!acquired) return;

    const raw = await redis.lrange(BUFFER_KEY, 0, -1);
    if (raw.length === 0) return;

    const records: (typeof clicks.$inferInsert)[] = raw.map((entry) => {
      const data = JSON.parse(entry) as BufferedClick;
      return {
        id: nanoid(),
        linkId: data.linkId,
        clickedAt: new Date(data.clickedAt),
        referrer: data.referrer,
        country: data.country,
        uaHash: data.uaHash,
      };
    });

    await db.insert(clicks).values(records);
    await redis.ltrim(BUFFER_KEY, raw.length, -1);
  } catch {
    // flush errors must never break analytics queries
  } finally {
    if (acquired) await releaseLock();
  }
}
