import type { Metadata } from "next";
import "server-only";
import { createSSRCaller } from "@/lib/trpc/server";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const metadata: Metadata = {
  title: "Analytics",
};

export const dynamic = "force-dynamic";

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
    <AnalyticsDashboard
      initialSummary={summary}
      initialClicksData={clicksData}
      initialTopLinksData={topLinksData}
      initialReferrersData={referrersData}
    />
  );
}
