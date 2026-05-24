import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flushClickBuffer } from "@/lib/analytics/flush-clicks";

beforeEach(() => {
  globalThis.__mockRedis.lrange.mockClear();
  globalThis.__mockRedis.del.mockClear();
  globalThis.__mockDb.insert.mockClear();
});

describe("flushClickBuffer", () => {
  test("does nothing when buffer is empty", async () => {
    globalThis.__mockRedis.lrange.mockImplementationOnce(
      async () => [],
    );

    await flushClickBuffer();

    expect(globalThis.__mockDb.insert).not.toHaveBeenCalled();
    expect(globalThis.__mockRedis.del).not.toHaveBeenCalled();
  });

  test("batch inserts buffered clicks then clears buffer", async () => {
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

    globalThis.__mockRedis.lrange.mockImplementationOnce(
      async () => buffered,
    );

    await flushClickBuffer();

    expect(globalThis.__mockRedis.lrange).toHaveBeenCalledWith("clicks:buffer", 0, -1);
    expect(globalThis.__mockDb.insert).toHaveBeenCalledTimes(1);
    expect(globalThis.__mockRedis.del).toHaveBeenCalledWith("clicks:buffer");
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

    globalThis.__mockRedis.lrange.mockImplementationOnce(
      async () => buffered,
    );

    const insertBuilder = { values: mock(() => Promise.resolve([])) };
    globalThis.__mockDb.insert.mockImplementationOnce(
      () => insertBuilder,
    );

    await flushClickBuffer();

    const records = insertBuilder.values.mock.calls[0][0] as Array<Record<string, unknown>>;
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

  test("swallows errors silently", async () => {
    globalThis.__mockRedis.lrange.mockImplementationOnce(
      async () => { throw new Error("redis down"); },
    );

    await expect(flushClickBuffer()).resolves.toBeUndefined();
  });
});
