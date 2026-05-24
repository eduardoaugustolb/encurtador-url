import "server-only";
import { redis } from "@/lib/redis";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  key: string;
}

export async function checkRateLimit({
  windowMs,
  max,
  key,
}: RateLimitConfig): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;

    await redis.zremrangebyscore(key, 0, windowStart);

    const count = await redis.zcard(key);

    if (count >= max) {
      return { allowed: false, remaining: 0 };
    }

    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(windowMs / 1000));

    return { allowed: true, remaining: max - count - 1 };
  } catch {
    return { allowed: true, remaining: max };
  }
}

export function rateLimitKey(prefix: string, identifier: string): string {
  return `ratelimit:${prefix}:${identifier}`;
}
