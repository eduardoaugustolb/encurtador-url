import { z } from "zod";
import { nanoid } from "nanoid";
import { adminProcedure, adminMutationProcedure, createTRPCRouter } from "@/server/trpc";
import {
  createLinkSchema,
  updateLinkSchema,
  validateDestinationUrl,
} from "@/lib/validators/link";
import {
  paginateLinks,
  getLinkById,
  createLink,
  updateLink,
  deleteLink,
} from "@/lib/db/queries/links";
import { recordAudit } from "@/lib/db/queries/audit";
import { invalidateSlug } from "@/lib/redis";
import { TRPCError } from "@trpc/server";

const paginateQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const linksRouter = createTRPCRouter({
  list: adminProcedure
    .input(paginateQuerySchema)
    .query(async ({ input }) => {
      return paginateLinks({ cursor: input.cursor, limit: input.limit });
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const link = await getLinkById(input.id);
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      return link;
    }),

  create: adminMutationProcedure
    .input(createLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const { destinationUrl, title, slug } = input;

      if (!validateDestinationUrl(destinationUrl)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid destination URL",
        });
      }

      const linkSlug = slug ?? nanoid(7);
      const linkId = nanoid();

      const link = await createLink({
        id: linkId,
        slug: linkSlug,
        destinationUrl,
        title: title ?? null,
      });

      await invalidateSlug(linkSlug);

      recordAudit({
        action: "link.create",
        entityType: "link",
        entityId: link.id,
        payload: { destinationUrl, slug: linkSlug, title: title ?? null },
        ip: ctx.ip,
      });

      return link;
    }),

  update: adminMutationProcedure
    .input(updateLinkSchema.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const link = await getLinkById(id);
      if (!link)
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });

      if (data.destinationUrl && !validateDestinationUrl(data.destinationUrl)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid destination URL",
        });
      }

      const updated = await updateLink(id, {
        destinationUrl: data.destinationUrl,
        title: data.title,
        isActive: data.isActive,
      });

      await invalidateSlug(link.slug);

      recordAudit({
        action: "link.update",
        entityType: "link",
        entityId: id,
        payload: {
          before: { destinationUrl: link.destinationUrl, title: link.title },
          after: {
            destinationUrl: data.destinationUrl ?? link.destinationUrl,
            title: data.title ?? link.title,
          },
        },
        ip: ctx.ip,
      });

      return updated;
    }),

  delete: adminMutationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const link = await getLinkById(input.id);
      if (!link)
        throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });

      await invalidateSlug(link.slug);
      await deleteLink(input.id);

      recordAudit({
        action: "link.delete",
        entityType: "link",
        entityId: input.id,
        payload: {
          slug: link.slug,
          destinationUrl: link.destinationUrl,
          title: link.title,
        },
        ip: ctx.ip,
      });

      return { ok: true };
    }),
});
