import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { timeTrackingApi } from '@/lib/api';
import { useTimeTracking, type TimeEntry } from '@/hooks/useTimeTracking';
import { useTimerGoal } from '@/hooks/useTimerGoal';

interface Props {
  /** Optional entityId filter; when omitted, aggregates across user. */
  entityId?: string;
  /** Number of weeks to show (default 26). */
  weeks?: number;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Intensity is the % of the daily goal achieved. */
function intensity(seconds: number, goalSeconds: number): number {
  if (!seconds || goalSeconds <= 0) return 0;
  const ratio = seconds / goalSeconds;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  if (ratio > 0) return 1;
  return 0;
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
  'bg-white/35',
  'bg-white/60',
  'bg-white/90',
];

interface HoverCell {
  key: string;
  seconds: number;
  count: number;
  x: number;
  y: number;
}

export function TimeHeatmap({ entityId, weeks = 26 }: Props) {
  const qc = useQueryClient();
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => {
    const d = new Date(to);
    d.setDate(d.getDate() - weeks * 7);
    return d;
  }, [to, weeks]);

  const { activeTimers, addTimeAsync, isAdding } = useTimeTracking();
  const [hover, setHover] = useState<HoverCell | null>(null);

  const { goalMinutes, setGoal } = useTimerGoal(entityId);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string>(String(goalMinutes));

  const [adding, setAdding] = useState(false);
  const [entryMin, setEntryMin] = useState<string>('30');

  const goalSeconds = goalMinutes * 60;

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

  const commitGoal = () => {
    const n = parseInt(goalDraft, 10);
    if (Number.isFinite(n) && n > 0) setGoal(n);
    setEditingGoal(false);
  };

  const submitEntry = async () => {
    if (!entityId) return;
    const minutes = parseInt(entryMin, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    try {
      await addTimeAsync({
        entityId,
        date: dateKey(new Date()),
        durationSeconds: minutes * 60,
      });
      // Force refresh so it appears instantly on the heatmap.
      await qc.invalidateQueries({ queryKey: ['timeTracking'] });
      setAdding(false);
      setEntryMin('30');
    } catch (err) {
      console.error('Failed to add entry:', err);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 relative">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-xs uppercase tracking-widest text-white/50 font-mono">
          Activity Heatmap
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-white/40 font-mono">
            {activeDays} active days · {fmtHM(totalSeconds)}
          </span>
          {editingGoal ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={commitGoal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitGoal();
                  if (e.key === 'Escape') {
                    setGoalDraft(String(goalMinutes));
                    setEditingGoal(false);
                  }
                }}
                autoFocus
                className="w-14 px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.04] border border-white/15 rounded text-white text-right focus:outline-none focus:border-white/30"
              />
              <span className="text-[10px] text-white/40 font-mono">min/day</span>
            </span>
          ) : (
            <button
              onClick={() => {
                setGoalDraft(String(goalMinutes));
                setEditingGoal(true);
              }}
              className="text-[10px] font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded px-1.5 py-0.5 transition"
              title="Set daily goal"
            >
              goal · {fmtHM(goalSeconds)}
            </button>
          )}
          {entityId && (
            <button
              onClick={() => setAdding((v) => !v)}
              className="text-[10px] font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded px-1.5 py-0.5 transition"
              title="Add a manual entry"
            >
              {adding ? '× cancel' : '+ entry'}
            </button>
          )}
        </div>
      </div>

      {adding && entityId && (
        <div className="mb-4 flex items-center gap-2 flex-wrap rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
          <span className="px-2 py-1 text-[11px] font-mono text-white/60 border border-white/10 rounded">
            today · {dateKey(new Date())}
          </span>
          <input
            type="number"
            min={1}
            value={entryMin}
            onChange={(e) => setEntryMin(e.target.value)}
            placeholder="minutes"
            className="w-20 px-2 py-1 text-[11px] font-mono bg-white/[0.04] border border-white/15 rounded text-white text-right focus:outline-none focus:border-white/30"
          />
          <span className="text-[10px] font-mono text-white/40">min</span>
          <button
            onClick={submitEntry}
            disabled={isAdding}
            className="ml-auto px-2.5 py-1 text-[11px] font-mono bg-white text-black rounded hover:bg-white/90 transition disabled:opacity-50"
          >
            {isAdding ? '...' : 'Add'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-32" />
      ) : (
        <div className="overflow-x-auto relative">
          <div className="flex gap-[3px] min-w-fit">
            {grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell) => {
                  const isFuture = cell.date > to;
                  const lvl = intensity(cell.seconds, goalSeconds);
                  const isToday = cell.key === todayKey;
                  return (
                    <div
                      key={cell.key}
                      onMouseEnter={(e) => {
                        if (isFuture) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHover({
                          key: cell.key,
                          seconds: cell.seconds,
                          count: cell.count,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
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

          {hover && (() => {
            const W = 180;
            const margin = 8;
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
            const left = Math.max(margin + W / 2, Math.min(vw - margin - W / 2, hover.x));
            return (
              <div
                className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-white/15 bg-black/95 px-2.5 py-1.5 shadow-xl backdrop-blur"
                style={{ left, top: hover.y - 6, width: W }}
              >
                <p className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  {hover.key}
                  {hover.key === todayKey && ' · today'}
                </p>
                <p className="text-xs font-mono text-white mt-0.5">
                  {fmtHM(hover.seconds)} · {hover.count} {hover.count === 1 ? 'entry' : 'entries'}
                </p>
                {goalSeconds > 0 && (
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">
                    {Math.min(999, Math.round((hover.seconds / goalSeconds) * 100))}% of goal
                  </p>
                )}
              </div>
            );
          })()}

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
