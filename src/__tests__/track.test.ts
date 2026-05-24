import { describe, test, expect, beforeEach } from "bun:test";
import { trackClick } from "@/lib/analytics/track";

beforeEach(() => {
  globalThis.__mockRedis.lpush.mockClear();
  globalThis.__mockRedis.ltrim.mockClear();
});

describe("trackClick", () => {
  test("pushes serialized entry to clicks:buffer", async () => {
    await trackClick({
      linkId: "link-123",
      referrer: "https://example.com",
      country: "BR",
      userAgent: "Mozilla/5.0",
    });

    expect(globalThis.__mockRedis.lpush).toHaveBeenCalledTimes(1);
    expect(globalThis.__mockRedis.ltrim).toHaveBeenCalledTimes(1);

    const [key, entry] = globalThis.__mockRedis.lpush.mock.calls[0];
    expect(key).toBe("clicks:buffer");

    const parsed = JSON.parse(entry);
    expect(parsed.linkId).toBe("link-123");
    expect(parsed.referrer).toBe("https://example.com");
    expect(parsed.country).toBe("BR");
    expect(typeof parsed.uaHash).toBe("string");
    expect(typeof parsed.clickedAt).toBe("string");
  });

  test("hashes user-agent with SHA-256", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: null,
      userAgent: "Chrome/120",
    });

    const [, entry] = globalThis.__mockRedis.lpush.mock.calls[0];
    const parsed = JSON.parse(entry);
    expect(parsed.uaHash).toHaveLength(64);
    expect(parsed.uaHash).not.toBe("Chrome/120");
  });

  test("sets uaHash to null when no user-agent", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: null,
      userAgent: null,
    });

    const [, entry] = globalThis.__mockRedis.lpush.mock.calls[0];
    const parsed = JSON.parse(entry);
    expect(parsed.uaHash).toBeNull();
  });

  test("truncates country to 2 characters", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: "BRA",
      userAgent: null,
    });

    const [, entry] = globalThis.__mockRedis.lpush.mock.calls[0];
    const parsed = JSON.parse(entry);
    expect(parsed.country).toBe("BR");
  });

  test("caps buffer at MAX_BUFFER entries", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: null,
      userAgent: null,
    });

    expect(globalThis.__mockRedis.ltrim).toHaveBeenCalledWith("clicks:buffer", 0, 4999);
  });

  test("swallows errors silently", async () => {
    globalThis.__mockRedis.lpush.mockImplementationOnce(
      async () => { throw new Error("redis down"); },
    );

    await expect(
      trackClick({
        linkId: "link-1",
        referrer: null,
        country: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();
  });
});
