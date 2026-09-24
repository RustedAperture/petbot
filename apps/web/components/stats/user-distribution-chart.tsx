"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

function formatShare(count: number, total: number) {
  if (count === 0 || total === 0) {
    return "0%";
  }
  const share = (count / total) * 100;
  return share < 0.1
    ? "<0.1%"
    : `${share.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

export function UserDistributionChart({
  totalsByAction,
}: UserDistributionChartProps) {
  const chartData = Object.entries(totalsByAction)
    .filter(
      ([, totals]) =>
        totals.totalHasPerformed > 0 || (totals.totalHasReceived ?? 0) > 0,
    )
    .map(([actionKey, totals]) => ({
      action: actionKey.charAt(0).toUpperCase() + actionKey.slice(1),
      performed: totals.totalHasPerformed,
      received: totals.totalHasReceived ?? 0,
      // log1p-scaled values drive bar length so skewed data stays readable
      displayPerformed: Math.log1p(totals.totalHasPerformed),
      displayReceived: Math.log1p(totals.totalHasReceived ?? 0),
    }));
  const totalPerformed = chartData.reduce((sum, d) => sum + d.performed, 0);
  const totalReceived = chartData.reduce((sum, d) => sum + d.received, 0);

  return (
    <Card className="w-full bg-linear-to-b from-primary/5 to-25% dark:from-primary/10 flex flex-col">
      <CardHeader>
        <CardTitle>Interaction Distribution</CardTitle>
        <CardDescription>
          Performed vs. received across all action types
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="h-full min-h-[220px] w-full"
          >
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
                tick={{
                  className: "fill-foreground font-medium",
                  fontSize: 12,
                }}
                width={72}
              />
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <ChartTooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }
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
                        <span className="text-muted-foreground flex-1">
                          Performed
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {d.performed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-1 shrink-0 rounded-[2px] bg-[var(--color-displayReceived)]" />
                        <span className="text-muted-foreground flex-1">
                          Received
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {d.received.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
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
        ) : (
          <div className="flex min-h-[220px] items-center justify-center text-center text-sm text-muted-foreground">
            No interactions recorded yet.
          </div>
        )}
      </CardContent>
      {chartData.length > 0 && (
        <CardFooter className="flex flex-col items-stretch gap-3 pt-4 pb-4">
          <table aria-label="Action totals" className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="pb-2 text-left font-medium">
                  Action
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-[2px] bg-[var(--chart-2)]"
                    />
                    Performed
                  </span>
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  <span className="inline-flex items-center justify-end gap-1">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-[2px] bg-[var(--chart-1)]"
                    />
                    Received
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.action} className="border-t border-border/40">
                  <th scope="row" className="py-1.5 text-left font-medium">
                    {d.action}
                  </th>
                  <td className="py-1.5 text-right align-top tabular-nums">
                    <span className="font-medium">
                      {d.performed.toLocaleString()}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {formatShare(d.performed, totalPerformed)}
                    </span>
                  </td>
                  <td className="py-1.5 text-right align-top tabular-nums">
                    <span className="font-medium">
                      {d.received.toLocaleString()}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {formatShare(d.received, totalReceived)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-center text-[11px] leading-4 text-muted-foreground">
            Counts are exact; percentages are shares of each column. Bar lengths
            use a logarithmic scale.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
