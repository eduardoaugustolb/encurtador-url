import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";

export const dynamic = "force-dynamic";

import { trackClick } from "@/lib/analytics/track";
import { resolveSlug } from "@/lib/redis";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";
import { traceStep } from "@/lib/telemetry";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === "not-found") {
    notFound();
  }

  const hdrs = await headers();

  const ip = hdrs.get("x-forwarded-for") ?? "unknown";
  const rl = await traceStep("rate-limit", () =>
    checkRateLimit({
      windowMs: 60_000,
      max: 100,
      key: rateLimitKey("slug-resolve", ip),
    }),
  );

  if (!rl.allowed) {
    notFound();
  }

  const link = await traceStep("resolve-slug", () => resolveSlug(slug), {
    slug,
  });

  if (!link || !link.isActive) {
    notFound();
  }

  after(() =>
    traceStep("track-click", () =>
      trackClick({
        linkId: link.id,
        referrer: hdrs.get("referer"),
        country: hdrs.get("x-vercel-ip-country"),
        userAgent: hdrs.get("user-agent"),
      }),
    ),
  );

  redirect(link.destinationUrl);
}
