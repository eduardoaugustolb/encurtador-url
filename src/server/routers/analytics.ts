import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/trpc";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import { analyticsService } from "@/lib/services";

export const analyticsRouter = createTRPCRouter({
  summary: adminProcedure
    .input(analyticsQuerySchema)
    .query(async ({ input }) =>
      analyticsService.summary(new Date(input.from), new Date(input.to), input.linkId),
    ),

  clicksOverTime: adminProcedure
    .input(analyticsQuerySchema)
    .query(async ({ input }) =>
      analyticsService.clicksOverTime(new Date(input.from), new Date(input.to), input.linkId),
    ),

  topLinks: adminProcedure
    .input(
      analyticsQuerySchema.extend({
        limit: z.coerce.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ input }) =>
      analyticsService.topLinks(new Date(input.from), new Date(input.to), input.limit),
    ),

  topReferrers: adminProcedure
    .input(analyticsQuerySchema)
    .query(async ({ input }) =>
      analyticsService.topReferrers(new Date(input.from), new Date(input.to), input.linkId),
    ),

  export: adminProcedure.input(analyticsQuerySchema).query(async ({ input }) =>
    analyticsService.export(new Date(input.from), new Date(input.to), input.linkId),
  ),
});
