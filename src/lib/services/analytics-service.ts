import "server-only";
import type { IClickRepository } from "@/lib/repositories";
import { clickRepository } from "@/lib/repositories";
import { flushClickBuffer } from "@/lib/analytics/flush-clicks";

export class AnalyticsService {
  constructor(private clickRepo: IClickRepository) {}

  async summary(from: Date, to: Date, linkId?: string) {
    await flushClickBuffer();
    return this.clickRepo.getSummary(from, to, linkId);
  }

  async clicksOverTime(from: Date, to: Date, linkId?: string) {
    await flushClickBuffer();
    return this.clickRepo.getClicksOverTime(from, to, linkId);
  }

  async topLinks(from: Date, to: Date, limit?: number) {
    await flushClickBuffer();
    return this.clickRepo.getTopLinks(from, to, limit);
  }

  async topReferrers(from: Date, to: Date, linkId?: string) {
    await flushClickBuffer();
    return this.clickRepo.getTopReferrers(from, to, linkId);
  }

  async export(from: Date, to: Date, linkId?: string) {
    await flushClickBuffer();
    const [clicks, summary] = await Promise.all([
      this.clickRepo.getClicksOverTime(from, to, linkId),
      this.clickRepo.getSummary(from, to, linkId),
    ]);
    return { summary, clicks };
  }
}

export const analyticsService = new AnalyticsService(clickRepository);
