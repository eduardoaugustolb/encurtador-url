import "server-only";
import { redis } from "@/lib/redis";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  key: string;
}

const SCRIPT = `
  local key = KEYS[1]
  local window_ms = tonumber(ARGV[1])
  local limit = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])

  redis.call('ZREMRANGEBYSCORE', key, 0, now - window_ms)
  local count = redis.call('ZCARD', key)

  if count >= limit then
    return {0, count}
  end

  redis.call('ZADD', key, now, now .. ':' .. count)
  redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
  return {1, count + 1}
`;

export async function checkRateLimit({
  windowMs,
  max,
  key,
}: RateLimitConfig): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now();

    const result = (await redis.eval(
      SCRIPT,
      1,
      key,
      String(windowMs),
      String(max),
      String(now),
    )) as [number, number];

    const allowed = result[0] === 1;
    const count = result[1];

    return {
      allowed,
      remaining: allowed ? max - count : 0,
    };
  } catch {
    return { allowed: true, remaining: max };
  }
}

export function rateLimitKey(prefix: string, identifier: string): string {
  return `ratelimit:${prefix}:${identifier}`;
}
