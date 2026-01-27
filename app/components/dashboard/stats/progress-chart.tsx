"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import type { ProgressData } from "@/lib/types";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useDictionary } from "@/contexts/app-context";

const chartConfig = {
  "Study Time": {
    label: "Study Time (min)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

type ProgressChartProps = {
  progressData: ProgressData[];
};

export function ProgressChart({ progressData }: ProgressChartProps) {
  const { dictionary } = useDictionary();

  return (
    <div>
        <h3 className="text-lg font-medium font-headline">{dictionary.dashboard.statistics.weeklyActivity}</h3>
        <p className="text-sm text-muted-foreground mb-4">{dictionary.dashboard.statistics.description}</p>
        <ChartContainer config={chartConfig} className="h-60 w-full">
          <BarChart
            data={progressData}
            margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
             <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value}m`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="Study Time" fill="var(--color-Study Time)" radius={4} />
          </BarChart>
        </ChartContainer>
    </div>
  );
}
