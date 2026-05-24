import { requireAdmin } from "@/lib/auth/require-admin";
import { clearSlugCache } from "@/lib/redis/cache";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  try {
    const deleted = await clearSlugCache();

    return Response.json({ ok: true, deletedKeys: deleted });
  } catch (err) {
    return Response.json(
      { error: "Cache wipe failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}
