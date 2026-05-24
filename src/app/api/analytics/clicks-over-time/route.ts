import { requireAdminWithRateLimit } from "@/lib/auth/require-admin-with-rate-limit";
import { getClicksOverTime } from "@/lib/db/queries/analytics";
import { analyticsQuerySchema } from "@/lib/validators/analytics";

export async function GET(req: Request) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const parsed = analyticsQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    linkId: url.searchParams.get("linkId") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const result = await getClicksOverTime(
    new Date(parsed.data.from),
    new Date(parsed.data.to),
    parsed.data.linkId,
  );

  return Response.json(result);
}
