import "server-only";
import { redis } from "@/lib/redis";

const SLUG_PATTERN = "slug:*";

export async function clearSlugCache(): Promise<number> {
  let cursor = "0";
  let total = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      SLUG_PATTERN,
      "COUNT",
      100,
    );

    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
      total += keys.length;
    }
  } while (cursor !== "0");

  return total;
}
