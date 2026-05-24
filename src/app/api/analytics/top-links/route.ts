import { z } from "zod";
import { requireAdminWithRateLimit } from "@/lib/auth/require-admin-with-rate-limit";
import { getTopLinks } from "@/lib/db/queries/analytics";

const topLinksSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

export async function GET(req: Request) {
  const auth = await requireAdminWithRateLimit(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const parsed = topLinksSchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const result = await getTopLinks(
    new Date(parsed.data.from),
    new Date(parsed.data.to),
    parsed.data.limit,
  );

  return Response.json(result);
}
