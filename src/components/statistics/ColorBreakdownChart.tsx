import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

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
          <CardTitle>Wins by Color Identity</CardTitle>
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
        <CardTitle>Wins by Color Identity</CardTitle>
        <CardDescription>How many games were won by each color combination</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: Math.max(250, chartData.length * 40) }}
        >
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
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
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={isMobile ? 88 : 140}
              tickFormatter={(value: string) =>
                isMobile && value.length > 12
                  ? `${value.slice(0, 11)}...`
                  : value
              }
              tick={{ fontSize: isMobile ? 11 : 12 }}
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
