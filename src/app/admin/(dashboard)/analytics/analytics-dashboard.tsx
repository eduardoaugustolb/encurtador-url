"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { toast } from "sonner";
import { api } from "@/lib/trpc/react";
import type { DateRangePreset } from "@/components/analytics/date-range-filter";
import { DateRangeFilter } from "@/components/analytics/date-range-filter";
import { StatsCard } from "@/components/analytics/stats-card";
import { StatsCardSkeleton } from "@/components/analytics/stats-card-skeleton";
import { Button } from "@/components/ui/button";
import { ClicksOverTimeChart } from "@/components/charts/clicks-over-time";
import { TopLinksChart } from "@/components/charts/top-links";
import { TopReferrersChart } from "@/components/charts/top-referrers";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";

gsap.registerPlugin(useGSAP);

interface Props {
  initialSummary: {
    totalClicks: number;
    peakDay: string | null;
    peakDayClicks: number;
  };
  initialClicksData: { date: string; clicks: number }[];
  initialTopLinksData: { linkId: string; slug: string; title: string | null; clicks: number }[];
  initialReferrersData: { hostname: string; clicks: number }[];
}

function dateRange(preset: DateRangePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (preset === "7d") from.setDate(to.getDate() - 7);
  else if (preset === "30d") from.setDate(to.getDate() - 30);
  else if (preset === "90d") from.setDate(to.getDate() - 90);
  return { from, to };
}

export function AnalyticsDashboard({
  initialSummary,
  initialClicksData,
  initialTopLinksData,
  initialReferrersData,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const clicksChartRef = useRef<HTMLElement>(null);
  const topLinksChartRef = useRef<HTMLElement>(null);
  const referrersChartRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(
        headerRef.current,
        { opacity: 0, y: -12, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
      );
      tl.fromTo(
        filterRef.current,
        { opacity: 0, y: -12, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.35, ease: "power2.out" },
      );
      tl.fromTo(
        statsRef.current,
        { opacity: 0, y: 16, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
      );
      tl.fromTo(
        clicksChartRef.current,
        { opacity: 0, y: 16, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
      );
      tl.fromTo(
        topLinksChartRef.current,
        { opacity: 0, y: 16, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
      );
      tl.fromTo(
        referrersChartRef.current,
        { opacity: 0, y: 16, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out" },
      );
    },
    { scope: container },
  );

  const [preset, setPreset] = useState<DateRangePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range =
    customFrom && customTo
      ? { from: new Date(customFrom), to: new Date(customTo) }
      : dateRange(preset);

  const params = {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  const summaryQuery = api.analytics.summary.useQuery(params);
  const clicksQuery = api.analytics.clicksOverTime.useQuery(params);
  const topLinksQuery = api.analytics.topLinks.useQuery({ ...params, limit: 10 });
  const referrersQuery = api.analytics.topReferrers.useQuery(params);

  const summaryData = summaryQuery.data ?? initialSummary;
  const clicksData = clicksQuery.data ?? initialClicksData;
  const topLinksData = topLinksQuery.data ?? initialTopLinksData;
  const referrersData = referrersQuery.data ?? initialReferrersData;

  const isRefreshing =
    summaryQuery.isFetching &&
    !summaryQuery.isLoading &&
    summaryQuery.data !== undefined;

  const cacheWipeMutation = api.cache.wipe.useMutation({
    onSuccess: () => {
      toast.success("Cache cleared successfully");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  async function handleCacheWipe() {
    try {
      await cacheWipeMutation.mutateAsync();
      summaryQuery.refetch();
      clicksQuery.refetch();
      topLinksQuery.refetch();
      referrersQuery.refetch();
    } catch {
      // error handled by mutation onError
    }
  }

  function handlePresetChange(p: DateRangePreset) {
    setPreset(p);
    setCustomFrom("");
    setCustomTo("");
  }

  function handleCustomRange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    setPreset("custom");
  }

  return (
    <ErrorBoundary>
      <div ref={container} className="space-y-6">
        <div ref={headerRef} className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-balance">Analytics</h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isRefreshing}
              onClick={() => {
                summaryQuery.refetch();
                clicksQuery.refetch();
                topLinksQuery.refetch();
                referrersQuery.refetch();
              }}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cacheWipeMutation.isPending}
              onClick={handleCacheWipe}
            >
              {cacheWipeMutation.isPending ? "Clearing..." : "Clear cache"}
            </Button>
          </div>
        </div>

        <div ref={filterRef}>
          <DateRangeFilter
            value={preset}
            onChange={handlePresetChange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomRange={handleCustomRange}
          />
        </div>

        <div ref={statsRef} className="grid gap-4 sm:grid-cols-3">
          {summaryQuery.isLoading && !summaryQuery.data ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <StatsCard label="Total clicks" value={summaryData.totalClicks} />
              <StatsCard label="Peak day" value={summaryData.peakDay ?? "N/A"} />
              <StatsCard label="Peak day clicks" value={summaryData.peakDayClicks} />
            </>
          )}
        </div>

        <section ref={clicksChartRef} className="rounded-lg border shadow-sm p-4">
          <h2 className="mb-4 font-medium text-balance">Clicks over time</h2>
          {clicksQuery.isLoading && !clicksQuery.data ? (
            <ChartSkeleton />
          ) : (
            <ClicksOverTimeChart data={clicksData} />
          )}
        </section>

        <section ref={topLinksChartRef} className="rounded-lg border shadow-sm p-4">
          <h2 className="mb-4 font-medium text-balance">Top links</h2>
          {topLinksQuery.isLoading && !topLinksQuery.data ? (
            <ChartSkeleton />
          ) : (
            <TopLinksChart data={topLinksData} />
          )}
        </section>

        <section ref={referrersChartRef} className="rounded-lg border shadow-sm p-4">
          <h2 className="mb-4 font-medium text-balance">Top referrers</h2>
          {referrersQuery.isLoading && !referrersQuery.data ? (
            <ChartSkeleton />
          ) : (
            <TopReferrersChart data={referrersData} />
          )}
        </section>
      </div>
    </ErrorBoundary>
  );
}
