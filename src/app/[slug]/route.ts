import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";

export const dynamic = "force-dynamic";

import { createAudit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { redirectService } from "@/lib/services";

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

  try {
    const result = await redirectService.resolve(slug, ip, {
      referer: hdrs.get("referer"),
      country: hdrs.get("x-vercel-ip-country"),
      userAgent: hdrs.get("user-agent"),
    });

    audit("after.register", {
      linkId: result.link.id,
      destination: result.link.destinationUrl,
    });

    after(async () => {
      audit("after.executed");
      const t0 = performance.now();
      try {
        await redirectService.trackClick(result.tracking);
        audit("track-click.completed", { durationMs: performance.now() - t0 });
      } catch (err) {
        audit("track-click.error", {
          error: (err as Error).message,
          stack: (err as Error).stack,
        });
      }
    });

    audit("request.redirect", { destination: result.link.destinationUrl });
    return Response.redirect(result.link.destinationUrl, 307);
  } catch (err) {
    if (err instanceof DomainError) {
      audit("service.error", { code: err.code, message: err.message });
    } else {
      audit("service.error", { message: (err as Error).message });
    }
    notFound();
  }
}
