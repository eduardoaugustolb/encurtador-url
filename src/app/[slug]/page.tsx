import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { trackClick } from "@/lib/analytics/track";
import { resolveSlug } from "@/lib/redis";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";

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
  const rl = await checkRateLimit({
    windowMs: 60_000,
    max: 100,
    key: rateLimitKey("slug-resolve", ip),
  });

  if (!rl.allowed) {
    notFound();
  }

  const link = await resolveSlug(slug);

  if (!link || !link.isActive) {
    notFound();
  }

  trackClick({
    linkId: link.id,
    referrer: hdrs.get("referer"),
    country: hdrs.get("x-vercel-ip-country"),
    userAgent: hdrs.get("user-agent"),
  });

  redirect(link.destinationUrl);
}
