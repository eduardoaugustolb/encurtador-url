import "server-only";
import { nanoid } from "nanoid";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";

const BUFFER_KEY = "clicks:buffer";

interface BufferedClick {
  linkId: string;
  clickedAt: string;
  referrer: string | null;
  country: string | null;
  uaHash: string | null;
}

export async function flushClickBuffer(): Promise<void> {
  try {
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
    await redis.del(BUFFER_KEY);
  } catch {
    // flush errors must never break analytics queries
  }
}
