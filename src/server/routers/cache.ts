import { adminProcedure, createTRPCRouter } from "@/server/trpc";
import { cacheService } from "@/lib/services";

export const cacheRouter = createTRPCRouter({
  wipe: adminProcedure.mutation(async () => cacheService.wipe()),
});
