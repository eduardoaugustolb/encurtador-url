import { describe, test, expect, beforeEach } from "bun:test";
import { trackClick } from "@/lib/analytics/track";

beforeEach(() => {
  globalThis.__mockDb.insert.mockClear();
});

describe("trackClick", () => {
  test("inserts a click record via drizzle", async () => {
    await trackClick({
      linkId: "link-123",
      referrer: "https://example.com",
      country: "BR",
      userAgent: "Mozilla/5.0",
    });

    expect(globalThis.__mockDb.insert).toHaveBeenCalledTimes(1);

    const insertBuilder = globalThis.__mockDb.insert.mock.results[0].value;
    const [records] = insertBuilder.values.mock.calls[0];

    expect(Array.isArray(records)).toBe(false);
    expect(records).toMatchObject({
      linkId: "link-123",
      referrer: "https://example.com",
      country: "BR",
    });
    expect(typeof records.uaHash).toBe("string");
    expect(records.uaHash).toHaveLength(64);
    expect(records.clickedAt).toBeInstanceOf(Date);
    expect(typeof records.id).toBe("string");
  });

  test("hashes user-agent with SHA-256", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: null,
      userAgent: "Chrome/120",
    });

    const insertBuilder = globalThis.__mockDb.insert.mock.results[0].value;
    const [records] = insertBuilder.values.mock.calls[0];

    expect(records.uaHash).toHaveLength(64);
    expect(records.uaHash).not.toBe("Chrome/120");
  });

  test("sets uaHash to null when no user-agent", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: null,
      userAgent: null,
    });

    const insertBuilder = globalThis.__mockDb.insert.mock.results[0].value;
    const [records] = insertBuilder.values.mock.calls[0];

    expect(records.uaHash).toBeNull();
  });

  test("truncates country to 2 characters", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: "BRA",
      userAgent: null,
    });

    const insertBuilder = globalThis.__mockDb.insert.mock.results[0].value;
    const [records] = insertBuilder.values.mock.calls[0];

    expect(records.country).toBe("BR");
  });

  test("swallows errors silently", async () => {
    const badBuilder = { values: async () => { throw new Error("pg down"); } };
    globalThis.__mockDb.insert.mockImplementationOnce(
      () => badBuilder,
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
