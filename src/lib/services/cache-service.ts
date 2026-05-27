import "server-only";
import { clearSlugCache } from "@/lib/redis/cache";
import { InternalError } from "@/lib/errors";

export class CacheService {
  async wipe() {
    try {
      const deleted = await clearSlugCache();
      return { ok: true as const, deletedKeys: deleted };
    } catch {
      throw new InternalError("Cache wipe failed");
    }
  }
}

export const cacheService = new CacheService();
