import "server-only";
import { env } from "@/env";

export function validateOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  if (!origin && !referer) return true;

  const source = origin ?? referer ?? "";
  try {
    const url = new URL(source);
    const allowed = new URL(appUrl);
    return url.origin === allowed.origin;
  } catch {
    return false;
  }
}
