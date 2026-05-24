import type { Metadata } from "next";
import "server-only";
import {
  getAnalyticsSummary,
  getClicksOverTime,
  getTopLinks,
  getTopReferrers,
} from "@/lib/db/queries/analytics";

export const metadata: Metadata = {
  title: "Analytics",
};
import { AnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 7);

  const [summary, clicksData, topLinksData, referrersData] = await Promise.all([
    getAnalyticsSummary(from, to),
    getClicksOverTime(from, to),
    getTopLinks(from, to, 10),
    getTopReferrers(from, to),
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
