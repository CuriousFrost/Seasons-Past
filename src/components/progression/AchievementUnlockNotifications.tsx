import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trophy, X } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { useIsSmallDevice } from "@/hooks/use-mobile";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import { db } from "@/lib/firebase";
import { getAchievements, type AchievementProgress } from "@/lib/progression";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_TOASTS = 3;
const TOAST_AUTO_DISMISS_MS = 5500;
const TOAST_EXIT_MS = 260;

type SyncState = "loading" | "ready" | "missing" | "error";

interface ToastEntry {
  toastId: string;
  achievement: AchievementProgress;
  exiting: boolean;
}

function SparkleDots() {
  return (
    <>
      <span className="animate-achievement-burst absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-300/90" />
      <span
        className="animate-achievement-burst absolute -bottom-1 right-0.5 h-1.5 w-1.5 rounded-full bg-yellow-300/90"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="animate-achievement-burst absolute right-3 top-0 h-1.5 w-1.5 rounded-full bg-primary/80"
        style={{ animationDelay: "240ms" }}
      />
    </>
  );
}

function AchievementToast({
  toast,
  onDismiss,
  onView,
}: {
  toast: ToastEntry;
  onDismiss: (toastId: string) => void;
  onView: () => void;
}) {
  useEffect(() => {
    if (toast.exiting) return;

    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.toastId);
    }, TOAST_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toast.exiting, toast.toastId]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onView();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-xl backdrop-blur-sm",
        toast.exiting
          ? "animate-achievement-toast-out"
          : "animate-achievement-toast-in",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer outline-none"
        onClick={onView}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Trophy className="h-5 w-5" />
            <SparkleDots />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Achievement Unlocked
                </p>
                <p className="mt-1 truncate text-sm font-semibold leading-tight">
                  {toast.achievement.name}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismiss(toast.toastId);
                }}
                aria-label="Dismiss achievement notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {toast.achievement.description}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="px-2 py-0 text-[10px]">
                {toast.achievement.category}
              </Badge>
              <span className="text-[11px] font-medium text-primary/80">
                View Achievements
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AchievementUnlockNotifications() {
  const { user } = useAuth();
  const { games, loading: gamesLoading } = useGames();
  const { decks, loading: decksLoading } = useDecks();
  const { podBuddies, loading: buddiesLoading } = usePodBuddies();
  const isSmallDevice = useIsSmallDevice();
  const navigate = useNavigate();

  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [syncedIds, setSyncedIds] = useState<string[]>([]);
  const [queuedToasts, setQueuedToasts] = useState<ToastEntry[]>([]);
  const [visibleToasts, setVisibleToasts] = useState<ToastEntry[]>([]);

  const toastCounterRef = useRef(0);

  const achievements = useMemo(
    () => getAchievements(games, decks, podBuddies),
    [games, decks, podBuddies],
  );
  const unlockedAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked),
    [achievements],
  );

  const progressionLoading = gamesLoading || decksLoading || buddiesLoading;

  const persistNotifiedIds = useCallback(
    async (ids: string[]) => {
      if (!user) return;

      try {
        await setDoc(
          doc(db, "users", user.uid),
          { notifiedAchievementIds: ids },
          { merge: true },
        );
      } catch (error) {
        console.error("Failed to persist notified achievements:", error);
      }
    },
    [user],
  );

  const enqueueAchievements = useCallback((items: AchievementProgress[]) => {
    if (items.length === 0) return;

    setQueuedToasts((prev) => [
      ...prev,
      ...items.map((achievement) => ({
        toastId: `${achievement.id}-${Date.now()}-${toastCounterRef.current++}`,
        achievement,
        exiting: false,
      })),
    ]);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setVisibleToasts((prev) =>
      prev.map((toast) =>
        toast.toastId === toastId ? { ...toast, exiting: true } : toast,
      ),
    );

    window.setTimeout(() => {
      setVisibleToasts((prev) =>
        prev.filter((toast) => toast.toastId !== toastId),
      );
    }, TOAST_EXIT_MS);
  }, []);

  useEffect(() => {
    if (!user) {
      setSyncState("loading");
      setSyncedIds([]);
      setQueuedToasts([]);
      setVisibleToasts([]);
      return;
    }

    let cancelled = false;
    const userUid = user.uid;

    async function loadNotifiedIds() {
      setSyncState("loading");
      setSyncedIds([]);
      setQueuedToasts([]);
      setVisibleToasts([]);
      toastCounterRef.current = 0;

      try {
        const snapshot = await getDoc(doc(db, "users", userUid));
        if (cancelled) return;

        const rawIds = snapshot.data()?.notifiedAchievementIds;
        if (Array.isArray(rawIds)) {
          const ids = rawIds.filter(
            (value): value is string => typeof value === "string" && value.length > 0,
          );
          setSyncedIds(ids);
          setSyncState("ready");
          return;
        }

        setSyncedIds([]);
        setSyncState("missing");
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load notified achievements:", error);
        setSyncedIds([]);
        setSyncState("error");
      }
    }

    void loadNotifiedIds();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (queuedToasts.length === 0 || visibleToasts.length >= MAX_VISIBLE_TOASTS) {
      return;
    }

    const room = MAX_VISIBLE_TOASTS - visibleToasts.length;
    const nextToasts = queuedToasts.slice(0, room);
    if (nextToasts.length === 0) return;

    setVisibleToasts((prev) => [...prev, ...nextToasts]);
    setQueuedToasts((prev) => prev.slice(nextToasts.length));
  }, [queuedToasts, visibleToasts.length]);

  useEffect(() => {
    if (!user || progressionLoading || syncState === "loading") return;

    const currentUnlockedIds = unlockedAchievements.map((achievement) => achievement.id);

    if (syncState === "missing") {
      setSyncedIds(currentUnlockedIds);
      setSyncState("ready");
      void persistNotifiedIds(currentUnlockedIds);
      return;
    }

    if (syncState === "error") {
      setSyncedIds(currentUnlockedIds);
      setSyncState("ready");
      return;
    }

    const syncedSet = new Set(syncedIds);
    const newlyUnlocked = unlockedAchievements.filter(
      (achievement) => !syncedSet.has(achievement.id),
    );

    if (newlyUnlocked.length === 0) return;

    enqueueAchievements(newlyUnlocked);

    const nextIds = Array.from(
      new Set([...syncedIds, ...newlyUnlocked.map((achievement) => achievement.id)]),
    );
    setSyncedIds(nextIds);
    void persistNotifiedIds(nextIds);
  }, [
    enqueueAchievements,
    persistNotifiedIds,
    progressionLoading,
    syncState,
    syncedIds,
    unlockedAchievements,
    user,
  ]);

  if (!user) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4",
        !isSmallDevice && "sm:justify-end sm:px-4",
      )}
    >
      <div className="flex w-full max-w-sm flex-col gap-3">
        {visibleToasts.map((toast) => (
          <AchievementToast
            key={toast.toastId}
            toast={toast}
            onDismiss={dismissToast}
            onView={() => navigate("/achievements")}
          />
        ))}
      </div>
    </div>
  );
}
