"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type ActionTotals } from "@/types/stats";

interface UserDistributionChartProps {
  totalsByAction: Record<string, ActionTotals>;
}

const chartConfig = {
  displayPerformed: {
    label: "Performed",
    color: "var(--chart-2)",
  },
  displayReceived: {
    label: "Received",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function UserDistributionChart({
  totalsByAction,
}: UserDistributionChartProps) {
  const chartData = Object.entries(totalsByAction)
    .filter(([, totals]) => totals.totalHasPerformed > 0)
    .map(([actionKey, totals]) => ({
      action: actionKey.charAt(0).toUpperCase() + actionKey.slice(1),
      performed: totals.totalHasPerformed,
      received: totals.totalHasReceived ?? 0,
      // log1p-scaled values drive bar height so skewed data stays readable
      displayPerformed: Math.log1p(totals.totalHasPerformed),
      displayReceived: Math.log1p(totals.totalHasReceived ?? 0),
    }));

  return (
    <Card className="w-full bg-linear-to-b from-primary/5 to-25% dark:from-primary/10 flex flex-col">
      <CardHeader>
        <CardTitle>Interaction Distribution</CardTitle>
        <CardDescription>
          Performed vs. received across all action types
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ChartContainer config={chartConfig} className="h-full min-h-[220px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} className="stroke-border/40" />
            <YAxis
              dataKey="action"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ className: "fill-foreground font-medium", fontSize: 12 }}
              width={56}
            />
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as {
                  action: string;
                  performed: number;
                  received: number;
                };
                return (
                  <div className="grid min-w-36 items-start gap-1.5 rounded-xl bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10">
                    <span className="font-medium text-foreground mb-0.5">
                      {d.action}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-1 shrink-0 rounded-[2px] bg-[var(--color-displayPerformed)]" />
                      <span className="text-muted-foreground flex-1">Performed</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {d.performed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-1 shrink-0 rounded-[2px] bg-[var(--color-displayReceived)]" />
                      <span className="text-muted-foreground flex-1">Received</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {d.received.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="displayPerformed"
              fill="var(--color-displayPerformed)"
              radius={4}
            />
            <Bar
              dataKey="displayReceived"
              fill="var(--color-displayReceived)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
