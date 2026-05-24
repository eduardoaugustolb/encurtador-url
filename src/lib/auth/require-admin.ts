import "server-only";
import { cookies } from "next/headers";
import { getCookieName, verifySession } from "./session";

export async function requireAdmin(): Promise<Response | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;

  if (!token || !(await verifySession(token))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
