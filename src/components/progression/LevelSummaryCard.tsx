import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/progression/ProgressBar";
import type { PlayerLevelState } from "@/lib/progression";
import { cn } from "@/lib/utils";

interface LevelSummaryCardProps {
  state: PlayerLevelState;
  compact?: boolean;
  className?: string;
}

export function LevelSummaryCard({
  state,
  compact = false,
  className,
}: LevelSummaryCardProps) {
  const nextLevelLabel = state.isMaxLevel
    ? "MAX"
    : `${state.xpIntoLevel} / ${state.xpForNextLevel} XP`;

  if (compact) {
    return (
      <Card
        className={cn(
          "gap-0 border-primary/20 bg-primary/5 py-3",
          className,
        )}
      >
        <CardHeader className="px-4 pb-1">
          <CardTitle className="text-muted-foreground text-xs font-medium">
            Player Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xl font-bold">Lv. {state.level}</p>
              <p className="text-muted-foreground truncate text-xs">
                {state.title}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {state.totalXp}
              </p>
              <p className="text-muted-foreground text-[11px]">total XP</p>
            </div>
          </div>
          <ProgressBar progress={state.progress} />
          <p className="text-muted-foreground text-[11px]">{nextLevelLabel}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="gap-1">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Player Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="border-primary/30 bg-background/80 flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border text-center shadow-sm">
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
                  Level
                </p>
                <p className="text-3xl font-black tabular-nums">{state.level}</p>
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-2xl font-bold">{state.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {state.totalXp.toLocaleString()} total XP earned
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-xl border bg-background/70 px-4 py-3">
              <p className="text-muted-foreground text-xs font-medium">
                Wins XP
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {state.winsXp.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 px-4 py-3">
              <p className="text-muted-foreground text-xs font-medium">
                Losses XP
              </p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {state.lossesXp.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">
              {state.isMaxLevel ? "Level 100 reached" : "Progress to next level"}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {state.isMaxLevel ? "MAX" : `${state.xpIntoLevel} / ${state.xpForNextLevel} XP`}
            </span>
          </div>
          <ProgressBar
            progress={state.progress}
            className="h-3"
            indicatorClassName="bg-gradient-to-r from-primary via-primary to-chart-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
