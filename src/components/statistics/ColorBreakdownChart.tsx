import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ColorStat } from "@/lib/stats";
import {
  formatColorIdentityLabel,
  getColorGradientFill,
  buildColorGradientDefs,
} from "@/lib/mtg-utils";

interface ColorBreakdownChartProps {
  data: ColorStat[];
  totalGames: number;
}

const chartConfig = {
  count: { label: "Games", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ColorBreakdownChart({
  data,
  totalGames,
}: ColorBreakdownChartProps) {
  const chartData = useMemo(
    () =>
      data.slice(0, 10).map((d) => ({
        ...d,
        label: formatColorIdentityLabel(d.color),
        fill: getColorGradientFill(d.color),
      })),
    [data],
  );

  const gradientDefs = useMemo(
    () => buildColorGradientDefs(chartData.map((d) => d.color)),
    [chartData],
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Color Identity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No game data yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Identity Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="min-h-[250px] w-full"
          style={{ height: Math.max(250, chartData.length * 40) }}
        >
          <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
            <defs>
              {gradientDefs.map((def) => (
                <linearGradient
                  key={def.id}
                  id={def.id}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  {def.stops.map((stop, i) => (
                    <stop
                      key={i}
                      offset={stop.offset}
                      stopColor={stop.color}
                    />
                  ))}
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => {
                    const pct =
                      totalGames > 0
                        ? Math.round(((value as number) / totalGames) * 100)
                        : 0;
                    return (
                      <span>
                        {value} wins ({pct}%)
                      </span>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.color} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
