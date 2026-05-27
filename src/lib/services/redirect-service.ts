import "server-only";
import { resolveSlug } from "@/lib/redis";
import { trackClick } from "@/lib/analytics/track";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";
import { traceStep } from "@/lib/telemetry";
import { TooManyRequestsError } from "@/lib/errors";

export interface ResolveResult {
  link: { id: string; destinationUrl: string; isActive: boolean };
  tracking: {
    linkId: string;
    referrer: string | null;
    country: string | null;
    userAgent: string | null;
  };
}

export class RedirectService {
  async resolve(slug: string, ip: string, headers: {
    referer: string | null;
    country: string | null;
    userAgent: string | null;
  }): Promise<ResolveResult> {
    const [rl, link] = await Promise.all([
      traceStep("rate-limit", () =>
        checkRateLimit({
          windowMs: 60_000,
          max: 100,
          key: rateLimitKey("slug-resolve", ip),
        }),
      ),
      traceStep("resolve-slug", () => resolveSlug(slug), { slug }),
    ]);

    if (!rl.allowed) {
      throw new TooManyRequestsError("Rate limit exceeded");
    }

    if (!link || !link.isActive) {
      throw new TooManyRequestsError("Link not found");
    }

    return {
      link,
      tracking: {
        linkId: link.id,
        referrer: headers.referer,
        country: headers.country,
        userAgent: headers.userAgent,
      },
    };
  }

  async trackClick(data: {
    linkId: string;
    referrer: string | null;
    country: string | null;
    userAgent: string | null;
  }) {
    await trackClick(data);
  }
}

export const redirectService = new RedirectService();
