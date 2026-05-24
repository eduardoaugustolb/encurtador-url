import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/env";

const secret = new TextEncoder().encode(env.ADMIN_SECRET);
const COOKIE_NAME = "admin_session";
const EXPIRY = "7d";

export async function signSession(): Promise<string> {
  return new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(secret);
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function sessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}
