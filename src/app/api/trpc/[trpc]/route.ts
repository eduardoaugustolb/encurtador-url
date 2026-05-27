import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/trpc";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => {
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      const sessionToken = req.cookies.get("admin_session")?.value;
      return createContext({ req, sessionToken, ip });
    },
  });

export { handler as GET, handler as POST };
