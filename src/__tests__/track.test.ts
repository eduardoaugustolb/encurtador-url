import { describe, test, expect, beforeEach } from "bun:test";
import { trackClick } from "@/lib/analytics/track";
import type { MockRedisPipeline } from "./mocks";
import { createMockPipeline } from "./mocks";

function getPipeline(): MockRedisPipeline {
  return globalThis.__mockRedis.pipeline.mock.results[0].value;
}

beforeEach(() => {
  globalThis.__mockRedis.pipeline.mockClear();
});

describe("trackClick", () => {
  test("pushes serialized entry via pipeline", async () => {
    await trackClick({
      linkId: "link-123",
      referrer: "https://example.com",
      country: "BR",
      userAgent: "Mozilla/5.0",
    });

    expect(globalThis.__mockRedis.pipeline).toHaveBeenCalledTimes(1);

    const p = getPipeline();
    expect(p.lpush).toHaveBeenCalledTimes(1);
    expect(p.ltrim).toHaveBeenCalledTimes(1);
    expect(p.exec).toHaveBeenCalledTimes(1);

    const [key, entry] = p.lpush.mock.calls[0];
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

    const [, entry] = getPipeline().lpush.mock.calls[0];
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

    const [, entry] = getPipeline().lpush.mock.calls[0];
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

    const [, entry] = getPipeline().lpush.mock.calls[0];
    const parsed = JSON.parse(entry);
    expect(parsed.country).toBe("BR");
  });

  test("caps buffer at MAX_BUFFER entries via ltrim", async () => {
    await trackClick({
      linkId: "link-1",
      referrer: null,
      country: null,
      userAgent: null,
    });

    expect(getPipeline().ltrim).toHaveBeenCalledWith("clicks:buffer", 0, 4999);
  });

  test("swallows errors silently", async () => {
    const badPipeline = createMockPipeline();
    badPipeline.exec.mockImplementationOnce(async () => {
      throw new Error("redis down");
    });
    globalThis.__mockRedis.pipeline.mockImplementationOnce(() => badPipeline);

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
