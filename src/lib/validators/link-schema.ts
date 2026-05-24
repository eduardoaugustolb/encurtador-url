import { z } from "zod";

export const createLinkSchema = z.object({
  destinationUrl: z.string().url(),
  title: z.string().max(200).optional(),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,50}$/)
    .optional(),
});

export const updateLinkSchema = z.object({
  destinationUrl: z.string().url().optional(),
  title: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
