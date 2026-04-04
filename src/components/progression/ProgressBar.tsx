import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({
  progress,
  className,
  indicatorClassName,
}: ProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(progress, 1));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeProgress * 100)}
      className={cn(
        "bg-muted h-2 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <div
        className={cn(
          "bg-primary h-full rounded-full transition-[width]",
          indicatorClassName,
        )}
        style={{ width: `${safeProgress * 100}%` }}
      />
    </div>
  );
}
