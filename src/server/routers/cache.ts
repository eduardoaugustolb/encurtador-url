import { adminProcedure, createTRPCRouter } from "@/server/trpc";
import { clearSlugCache } from "@/lib/redis/cache";
import { TRPCError } from "@trpc/server";

export const cacheRouter = createTRPCRouter({
  wipe: adminProcedure.mutation(async () => {
    try {
      const deleted = await clearSlugCache();
      return { ok: true, deletedKeys: deleted };
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Cache wipe failed",
      });
    }
  }),
});
