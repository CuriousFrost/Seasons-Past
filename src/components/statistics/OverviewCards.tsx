import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OverviewStats } from "@/lib/stats";

interface OverviewCardsProps {
  stats: OverviewStats;
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  const streakIsWin = stats.currentStreak.endsWith("W");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{stats.totalGames}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Wins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.wins}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Losses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {stats.losses}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Win Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {stats.winRate}
            <span className="text-muted-foreground text-lg">%</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Current Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-3xl font-bold ${
              stats.currentStreak === "—"
                ? "text-muted-foreground"
                : streakIsWin
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {stats.currentStreak}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Longest Win Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.longestWinStreak || "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Longest Loss Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {stats.longestLossStreak || "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Most Played Deck
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="truncate text-lg font-bold">
            {stats.mostPlayedDeck ?? "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
