import { z } from "zod";
import {
  adminProcedure,
  adminMutationProcedure,
  publicProcedure,
  createTRPCRouter,
} from "@/server/trpc";
import { createLinkSchema, updateLinkSchema } from "@/lib/validators/link";
import { linkService } from "@/lib/services";

const paginateQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const linksRouter = createTRPCRouter({
  getHomeLinksPaginated: publicProcedure
    .input(paginateQuerySchema)
    .query(async ({ input }) =>
      linkService.getHomeLinksPaginated(input.cursor, input.limit),
    ),

  list: adminProcedure
    .input(paginateQuerySchema)
    .query(async ({ input }) => linkService.list(input.cursor, input.limit)),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => linkService.getById(input.id)),

  create: adminMutationProcedure
    .input(createLinkSchema)
    .mutation(async ({ ctx, input }) => linkService.create(input, ctx.ip)),

  update: adminMutationProcedure
    .input(updateLinkSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return linkService.update(id, data, ctx.ip);
    }),

  reorder: adminMutationProcedure
    .input(
      z.object({
        items: z.array(
          z.object({ id: z.string(), position: z.number() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => linkService.reorder(input.items, ctx.ip)),

  delete: adminMutationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => linkService.delete(input.id, ctx.ip)),
});
