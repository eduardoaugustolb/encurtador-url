import { describe, test, expect, beforeEach } from "bun:test";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";

beforeEach(() => {
  globalThis.__mockRedis.eval.mockClear();
});

describe("checkRateLimit", () => {
  test("allows request when under limit", async () => {
    globalThis.__mockRedis.eval.mockImplementationOnce(
      async () => [1, 5],
    );

    const result = await checkRateLimit({
      windowMs: 60_000,
      max: 100,
      key: "test:ip",
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(95);
  });

  test("blocks request when at limit", async () => {
    globalThis.__mockRedis.eval.mockImplementationOnce(
      async () => [0, 100],
    );

    const result = await checkRateLimit({
      windowMs: 60_000,
      max: 100,
      key: "test:ip",
    });

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test("calls redis.eval with the Lua script and correct arguments", async () => {
    await checkRateLimit({
      windowMs: 60_000,
      max: 100,
      key: "ratelimit:slug-resolve:127.0.0.1",
    });

    expect(globalThis.__mockRedis.eval).toHaveBeenCalledTimes(1);
    const [script, numKeys, key, windowMs, max, now] =
      globalThis.__mockRedis.eval.mock.calls[0];

    expect(script).toBeString();
    expect(script).toContain("ZREMRANGEBYSCORE");
    expect(script).toContain("ZADD");
    expect(script).toContain("EXPIRE");
    expect(numKeys).toBe(1);
    expect(key).toBe("ratelimit:slug-resolve:127.0.0.1");
    expect(windowMs).toBe("60000");
    expect(max).toBe("100");
    expect(Number(now)).toBeGreaterThan(0);
  });

  test("fail-open when Redis throws", async () => {
    globalThis.__mockRedis.eval.mockImplementationOnce(
      async () => { throw new Error("connection refused"); },
    );

    const result = await checkRateLimit({
      windowMs: 60_000,
      max: 100,
      key: "test:ip",
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
  });
});

describe("rateLimitKey", () => {
  test("formats key with prefix and identifier", () => {
    const key = rateLimitKey("slug-resolve", "127.0.0.1");
    expect(key).toBe("ratelimit:slug-resolve:127.0.0.1");
  });
});
