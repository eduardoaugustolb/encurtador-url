import { describe, test, expect, beforeEach } from "bun:test";
import { resolveSlug } from "@/lib/redis";

beforeEach(() => {
  globalThis.__mockRedis.get.mockClear();
  globalThis.__mockRedis.setex.mockClear();
  globalThis.__mockDb.query.links.findFirst.mockClear();
});

describe("resolveSlug", () => {
  test("returns cached link from Redis", async () => {
    const cached = JSON.stringify({
      id: "link-1",
      destinationUrl: "https://example.com",
      isActive: true,
    });

    globalThis.__mockRedis.get.mockImplementationOnce(async () => cached);

    const result = await resolveSlug("github");

    expect(result).toEqual({
      id: "link-1",
      destinationUrl: "https://example.com",
      isActive: true,
    });
    expect(globalThis.__mockDb.query.links.findFirst).not.toHaveBeenCalled();
  });

  test("falls back to database and caches result", async () => {
    globalThis.__mockRedis.get.mockImplementationOnce(async () => null);

    const dbLink = {
      id: "link-2",
      destinationUrl: "https://github.com",
      isActive: true,
    };
    globalThis.__mockDb.query.links.findFirst.mockImplementationOnce(
      async () => dbLink,
    );

    const result = await resolveSlug("github");

    expect(result).toEqual(dbLink);
    expect(globalThis.__mockDb.query.links.findFirst).toHaveBeenCalledTimes(1);
    expect(globalThis.__mockRedis.setex).toHaveBeenCalledWith(
      "slug:github",
      86400,
      JSON.stringify(dbLink),
    );
  });

  test("returns null when slug not found in Redis or database", async () => {
    globalThis.__mockRedis.get.mockImplementationOnce(async () => null);
    globalThis.__mockDb.query.links.findFirst.mockImplementationOnce(
      async () => null,
    );

    const result = await resolveSlug("nonexistent");

    expect(result).toBeNull();
    expect(globalThis.__mockRedis.setex).not.toHaveBeenCalled();
  });

  test("returns link even when inactive (caller decides)", async () => {
    globalThis.__mockRedis.get.mockImplementationOnce(async () => null);

    const inactiveLink = {
      id: "link-3",
      destinationUrl: "https://old-site.com",
      isActive: false,
    };
    globalThis.__mockDb.query.links.findFirst.mockImplementationOnce(
      async () => inactiveLink,
    );

    const result = await resolveSlug("disabled");

    expect(result).toEqual(inactiveLink);
    expect(globalThis.__mockRedis.setex).toHaveBeenCalled();
  });
});
