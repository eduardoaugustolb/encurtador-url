import { requireAdminWithRateLimit } from "@/lib/auth/require-admin-with-rate-limit";
import { validateOrigin } from "@/lib/auth/validate-origin";
import { recordAudit } from "@/lib/db/queries/audit";
import { deleteLink, getLinkById, updateLink } from "@/lib/db/queries/links";
import { invalidateSlug } from "@/lib/redis";
import {
  updateLinkSchema,
  validateDestinationUrl,
} from "@/lib/validators/link";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  if (!validateOrigin(req)) {
    return Response.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateLinkSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const link = await getLinkById(id);
  if (!link) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  if (
    parsed.data.destinationUrl &&
    !validateDestinationUrl(parsed.data.destinationUrl)
  ) {
    return Response.json({ error: "Invalid destination URL" }, { status: 400 });
  }

  const updated = await updateLink(id, {
    destinationUrl: parsed.data.destinationUrl,
    title: parsed.data.title,
    isActive: parsed.data.isActive,
  });

  await invalidateSlug(link.slug);

  recordAudit({
    action: "link.update",
    entityType: "link",
    entityId: id,
    payload: {
      before: {
        destinationUrl: link.destinationUrl,
        title: link.title,
      },
      after: {
        destinationUrl: parsed.data.destinationUrl ?? link.destinationUrl,
        title: parsed.data.title ?? link.title,
      },
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return Response.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  if (!validateOrigin(req)) {
    return Response.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const { id } = await params;

  const link = await getLinkById(id);
  if (!link) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  await invalidateSlug(link.slug);
  await deleteLink(id);

  recordAudit({
    action: "link.delete",
    entityType: "link",
    entityId: id,
    payload: {
      slug: link.slug,
      destinationUrl: link.destinationUrl,
      title: link.title,
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
  });

  return new Response(null, { status: 204 });
}
