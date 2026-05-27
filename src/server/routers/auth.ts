import { cookies } from "next/headers";
import { z } from "zod";
import { sessionCookieOptions } from "@/lib/auth/session";
import { authService } from "@/lib/services";
import { publicProcedure, createTRPCRouter } from "@/server/trpc";

const loginSchema = z.object({ password: z.string().min(1) });

export const authRouter = createTRPCRouter({
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const token = await authService.login(input.password, ctx.ip);

    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions().name, token, sessionCookieOptions());

    return { ok: true };
  }),
});
