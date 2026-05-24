import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get("admin_session")?.value;

  if (!token || !(await verifySession(token))) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
