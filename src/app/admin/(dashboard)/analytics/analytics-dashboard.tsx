"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { DateRangePreset } from "@/components/analytics/date-range-filter";
import { DateRangeFilter } from "@/components/analytics/date-range-filter";
import { StatsCard } from "@/components/analytics/stats-card";
import { Button } from "@/components/ui/button";
import { ClicksOverTimeChart } from "@/components/charts/clicks-over-time";
import { TopLinksChart } from "@/components/charts/top-links";
import { TopReferrersChart } from "@/components/charts/top-referrers";

gsap.registerPlugin(useGSAP);

interface Props {
  initialSummary: {
    totalClicks: number;
    peakDay: string | null;
    peakDayClicks: number;
  };
  initialClicksData: { date: string; clicks: number }[];
  initialTopLinksData: { slug: string; title: string | null; clicks: number }[];
  initialReferrersData: { hostname: string; clicks: number }[];
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
  const [summary, setSummary] = useState(initialSummary);
  const [clicksData, setClicksData] = useState(initialClicksData);
  const [topLinksData, setTopLinksData] = useState(initialTopLinksData);
  const [referrersData, setReferrersData] = useState(initialReferrersData);
  const [isPending, startTransition] = useTransition();

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const [summaryRes, clicksRes, topLinksRes, referrersRes] =
      await Promise.all([
        fetch(`/api/analytics/summary?${params}`),
        fetch(`/api/analytics/clicks-over-time?${params}`),
        fetch(`/api/analytics/top-links?${params}`),
        fetch(`/api/analytics/top-referrers?${params}`),
      ]);

    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (clicksRes.ok) {
      const data = await clicksRes.json();
      if (Array.isArray(data)) setClicksData(data);
    }
    if (topLinksRes.ok) {
      const data = await topLinksRes.json();
      if (Array.isArray(data)) setTopLinksData(data);
    }
    if (referrersRes.ok) {
      const data = await referrersRes.json();
      if (Array.isArray(data)) setReferrersData(data);
    }
  }, []);

  function handlePresetChange(p: DateRangePreset) {
    setPreset(p);

    if (p === "7d") {
      setSummary(initialSummary);
      setClicksData(initialClicksData);
      setTopLinksData(initialTopLinksData);
      setReferrersData(initialReferrersData);
      return;
    }

    const to = new Date();
    const from = new Date();
    if (p === "30d") from.setDate(to.getDate() - 30);
    else if (p === "90d") from.setDate(to.getDate() - 90);

    fetchRange(from, to);
  }

  async function handleWipeCache() {
    startTransition(async () => {
      await fetch("/api/cache/wipe", { method: "POST" });
      const to = new Date();
      const from = new Date();
      if (preset === "30d") from.setDate(to.getDate() - 30);
      else if (preset === "90d") from.setDate(to.getDate() - 90);
      else from.setDate(to.getDate() - 7);
      await fetchRange(from, to);
    });
  }

  function handleCustomRange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    setPreset("custom");

    if (from && to) {
      fetchRange(new Date(from), new Date(to));
    }
  }

  return (
    <div ref={container} className="space-y-6">
      <div ref={headerRef} className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-balance">Analytics</h1>
        <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            if (preset === "7d") {
              setSummary(initialSummary);
              setClicksData(initialClicksData);
              setTopLinksData(initialTopLinksData);
              setReferrersData(initialReferrersData);
              return;
            }
            const to = new Date();
            const from = new Date();
            if (preset === "30d") from.setDate(to.getDate() - 30);
            else if (preset === "90d") from.setDate(to.getDate() - 90);
            else if (preset === "custom" && customFrom && customTo) {
              fetchRange(new Date(customFrom), new Date(customTo));
              return;
            }
            fetchRange(from, to);
          }}
        >
          Refresh
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={handleWipeCache}
        >
          {isPending ? "Limpando..." : "Limpar Cache"}
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
        <StatsCard label="Total clicks" value={summary.totalClicks} />
        <StatsCard label="Peak day" value={summary.peakDay ?? "N/A"} />
        <StatsCard label="Peak day clicks" value={summary.peakDayClicks} />
      </div>

      <section ref={clicksChartRef} className="rounded-lg border shadow-sm p-4">
        <h2 className="mb-4 font-medium text-balance">Clicks over time</h2>
        <ClicksOverTimeChart data={clicksData} />
      </section>

      <section ref={topLinksChartRef} className="rounded-lg border shadow-sm p-4">
        <h2 className="mb-4 font-medium text-balance">Top links</h2>
        <TopLinksChart data={topLinksData} />
      </section>

      <section ref={referrersChartRef} className="rounded-lg border shadow-sm p-4">
        <h2 className="mb-4 font-medium text-balance">Top referrers</h2>
        <TopReferrersChart data={referrersData} />
      </section>
    </div>
  );
}
