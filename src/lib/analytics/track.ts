import "server-only";
import { createHash } from "node:crypto";
import { redis } from "@/lib/redis";

interface TrackClickInput {
  linkId: string;
  referrer: string | null;
  country: string | null;
  userAgent: string | null;
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

const BUFFER_KEY = "clicks:buffer";
const MAX_BUFFER = 5_000;

const DEDUP_TTL = 10;

export async function trackClick(input: TrackClickInput): Promise<void> {
  try {
    const uaHash = input.userAgent ? sha256hex(input.userAgent) : null;

    const entry = JSON.stringify({
      linkId: input.linkId,
      clickedAt: new Date().toISOString(),
      referrer: input.referrer,
      country: input.country?.slice(0, 2) ?? null,
      uaHash,
    });

    const dedupKey = `dedup:click:${input.linkId}`;
    const ok = await redis.set(dedupKey, "1", "EX", DEDUP_TTL, "NX");
    if (!ok) return;

    await redis.pipeline().lpush(BUFFER_KEY, entry).ltrim(BUFFER_KEY, 0, MAX_BUFFER - 1).exec();
  } catch {
    // intentionally swallowed — tracking MUST NOT affect redirect
  }
}
