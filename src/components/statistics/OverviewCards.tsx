import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatColorIdentityLabel } from "@/lib/mtg-utils";
import type { OverviewStats } from "@/lib/stats";

interface OverviewCardsProps {
  stats: OverviewStats;
}

export function OverviewCards({ stats }: OverviewCardsProps) {
  const streakIsWin = stats.currentStreak.endsWith("W");
  const hasStreak =
    stats.currentStreak.endsWith("W") || stats.currentStreak.endsWith("L");
  const mostFacedColorLabel = stats.mostFacedOpponentColor
    ? formatColorIdentityLabel(stats.mostFacedOpponentColor)
    : null;

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Games Played
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
              !hasStreak
                ? "text-muted-foreground"
                : streakIsWin
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {hasStreak ? stats.currentStreak : "--"}
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
            {stats.longestWinStreak || "--"}
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
            {stats.longestLossStreak || "--"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Most Played Commander
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-words text-lg font-bold leading-tight">
            {stats.mostPlayedCommander ?? "--"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Nemesis Commander
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-words text-base font-bold leading-tight">
            {stats.nemesisCommander ?? "--"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {stats.nemesisRecord ?? "No clear nemesis yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Nemesis Color
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-words text-base font-bold leading-tight">
            {mostFacedColorLabel ?? "--"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {stats.mostFacedOpponentColorCount > 0
              ? `${stats.mostFacedOpponentColorCount} times`
              : "No opponent color data"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
