import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flushClickBuffer } from "@/lib/analytics/flush-clicks";

beforeEach(() => {
  globalThis.__mockRedis.set.mockClear();
  globalThis.__mockRedis.del.mockClear();
  globalThis.__mockRedis.lrange.mockClear();
  globalThis.__mockRedis.ltrim.mockClear();
  globalThis.__mockDb.insert.mockClear();
});

describe("flushClickBuffer", () => {
  test("acquires lock, does nothing when buffer is empty, releases lock", async () => {
    globalThis.__mockRedis.lrange.mockImplementationOnce(async () => []);

    await flushClickBuffer();

    expect(globalThis.__mockRedis.set).toHaveBeenCalledWith(
      "clicks:flush:lock",
      "1",
      "PX",
      30000,
      "NX",
    );
    expect(globalThis.__mockDb.insert).not.toHaveBeenCalled();
    expect(globalThis.__mockRedis.ltrim).not.toHaveBeenCalled();
    expect(globalThis.__mockRedis.del).toHaveBeenCalledWith(
      "clicks:flush:lock",
    );
  });

  test("skips flush when lock is held by another caller", async () => {
    globalThis.__mockRedis.set.mockImplementationOnce(async () => null);

    await flushClickBuffer();

    expect(globalThis.__mockRedis.lrange).not.toHaveBeenCalled();
    expect(globalThis.__mockDb.insert).not.toHaveBeenCalled();
    expect(globalThis.__mockRedis.del).not.toHaveBeenCalled();
  });

  test("batch inserts buffered clicks then trims buffer", async () => {
    const buffered = [
      JSON.stringify({
        linkId: "link-1",
        clickedAt: "2024-01-01T00:00:00.000Z",
        referrer: "https://example.com",
        country: "US",
        uaHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
      }),
      JSON.stringify({
        linkId: "link-2",
        clickedAt: "2024-01-01T01:00:00.000Z",
        referrer: null,
        country: null,
        uaHash: null,
      }),
    ];

    globalThis.__mockRedis.lrange.mockImplementationOnce(async () => buffered);

    await flushClickBuffer();

    expect(globalThis.__mockRedis.lrange).toHaveBeenCalledWith(
      "clicks:buffer",
      0,
      -1,
    );
    expect(globalThis.__mockDb.insert).toHaveBeenCalledTimes(1);
    expect(globalThis.__mockRedis.ltrim).toHaveBeenCalledWith(
      "clicks:buffer",
      2,
      -1,
    );
  });

  test("passes parsed records to values()", async () => {
    const buffered = [
      JSON.stringify({
        linkId: "link-1",
        clickedAt: "2024-06-15T12:00:00.000Z",
        referrer: "https://google.com",
        country: "BR",
        uaHash: null,
      }),
    ];

    globalThis.__mockRedis.lrange.mockImplementationOnce(async () => buffered);

    const insertBuilder = { values: mock(() => Promise.resolve([])) };
    globalThis.__mockDb.insert.mockImplementationOnce(() => insertBuilder);

    await flushClickBuffer();

    const records = insertBuilder.values.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(Array.isArray(records)).toBe(true);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      linkId: "link-1",
      referrer: "https://google.com",
      country: "BR",
    });
    expect(records[0]).toHaveProperty("id");
    expect(records[0]).toHaveProperty("clickedAt");
  });

  test("swallows errors silently and releases lock", async () => {
    globalThis.__mockRedis.lrange.mockImplementationOnce(async () => {
      throw new Error("redis down");
    });

    await expect(flushClickBuffer()).resolves.toBeUndefined();
    expect(globalThis.__mockRedis.del).toHaveBeenCalledWith(
      "clicks:flush:lock",
    );
  });
});
