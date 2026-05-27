import { createCallerFactory, createTRPCRouter } from "@/server/trpc";
import { authRouter } from "./auth";
import { linksRouter } from "./links";
import { analyticsRouter } from "./analytics";
import { cacheRouter } from "./cache";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  links: linksRouter,
  analytics: analyticsRouter,
  cache: cacheRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
