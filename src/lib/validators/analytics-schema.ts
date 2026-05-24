import { z } from "zod";

const MAX_RANGE_DAYS = 365;

export const analyticsQuerySchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    linkId: z.string().optional(),
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      const diffMs = to.getTime() - from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= MAX_RANGE_DAYS;
    },
    {
      message: `Date range must be between 0 and ${MAX_RANGE_DAYS} days`,
    },
  );

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
