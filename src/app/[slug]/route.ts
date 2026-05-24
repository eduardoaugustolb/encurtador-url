import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";

export const dynamic = "force-dynamic";

import { trackClick } from "@/lib/analytics/track";
import { resolveSlug } from "@/lib/redis";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";
import { traceStep } from "@/lib/telemetry";
import { createAudit } from "@/lib/audit";

let getCallSeq = 0;
let moduleInit = Date.now();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const callSeq = ++getCallSeq;
  const { requestId, audit } = createAudit();
  audit("request.start", {
    slug,
    callSeq,
    moduleInit,
    url: _req.url,
    method: _req.method,
    cache: (_req as any).cf?.cache,
    headers: Object.fromEntries(_req.headers.entries()),
  });

  if (slug === "not-found") {
    audit("not-found.early");
    notFound();
  }

  const hdrs = await headers();

  const ip = hdrs.get("x-forwarded-for") ?? "unknown";
  audit("headers.read", {
    ip,
    referer: hdrs.get("referer"),
    ua: hdrs.get("user-agent"),
    country: hdrs.get("x-vercel-ip-country"),
    allHeaders: Object.fromEntries(hdrs.entries()),
  });

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
    audit("rate-limit.blocked");
    notFound();
  }

  if (!link || !link.isActive) {
    audit("link.not-found", { linkFound: !!link, isActive: link?.isActive });
    notFound();
  }

  audit("after.register", { linkId: link.id, destination: link.destinationUrl });

  after(async () => {
    audit("after.executed");
    const t0 = performance.now();
    try {
      await traceStep("track-click", () =>
        trackClick({
          linkId: link.id,
          referrer: hdrs.get("referer"),
          country: hdrs.get("x-vercel-ip-country"),
          userAgent: hdrs.get("user-agent"),
        }),
      );
      audit("track-click.completed", { durationMs: performance.now() - t0 });
    } catch (err) {
      audit("track-click.error", {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
    }
  });

  audit("request.redirect", { destination: link.destinationUrl });
  return Response.redirect(link.destinationUrl, 307);
}
