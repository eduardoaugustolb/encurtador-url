import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { sessionCookieOptions, signSession } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";

const loginSchema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = await checkRateLimit({
    windowMs: 60_000,
    max: 5,
    key: rateLimitKey("login", ip),
  });

  if (!rl.allowed) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const a = Buffer.from(parsed.data.password);
  const b = Buffer.from(env.ADMIN_PASSWORD);

  const match = a.length === b.length && timingSafeEqual(a, b);

  if (!match) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await signSession();
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions().name, token, sessionCookieOptions());

  return Response.json({ ok: true });
}
