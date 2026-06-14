import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import type { TimeEntry } from '@/hooks/useTimeTracking';

interface Props {
  /** Optional entityId filter; when omitted, aggregates across user. */
  entityId?: string;
  /** Number of weeks to show (default 26). */
  weeks?: number;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function intensity(seconds: number, max: number): number {
  if (!seconds || max <= 0) return 0;
  const ratio = seconds / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

const LEVEL_BG = [
  'bg-white/[0.04]',
  'bg-white/15',
  'bg-white/30',
  'bg-white/55',
  'bg-white/85',
];

/**
 * GitHub-style heatmap of daily time tracked.
 */
export function TimeHeatmap({ entityId, weeks = 26 }: Props) {
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const d = new Date(to);
    d.setDate(d.getDate() - weeks * 7);
    return d;
  }, [to, weeks]);

  const { data, isLoading } = useQuery({
    queryKey: ['timeTracking', 'heatmap', dateKey(from), dateKey(to)],
    queryFn: () =>
      timeTrackingApi
        .getAllInRange(dateKey(from), dateKey(to))
        .then((r) => r.data as TimeEntry[]),
    staleTime: 60_000,
  });

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    (data || []).forEach((e) => {
      if (entityId && e.entityId !== entityId) return;
      map.set(e.date, (map.get(e.date) || 0) + (e.durationSeconds || 0));
    });
    return map;
  }, [data, entityId]);

  const max = useMemo(() => {
    let m = 0;
    byDay.forEach((v) => {
      if (v > m) m = v;
    });
    return m;
  }, [byDay]);

  const grid = useMemo(() => {
    // Build columns of 7 days, starting from oldest week's Sunday.
    const start = new Date(from);
    start.setDate(start.getDate() - start.getDay());
    const cols: { date: Date; key: string; seconds: number }[][] = [];
    for (let w = 0; w < weeks + 1; w++) {
      const col: { date: Date; key: string; seconds: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const key = dateKey(day);
        col.push({ date: day, key, seconds: byDay.get(key) || 0 });
      }
      cols.push(col);
    }
    return cols;
  }, [from, weeks, byDay]);

  const totalSeconds = useMemo(() => {
    let t = 0;
    byDay.forEach((v) => (t += v));
    return t;
  }, [byDay]);

  const activeDays = byDay.size;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-mono">
          Activity Heatmap
        </h3>
        <span className="text-[10px] text-white/40 font-mono">
          {activeDays} active days · {Math.round(totalSeconds / 3600)}h
        </span>
      </div>

      {isLoading ? (
        <div className="h-32" />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-[3px] min-w-fit">
            {grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell) => {
                  const isFuture = cell.date > to;
                  const lvl = intensity(cell.seconds, max);
                  return (
                    <div
                      key={cell.key}
                      title={`${cell.key} · ${Math.round(cell.seconds / 60)}m`}
                      className={`w-[11px] h-[11px] rounded-[2px] ${
                        isFuture ? 'bg-transparent' : LEVEL_BG[lvl]
                      } border border-white/[0.04]`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
            <span>less</span>
            {LEVEL_BG.map((c, i) => (
              <span key={i} className={`w-[10px] h-[10px] rounded-[2px] ${c}`} />
            ))}
            <span>more</span>
          </div>
        </div>
      )}
    </div>
  );
}
