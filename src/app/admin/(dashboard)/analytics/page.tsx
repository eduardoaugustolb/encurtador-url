import type { Metadata } from "next";
import "server-only";
import { Suspense } from "react";
import { createSSRCaller } from "@/lib/trpc/server";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { StatsCardSkeleton } from "@/components/analytics/stats-card-skeleton";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";

export const metadata: Metadata = {
  title: "Analytics",
};

export const dynamic = "force-dynamic";

function AnalyticsFallback() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border shadow-sm p-4">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
          <ChartSkeleton />
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage() {
  const caller = await createSSRCaller();

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);

  const params = {
    from: from.toISOString(),
    to: to.toISOString(),
  };

  const [summary, clicksData, topLinksData, referrersData] = await Promise.all([
    caller.analytics.summary(params),
    caller.analytics.clicksOverTime(params),
    caller.analytics.topLinks({ ...params, limit: 10 }),
    caller.analytics.topReferrers(params),
  ]);

  return (
    <Suspense fallback={<AnalyticsFallback />}>
      <AnalyticsDashboard
        initialSummary={summary}
        initialClicksData={clicksData}
        initialTopLinksData={topLinksData}
        initialReferrersData={referrersData}
      />
    </Suspense>
  );
}
