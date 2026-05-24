import "server-only";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { clicks } from "@/lib/db/schema";

interface TrackClickInput {
  linkId: string;
  referrer: string | null;
  country: string | null;
  userAgent: string | null;
}

function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function trackClick(input: TrackClickInput): Promise<void> {
  try {
    const uaHash = input.userAgent ? sha256hex(input.userAgent) : null;

    await db.insert(clicks).values({
      id: nanoid(),
      linkId: input.linkId,
      clickedAt: new Date(),
      referrer: input.referrer,
      country: input.country?.slice(0, 2) ?? null,
      uaHash,
    });
  } catch {
    // intentionally swallowed — tracking MUST NOT affect redirect
  }
}
