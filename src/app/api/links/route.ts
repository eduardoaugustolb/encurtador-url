import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdminWithRateLimit } from "@/lib/auth/require-admin-with-rate-limit";
import { validateOrigin } from "@/lib/auth/validate-origin";
import { recordAudit } from "@/lib/db/queries/audit";
import { createLink, paginateLinks } from "@/lib/db/queries/links";
import { invalidateSlug } from "@/lib/redis";
import {
  createLinkSchema,
  validateDestinationUrl,
} from "@/lib/validators/link";

const paginateQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export async function GET(req: Request) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const parsed = paginateQuerySchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const result = await paginateLinks({
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  });

  return Response.json(result);
}

export async function POST(req: Request) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  if (!validateOrigin(req)) {
    return Response.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createLinkSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { destinationUrl, title, slug } = parsed.data;

  if (!validateDestinationUrl(destinationUrl)) {
    return Response.json({ error: "Invalid destination URL" }, { status: 400 });
  }

  const linkSlug = slug ?? nanoid(7);
  const linkId = nanoid();

  const link = await createLink({
    id: linkId,
    slug: linkSlug,
    destinationUrl,
    title: title ?? null,
  });

  await invalidateSlug(linkSlug);

  recordAudit({
    action: "link.create",
    entityType: "link",
    entityId: link.id,
    payload: { destinationUrl, slug: linkSlug, title: title ?? null },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return Response.json(link, { status: 201 });
}
