import { useSyncExternalStore } from "react";
import { getPrefetchProgress, subscribePrefetchProgress } from "@/lib/prefetch";

export function PrefetchProgressLine() {
  const progress = useSyncExternalStore(subscribePrefetchProgress, getPrefetchProgress, getPrefetchProgress);
  if (!progress.active) return null;

  const percentage = progress.total === null
    ? null
    : Math.round((progress.completed / progress.total) * 100);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-50 h-0.5 w-full bg-white/10"
      role="progressbar"
      aria-label="Preparing cached data"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage ?? undefined}
    >
      <div
        className={`h-full bg-white transition-transform duration-150 ease-out ${
          percentage === null ? "w-1/4 animate-pulse" : "w-full"
        }`}
        style={{
          transform: `scaleX(${percentage === null ? 1 : percentage / 100})`,
          transformOrigin: "left center",
        }}
      />
      <span className="sr-only">
        {percentage === null ? "Preparing cached data" : `${percentage}% of cached data prepared`}
      </span>
    </div>
  );
}
