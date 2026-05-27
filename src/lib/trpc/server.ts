import "server-only";
import { headers } from "next/headers";
import { createCaller } from "@/server/routers/_app";

export async function createSSRCaller() {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? "unknown";
  const sessionToken = hdrs
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("admin_session="))
    ?.split("=")[1]
    ?.trim();

  return createCaller({ req: null, sessionToken, ip });
}
