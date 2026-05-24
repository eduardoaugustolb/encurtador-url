"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Props {
  data: { slug: string; title: string | null; clicks: number }[];
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function TopLinksChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-neutral-400">
        No data for this period
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[300px] w-full"
    >
      <BarChart accessibilityLayer data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="slug"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          width={100}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="clicks"
          fill="var(--color-clicks)"
          radius={4}
          maxBarSize={20}
        />
      </BarChart>
    </ChartContainer>
  );
}
