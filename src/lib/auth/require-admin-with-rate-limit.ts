import "server-only";
import { requireAdmin } from "@/lib/auth/require-admin";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";

export async function requireAdminWithRateLimit(
  req: Request,
): Promise<Response | null> {
  const auth = await requireAdmin();
  if (auth) return auth;

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    windowMs: 60_000,
    max: 60,
    key: rateLimitKey("admin-api", ip),
  });

  if (!rl.allowed) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  return null;
}
