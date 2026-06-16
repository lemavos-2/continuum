import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import { useTimeTracking, type TimeEntry } from '@/hooks/useTimeTracking';

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

function fmtHM(s: number) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const LEVEL_BG = [
  'bg-white/[0.04]',
  'bg-white/15',
  'bg-white/30',
  'bg-white/55',
  'bg-white/85',
];

interface HoverCell {
  key: string;
  seconds: number;
  count: number;
  x: number;
  y: number;
}

/**
 * GitHub-style heatmap of daily time tracked.
 * Optimistic: includes today's running timer elapsed time live.
 */
export function TimeHeatmap({ entityId, weeks = 26 }: Props) {
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const d = new Date(to);
    d.setDate(d.getDate() - weeks * 7);
    return d;
  }, [to, weeks]);

  const { activeTimers } = useTimeTracking();
  const [hover, setHover] = useState<HoverCell | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['timeTracking', 'heatmap', dateKey(from), dateKey(to)],
    queryFn: () =>
      timeTrackingApi
        .getAllInRange(dateKey(from), dateKey(to))
        .then((r) => r.data as TimeEntry[]),
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  const todayKey = dateKey(to);

  // Live elapsed for active timers — adds optimistic seconds to today's cell.
  const liveTodaySeconds = useMemo(() => {
    if (!activeTimers || activeTimers.size === 0) return 0;
    if (entityId) {
      return activeTimers.get(entityId)?.elapsedSeconds || 0;
    }
    let total = 0;
    activeTimers.forEach((t) => (total += t.elapsedSeconds || 0));
    return total;
  }, [activeTimers, entityId]);

  const { byDay, countByDay } = useMemo(() => {
    const sec = new Map<string, number>();
    const cnt = new Map<string, number>();
    (data || []).forEach((e) => {
      if (entityId && e.entityId !== entityId) return;
      sec.set(e.date, (sec.get(e.date) || 0) + (e.durationSeconds || 0));
      cnt.set(e.date, (cnt.get(e.date) || 0) + 1);
    });
    if (liveTodaySeconds > 0) {
      sec.set(todayKey, (sec.get(todayKey) || 0) + liveTodaySeconds);
    }
    return { byDay: sec, countByDay: cnt };
  }, [data, entityId, liveTodaySeconds, todayKey]);

  const max = useMemo(() => {
    let m = 0;
    byDay.forEach((v) => {
      if (v > m) m = v;
    });
    return m;
  }, [byDay]);

  const grid = useMemo(() => {
    const start = new Date(from);
    start.setDate(start.getDate() - start.getDay());
    const cols: { date: Date; key: string; seconds: number; count: number }[][] = [];
    for (let w = 0; w < weeks + 1; w++) {
      const col: { date: Date; key: string; seconds: number; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        const key = dateKey(day);
        col.push({
          date: day,
          key,
          seconds: byDay.get(key) || 0,
          count: countByDay.get(key) || 0,
        });
      }
      cols.push(col);
    }
    return cols;
  }, [from, weeks, byDay, countByDay]);

  const totalSeconds = useMemo(() => {
    let t = 0;
    byDay.forEach((v) => (t += v));
    return t;
  }, [byDay]);

  const activeDays = byDay.size;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 relative">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-mono">
          Activity Heatmap
        </h3>
        <span className="text-[10px] text-white/40 font-mono">
          {activeDays} active days · {fmtHM(totalSeconds)}
        </span>
      </div>

      {isLoading ? (
        <div className="h-32" />
      ) : (
        <div className="overflow-x-auto relative">
          <div className="flex gap-[3px] min-w-fit">
            {grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell) => {
                  const isFuture = cell.date > to;
                  const lvl = intensity(cell.seconds, max);
                  const isToday = cell.key === todayKey;
                  return (
                    <div
                      key={cell.key}
                      onMouseEnter={(e) => {
                        if (isFuture) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const parent = (e.currentTarget.closest('.relative') as HTMLElement)?.getBoundingClientRect();
                        setHover({
                          key: cell.key,
                          seconds: cell.seconds,
                          count: cell.count,
                          x: rect.left - (parent?.left || 0) + rect.width / 2,
                          y: rect.top - (parent?.top || 0),
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                      className={`w-[11px] h-[11px] rounded-[2px] ${
                        isFuture ? 'bg-transparent' : LEVEL_BG[lvl]
                      } border ${
                        isToday ? 'border-white/40' : 'border-white/[0.04]'
                      } cursor-pointer`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {hover && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full mt-[-6px] rounded-md border border-white/15 bg-black/95 px-2.5 py-1.5 shadow-xl backdrop-blur"
              style={{ left: hover.x, top: hover.y }}
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                {hover.key}
                {hover.key === todayKey && ' · today'}
              </p>
              <p className="text-xs font-mono text-white mt-0.5">
                {fmtHM(hover.seconds)} · {hover.count} {hover.count === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          )}

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
