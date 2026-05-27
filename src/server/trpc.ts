import { initTRPC, TRPCError } from "@trpc/server";
import type { NextRequest } from "next/server";
import superjson from "superjson";
import { verifySession } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";

interface CreateContextOptions {
  req: NextRequest | null;
  sessionToken: string | undefined;
  ip: string;
}

export async function createContext(opts: CreateContextOptions) {
  return opts;
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const requireAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.sessionToken) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const verified = await verifySession(ctx.sessionToken);
  if (!verified) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, admin: true } });
});

const rateLimit = t.middleware(async ({ ctx, next }) => {
  const rl = await checkRateLimit({
    windowMs: 60_000,
    max: 60,
    key: rateLimitKey("admin-api", ctx.ip),
  });
  if (!rl.allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
  }
  return next({ ctx });
});

const csrfProtection = t.middleware(({ ctx, next }) => {
  if (ctx.req) {
    const origin =
      ctx.req.headers.get("origin") ?? ctx.req.headers.get("referer");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (origin && appUrl && !origin.startsWith(appUrl)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "CSRF validation failed",
      });
    }
  }
  return next({ ctx });
});

export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(requireAdmin).use(rateLimit);
export const adminMutationProcedure = t.procedure
  .use(requireAdmin)
  .use(rateLimit)
  .use(csrfProtection);
