import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/server/trpc";
import { analyticsQuerySchema } from "@/lib/validators/analytics";
import {
  getAnalyticsSummary,
  getClicksOverTime,
  getTopLinks,
  getTopReferrers,
} from "@/lib/db/queries/analytics";

export const analyticsRouter = createTRPCRouter({
  summary: adminProcedure
    .input(analyticsQuerySchema)
    .query(async ({ input }) => {
      return getAnalyticsSummary(
        new Date(input.from),
        new Date(input.to),
        input.linkId,
      );
    }),

  clicksOverTime: adminProcedure
    .input(analyticsQuerySchema)
    .query(async ({ input }) => {
      return getClicksOverTime(
        new Date(input.from),
        new Date(input.to),
        input.linkId,
      );
    }),

  topLinks: adminProcedure
    .input(
      analyticsQuerySchema.extend({
        limit: z.coerce.number().min(1).max(50).optional().default(10),
      }),
    )
    .query(async ({ input }) => {
      return getTopLinks(new Date(input.from), new Date(input.to), input.limit);
    }),

  topReferrers: adminProcedure
    .input(analyticsQuerySchema)
    .query(async ({ input }) => {
      return getTopReferrers(
        new Date(input.from),
        new Date(input.to),
        input.linkId,
      );
    }),

  export: adminProcedure.input(analyticsQuerySchema).query(async ({ input }) => {
    const clicks = await getClicksOverTime(
      new Date(input.from),
      new Date(input.to),
      input.linkId,
    );
    const summary = await getAnalyticsSummary(
      new Date(input.from),
      new Date(input.to),
      input.linkId,
    );
    return { summary, clicks };
  }),
});
