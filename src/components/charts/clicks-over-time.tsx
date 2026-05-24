"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Props {
  data: { date: string; clicks: number }[];
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ClicksOverTimeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-75 items-center justify-center text-sm text-neutral-400">
        No data for this period
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-75 w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis tickLine={false} tickMargin={10} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="clicks"
          fill="var(--color-clicks)"
          radius={4}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}
