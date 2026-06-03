"use client";

import * as React from "react";
import { RadialBar, RadialBarChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { type ActionTotals } from "@/types/stats";

interface DistributionChartProps {
  totalsByAction: Record<string, ActionTotals>;
  title?: string;
  description?: string;
  metricLabel?: string;
}

const chartConfig = {
  displayCount: {
    label: "Actions",
  },
  pet: { label: "Pet", color: "var(--chart-2)" },
  bite: { label: "Bite", color: "oklch(0.62 0.2 25)" },
  hug: { label: "Hug", color: "oklch(0.65 0.18 145)" },
  bonk: { label: "Bonk", color: "var(--chart-3)" },
  squish: { label: "Squish", color: "var(--chart-1)" },
  explode: { label: "Explode", color: "oklch(0.62 0.22 350)" },
} satisfies ChartConfig;

export function DistributionChart({
  totalsByAction,
  title = "Action Distribution",
  description = "A breakdown of active interactions",
}: DistributionChartProps) {
  const chartData = React.useMemo(() => {
    return Object.entries(totalsByAction)
      .map(([actionKey, data]) => ({
        action: actionKey,
        count: data.totalHasPerformed,
        displayCount: Math.log1p(data.totalHasPerformed),
        fill: `var(--color-${actionKey})`,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [totalsByAction]);

  const hasData = chartData.length > 0;

  return (
    <Card className="w-full bg-linear-to-b from-primary/5 to-25% dark:from-primary/10 flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex justify-center items-center min-h-[220px]">
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square w-full max-w-[240px]"
          >
            <RadialBarChart
              data={chartData}
              startAngle={-90}
              endAngle={380}
              innerRadius={28}
              outerRadius={100}
            >
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as {
                    action: string;
                    count: number;
                    fill: string;
                  };
                  const label =
                    chartConfig[d.action as keyof typeof chartConfig]?.label ??
                    d.action;
                  return (
                    <div className="grid min-w-32 items-start gap-1.5 rounded-xl bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10">
                      <div className="flex w-full items-center gap-2">
                        <div
                          className="h-2.5 w-1 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: d.fill }}
                        />
                        <div className="flex flex-1 justify-between items-center leading-none gap-4">
                          <span className="text-muted-foreground capitalize">
                            {label}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {d.count.toLocaleString()}
                            </span>
                            {metricLabel && (
                              <span className="text-[10px] text-muted-foreground">
                                {metricLabel.toLowerCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <RadialBar dataKey="displayCount" background />
            </RadialBarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
            No interactions recorded yet.
          </div>
        )}
      </CardContent>
      {hasData && (
        <CardFooter className="flex flex-wrap gap-x-4 gap-y-1.5 pt-4 pb-4 justify-center">
          {chartData.map((d) => {
            const config = chartConfig[d.action as keyof typeof chartConfig];
            const label = config?.label ?? d.action;
            const color = "color" in (config ?? {}) ? (config as { color: string }).color : d.fill;
            return (
              <div
                key={d.action}
                className="flex items-center gap-2 text-xs"
              >
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </CardFooter>
      )}
    </Card>
  );
}
