import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ManaSymbols } from "@/components/commanders/ManaSymbols";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { computeOverviewStats, computeLifetimeGP } from "@/lib/stats";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const LINE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function Dashboard() {
  const { decks, loading: decksLoading } = useDecks();
  const { games, loading: gamesLoading } = useGames();
  const loading = decksLoading || gamesLoading;
  const navigate = useNavigate();

  const stats = useMemo(
    () => computeOverviewStats(games, decks),
    [games, decks],
  );

  const activeDecks = useMemo(
    () => decks.filter((d) => !d.archived),
    [decks],
  );

  const recentGames = useMemo(
    () =>
      [...games]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        .slice(0, 5),
    [games],
  );

  const mostRecentWin = useMemo(() => {
    const sorted = [...games].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    );
    return sorted.find((g) => g.won) ?? null;
  }, [games]);

  const lifetimeGP = useMemo(() => computeLifetimeGP(games), [games]);

  const gpChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    lifetimeGP.years.forEach((year, i) => {
      config[year] = {
        label: year,
        color: LINE_COLORS[i % LINE_COLORS.length],
      };
    });
    return config;
  }, [lifetimeGP.years]);

  const streakIsWin = stats.currentStreak.endsWith("W");

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            A glimpse at your EDH journey
          </p>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            A glimpse at your EDH journey
          </p>
        </div>
        {games.length > 0 && (
          <Button asChild size="sm">
            <Link to="/games/new">
              <PlusCircle className="mr-1 h-4 w-4" />
              Log Game
            </Link>
          </Button>
        )}
      </div>

      {/* Main grid: Stats + Active Decks sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Stat Cards Row */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card className="gap-0 py-3">
              <CardHeader className="px-4 pb-1">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p className="text-2xl font-bold">
                  {stats.winRate}
                  <span className="text-muted-foreground text-sm">%</span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {stats.wins}W – {stats.losses}L
                </p>
              </CardContent>
            </Card>

            <Card className="gap-0 py-3">
              <CardHeader className="px-4 pb-1">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Current Streak
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p
                  className={`text-2xl font-bold ${
                    stats.currentStreak === "—"
                      ? "text-muted-foreground"
                      : streakIsWin
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {stats.currentStreak}
                </p>
                <p className="text-muted-foreground text-xs">
                  Best: {stats.longestWinStreak}W
                </p>
              </CardContent>
            </Card>

            <Card className="gap-0 py-3">
              <CardHeader className="px-4 pb-1">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Most Played Deck
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p className="text-lg font-bold truncate">
                  {stats.mostPlayedDeck ?? "—"}
                </p>
              </CardContent>
            </Card>

            <Card className="gap-0 py-3">
              <CardHeader className="px-4 pb-1">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Avg Games / Month
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <p className="text-2xl font-bold">
                  {stats.avgGamesPerMonth}
                </p>
                <p className="text-muted-foreground text-xs">
                  {stats.totalGames} total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Two-column: Lifetime GP Chart + Recent Games */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Lifetime GP Chart */}
            <Card className="gap-0">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-semibold">Lifetime GP</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {lifetimeGP.data.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    No games yet.
                  </p>
                ) : (
                  <ChartContainer
                    config={gpChartConfig}
                    className="h-[200px] w-full"
                  >
                    <LineChart data={lifetimeGP.data}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {lifetimeGP.years.length > 1 && (
                        <ChartLegend content={<ChartLegendContent />} />
                      )}
                      {lifetimeGP.years.map((year) => (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={year}
                          stroke={`var(--color-${year})`}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Recent Games */}
            <Card className="gap-0">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-semibold">Recent Games</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {recentGames.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-muted-foreground text-sm">
                      No games logged yet.
                    </p>
                    <Button asChild size="sm">
                      <Link to="/games/new">
                        <PlusCircle className="mr-1 h-4 w-4" />
                        Log Your First Game
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="space-y-2 sm:hidden">
                      {recentGames.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          className="w-full rounded-md border p-2 text-left"
                          onClick={() => navigate("/games")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <ManaSymbols
                                colorIdentity={game.myDeck.commander.colorIdentity}
                                size="sm"
                              />
                              <span className="text-sm font-medium truncate">
                                {game.myDeck.name}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                game.won
                                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              }
                            >
                              {game.won ? "W" : "L"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {game.date}
                          </p>
                        </button>
                      ))}
                    </div>

                    <table className="hidden w-full sm:table">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="pb-1.5 text-left font-medium">Deck</th>
                          <th className="pb-1.5 text-left font-medium">Date</th>
                          <th className="pb-1.5 text-right font-medium">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentGames.map((game) => (
                          <tr key={game.id} className="border-b last:border-0">
                            <td className="py-1.5">
                              <div className="flex items-center gap-1.5">
                                <ManaSymbols
                                  colorIdentity={game.myDeck.commander.colorIdentity}
                                  size="sm"
                                />
                                <span className="text-sm truncate max-w-[120px]">
                                  {game.myDeck.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-1.5 text-muted-foreground text-xs">
                              {game.date}
                            </td>
                            <td className="py-1.5 text-right">
                              <Badge
                                variant="outline"
                                className={`cursor-pointer transition-colors ${
                                  game.won
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                                    : "border-rose-500/40 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-300"
                                }`}
                                onClick={() => navigate("/games")}
                              >
                                {game.won ? "W" : "L"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 text-center">
                      <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                        <Link to="/games">View All Games</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Most Recent Win */}
          {mostRecentWin && (
            <Card className="gap-0 bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Most Recent Win
                  </p>
                  <p className="text-muted-foreground text-xs truncate">
                    {mostRecentWin.myDeck.name} — {mostRecentWin.date}
                    {mostRecentWin.opponents.length > 0 && (
                      <> vs. {mostRecentWin.opponents.map((o) => o.name || o.commander || "?").join(", ")}</>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: Active Decks */}
        <div className="lg:border-l lg:pl-4">
          <h3 className="text-sm font-semibold mb-2">Active Decks</h3>
          {activeDecks.length === 0 ? (
            <div className="text-muted-foreground text-center py-6">
              <p className="text-xs">No decks yet.</p>
              <Button asChild size="sm" variant="ghost" className="mt-2 text-xs h-7">
                <Link to="/commanders">Add Deck</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {activeDecks.map((deck) => (
                <li key={deck.id}>
                  <Link
                    to="/commanders"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                  >
                    <ManaSymbols
                      colorIdentity={deck.commander.colorIdentity}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {deck.name}
                      </p>
                      <p className="text-muted-foreground text-xs truncate">
                        {deck.commander.name}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {activeDecks.length > 0 && (
            <div className="mt-2 text-center">
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link to="/commanders">Manage Decks</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
