import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { sessionCookieOptions, signSession } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";
import { TRPCError } from "@trpc/server";
import { publicProcedure, createTRPCRouter } from "@/server/trpc";

const loginSchema = z.object({ password: z.string().min(1) });

export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const rl = await checkRateLimit({
      windowMs: 60_000,
      max: 5,
      key: rateLimitKey("login", ctx.ip),
    });
    if (!rl.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many attempts. Try again later.",
      });
    }

    const a = Buffer.from(input.password);
    const b = Buffer.from(env.ADMIN_PASSWORD);
    const match = a.length === b.length && timingSafeEqual(a, b);

    if (!match) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid password" });
    }

    const token = await signSession();
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions().name, token, sessionCookieOptions());

    return { ok: true };
  }),
});
