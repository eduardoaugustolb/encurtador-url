import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { signSession } from "@/lib/auth/session";
import { checkRateLimit, rateLimitKey } from "@/lib/redis/rate-limit";
import { UnauthorizedError, TooManyRequestsError } from "@/lib/errors";

export class AuthService {
  async login(password: string, ip: string) {
    const rl = await checkRateLimit({
      windowMs: 60_000,
      max: 5,
      key: rateLimitKey("login", ip),
    });

    if (!rl.allowed) {
      throw new TooManyRequestsError("Too many attempts. Try again later.");
    }

    const a = Buffer.from(password);
    const b = Buffer.from(env.ADMIN_PASSWORD);
    const match = a.length === b.length && timingSafeEqual(a, b);

    if (!match) {
      throw new UnauthorizedError("Invalid password");
    }

    const token = await signSession();
    return token;
  }
}

export const authService = new AuthService();
