import "server-only";
import { nanoid } from "nanoid";
import type { ILinkRepository, IAuditRepository } from "@/lib/repositories";
import { linkRepository, auditRepository } from "@/lib/repositories";
import { invalidateSlug } from "@/lib/redis";
import { validateDestinationUrl } from "@/lib/validators/link";
import { NotFoundError, BadRequestError } from "@/lib/errors";
import type { CreateLinkInput, UpdateLinkInput } from "@/lib/validators/link";

type Link = Awaited<ReturnType<ILinkRepository["findById"]>>;

export class LinkService {
  constructor(
    private linkRepo: ILinkRepository,
    private auditRepo: IAuditRepository,
    private invalidateSlugFn: (slug: string) => Promise<void>,
  ) {}

  async list(cursor?: string, limit?: number) {
    return this.linkRepo.paginate(cursor, limit);
  }

  async getById(id: string) {
    const link = await this.linkRepo.findById(id);
    if (!link) throw new NotFoundError("Link not found");
    return link;
  }

  async create(input: CreateLinkInput, ip: string) {
    const { destinationUrl, title, slug } = input;

    if (!validateDestinationUrl(destinationUrl)) {
      throw new BadRequestError("Invalid destination URL");
    }

    const linkSlug = slug ?? nanoid(7);
    const linkId = nanoid();

    const link = await this.linkRepo.create({
      id: linkId,
      slug: linkSlug,
      destinationUrl,
      title: title ?? null,
    });

    await this.invalidateSlugFn(linkSlug);

    this.auditRepo.record({
      action: "link.create",
      entityType: "link",
      entityId: link.id,
      payload: { destinationUrl, slug: linkSlug, title: title ?? null },
      ip,
    });

    return link;
  }

  async update(id: string, input: UpdateLinkInput, ip: string) {
    const link = await this.linkRepo.findById(id);
    if (!link) throw new NotFoundError("Link not found");

    if (input.destinationUrl && !validateDestinationUrl(input.destinationUrl)) {
      throw new BadRequestError("Invalid destination URL");
    }

    const updated = await this.linkRepo.update(id, {
      destinationUrl: input.destinationUrl,
      title: input.title,
      isActive: input.isActive,
    });

    await this.invalidateSlugFn(link.slug);

    this.auditRepo.record({
      action: "link.update",
      entityType: "link",
      entityId: id,
      payload: {
        before: { destinationUrl: link.destinationUrl, title: link.title },
        after: {
          destinationUrl: input.destinationUrl ?? link.destinationUrl,
          title: input.title ?? link.title,
        },
      },
      ip,
    });

    return updated;
  }

  async delete(id: string, ip: string) {
    const link = await this.linkRepo.findById(id);
    if (!link) throw new NotFoundError("Link not found");

    await this.invalidateSlugFn(link.slug);
    await this.linkRepo.delete(id);

    this.auditRepo.record({
      action: "link.delete",
      entityType: "link",
      entityId: id,
      payload: {
        slug: link.slug,
        destinationUrl: link.destinationUrl,
        title: link.title,
      },
      ip,
    });

    return { ok: true as const };
  }
}

export const linkService = new LinkService(linkRepository, auditRepository, invalidateSlug);
