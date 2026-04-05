import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  Flame,
  Layers,
  Lock,
  Trophy,
  Users,
} from "lucide-react";
import { ProgressBar } from "@/components/progression/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import {
  ACHIEVEMENT_CATEGORY_ORDER,
  LEVEL_TITLE_BANDS,
  getAchievements,
  getPlayerLevelState,
  type AchievementCategory,
} from "@/lib/progression";

// ── Category metadata ──────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<AchievementCategory, React.ComponentType<{ className?: string }>> = {
  Logging: BookOpen,
  Wins: Trophy,
  Streaks: Flame,
  Decks: Layers,
  Social: Users,
  Meta: Eye,
};

// ── Level orb (SVG ring) ───────────────────────────────────────────────────

function LevelOrb({ level, progress }: { level: number; progress: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="7"
          strokeLinecap="round"
          className="stroke-primary transition-all duration-700"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Level
        </span>
        <span className="text-3xl font-black tabular-nums leading-none">{level}</span>
      </div>
    </div>
  );
}

// ── Sparkle decoration for completed achievements ──────────────────────────

function Sparkles() {
  return (
    <>
      <span className="animate-sparkle absolute -top-1 -right-1 text-[9px] text-amber-400 select-none">✦</span>
      <span className="animate-sparkle-delay-1 absolute -bottom-0.5 -right-0.5 text-[7px] text-amber-300 select-none">✦</span>
      <span className="animate-sparkle-delay-2 absolute -top-0.5 right-2 text-[6px] text-yellow-400 select-none">✦</span>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function Achievements() {
  const { games, loading: gamesLoading, error: gamesError } = useGames();
  const { decks, loading: decksLoading, error: decksError } = useDecks();
  const { podBuddies, loading: buddiesLoading, error: buddiesError } = usePodBuddies();
  const loading = gamesLoading || decksLoading || buddiesLoading;
  const error = gamesError || decksError || buddiesError;

  const levelState = useMemo(() => getPlayerLevelState(games), [games]);
  const achievements = useMemo(
    () => getAchievements(games, decks, podBuddies),
    [games, decks, podBuddies],
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completionRate =
    achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;

  const groupedAchievements = useMemo(
    () =>
      ACHIEVEMENT_CATEGORY_ORDER.map((category) => ({
        category,
        achievements: achievements.filter((a) => a.category === category),
      })),
    [achievements],
  );

  const [activeTab, setActiveTab] = useState("achievements");
  const currentBandRef = useRef<HTMLDivElement | null>(null);

  const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("achievements-open-categories");
      if (saved) return new Set<string>(JSON.parse(saved) as string[]);
    } catch {}
    return new Set<string>();
  });
  function toggleCategory(category: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      try { localStorage.setItem("achievements-open-categories", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  useEffect(() => {
    if (activeTab !== "titles") return;
    currentBandRef.current?.scrollIntoView({ inline: "center", behavior: "smooth" });
  }, [activeTab]);

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Milestones, titles, and progression from your logged play history.
          </p>
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const nextLevelLabel = levelState.isMaxLevel
    ? "MAX LEVEL"
    : `${levelState.xpIntoLevel.toLocaleString()} / ${levelState.xpForNextLevel?.toLocaleString()} XP to next level`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Milestones, titles, and progression from your logged play history.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm">
          <Trophy className="h-3.5 w-3.5" />
          {unlockedCount} / {achievements.length} completed
        </Badge>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* ── RPG Hero Card ──────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            {/* Left: orb + title */}
            <div className="flex items-center gap-4">
              <LevelOrb level={levelState.level} progress={levelState.progress} />
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight">{levelState.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{nextLevelLabel}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {levelState.totalXp.toLocaleString()} total XP
                </p>
              </div>
            </div>

            {/* XP to next level bar */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  XP to Next Level
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {levelState.isMaxLevel
                    ? "MAX"
                    : `${levelState.xpIntoLevel.toLocaleString()} / ${levelState.xpForNextLevel?.toLocaleString()}`}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${levelState.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ribbon ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x overflow-hidden rounded-xl border">
        {[
          { label: "Completed", value: unlockedCount },
          { label: "Completion", value: `${completionRate}%` },
          { label: "Games Played", value: games.length },
          { label: "Wins", value: levelState.wins, colored: true },
        ].map(({ label, value, colored }) => (
          <div key={label} className="flex flex-col items-center justify-center px-2 py-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
              {label}
            </p>
            <p className={`mt-1 text-xl font-bold tabular-nums leading-none ${colored ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {games.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">No achievements yet</p>
              <p className="text-muted-foreground text-sm">
                Add a deck, log your first game, and your level plus milestone progress will update immediately.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/commanders">Manage Decks</Link>
              </Button>
              <Button asChild>
                <Link to="/games/new">Log Game</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <TabsList className="w-full">
          <TabsTrigger value="achievements" className="flex-1">Achievements</TabsTrigger>
          <TabsTrigger value="titles" className="flex-1">Titles</TabsTrigger>
        </TabsList>

        {/* ── Achievements tab ──────────────────────────────────────────── */}
        <TabsContent value="achievements" className="mt-4 space-y-2">
          {groupedAchievements.map(({ category, achievements: categoryItems }) => {
            const isOpen = openCategories.has(category);
            const completedCount = categoryItems.filter((a) => a.unlocked).length;
            const CategoryIcon = CATEGORY_ICONS[category];

            return (
              <section key={category} className="overflow-hidden rounded-xl border">
                {/* Category header */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                  onClick={() => toggleCategory(category)}
                >
                  {/* Icon badge */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon className="h-4 w-4" />
                  </div>

                  {/* Title + description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{category}</span>
                      <span className="text-xs text-muted-foreground">
                        {completedCount}/{categoryItems.length}
                      </span>
                    </div>
                    {/* Pip dots */}
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {categoryItems.map((a) => (
                        <div
                          key={a.id}
                          className={`h-1.5 w-1.5 rounded-full transition-colors ${
                            a.unlocked ? "bg-primary" : "bg-muted-foreground/25"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Achievement rows */}
                {isOpen && (
                  <div className="border-t">
                    {categoryItems.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0 ${
                          achievement.unlocked ? "bg-emerald-500/5" : ""
                        }`}
                      >
                        {/* Status icon */}
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              achievement.unlocked
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {achievement.unlocked ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )}
                          </div>
                          {achievement.unlocked && <Sparkles />}
                        </div>

                        {/* Name + description + bar */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`text-sm font-medium leading-none ${
                                achievement.unlocked ? "" : "text-muted-foreground"
                              }`}
                            >
                              {achievement.name}
                            </p>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {achievement.unlocked
                                ? `${achievement.target}/${achievement.target}`
                                : `${achievement.current}/${achievement.target}`}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground/70">
                            {achievement.description}
                          </p>
                          <ProgressBar
                            progress={achievement.progress}
                            className="h-1.5"
                            indicatorClassName={
                              achievement.unlocked ? "bg-emerald-500" : undefined
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>

        {/* ── Titles tab ────────────────────────────────────────────────── */}
        <TabsContent value="titles" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your current title and the path ahead.
          </p>

          {/* Horizontal scrollable pill rail */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {LEVEL_TITLE_BANDS.map((band) => {
              const isCurrent =
                levelState.level >= band.startLevel && levelState.level <= band.endLevel;
              const isPast = levelState.level > band.endLevel;
              return (
                <div
                  key={band.title}
                  ref={isCurrent ? currentBandRef : undefined}
                  className={`shrink-0 rounded-full border px-4 py-2 text-center transition-colors ${
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isPast
                        ? "border-border bg-muted/30 text-muted-foreground"
                        : "border-border/40 bg-muted/10 text-muted-foreground/50"
                  }`}
                >
                  <p className="whitespace-nowrap text-xs font-semibold">{band.title}</p>
                  <p className="text-[10px] opacity-70">
                    {band.startLevel}–{band.endLevel}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Current band detail card */}
          {LEVEL_TITLE_BANDS.filter(
            (band) =>
              levelState.level >= band.startLevel && levelState.level <= band.endLevel,
          ).map((band) => (
            <Card key={band.title} className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-lg font-bold">{band.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Levels {band.startLevel}–{band.endLevel}
                  </p>
                </div>
                <Badge>Current</Badge>
              </CardContent>
            </Card>
          ))}

          {/* Full list */}
          <div className="space-y-2">
            {LEVEL_TITLE_BANDS.map((band) => {
              const isCurrent =
                levelState.level >= band.startLevel && levelState.level <= band.endLevel;
              const isPast = levelState.level > band.endLevel;
              return (
                <div
                  key={band.title}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 transition-colors ${
                    isCurrent
                      ? "border-primary/40 bg-primary/10"
                      : isPast
                        ? "bg-background/70"
                        : "bg-muted/40 opacity-70"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{band.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Levels {band.startLevel}–{band.endLevel}
                    </p>
                  </div>
                  <Badge variant={isCurrent ? "default" : "outline"} className="text-xs">
                    {isCurrent ? "Current" : isPast ? "Reached" : "Future"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
