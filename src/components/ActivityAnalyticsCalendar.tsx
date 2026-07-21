import { useMemo } from "react";
import { Calendar as Cal, CalendarCell, CalendarGrid, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Heading, Button as RACButton } from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface ActivityAnalyticsCalendarProps {
  trackingDates?: string[];
  historyDays?: number;
}

export function ActivityAnalyticsCalendar({ trackingDates = [] }: ActivityAnalyticsCalendarProps) {
  const completionSet = useMemo(() => {
    const s = new Set<string>();
    trackingDates.forEach((d) => s.add(d.split("T")[0]));
    return s;
  }, [trackingDates]);

  const now = today(getLocalTimeZone());

  const stats = useMemo(() => {
    const ymCurrent = `${now.year}-${String(now.month).padStart(2, "0")}`;
    let monthActive = 0;
    completionSet.forEach((d) => {
      if (d.startsWith(ymCurrent)) monthActive += 1;
    });
    const daysInMonth = now.calendar.getDaysInMonth(now);
    return {
      total: trackingDates.length,
      monthActive,
      monthPct: daysInMonth ? Math.round((monthActive / daysInMonth) * 100) : 0,
    };
  }, [completionSet, trackingDates.length, now]);

  return (
    <div className="space-y-8">
      {/* Completion Summary — plain metrics, no boxes (§7) */}
      <div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="cx-eyebrow">Completion</p>
            <h3 className="mt-1 font-serif text-xl text-foreground">Summary</h3>
          </div>
          <span className="text-xs uppercase tracking-[0.05em] text-[hsl(var(--text-tertiary))]">
            {now.toDate(getLocalTimeZone()).toLocaleString(undefined, { month: "short", year: "numeric" })}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <SummaryStat label="Total" value={stats.total} />
          <SummaryStat label="This month" value={stats.monthActive} />
          <SummaryStat label="Month rate" value={`${stats.monthPct}%`} />
        </div>
      </div>

      {/* Calendar — no cell borders (§8) */}
      <div className="rounded-lg bg-[hsl(var(--bg-surface))] p-5">
        <Cal aria-label="Activity calendar" className="w-full">
          <header className="mb-4 flex items-center gap-1">
            <RACButton
              slot="previous"
              className="flex size-8 items-center justify-center rounded-md text-[hsl(var(--text-tertiary))] outline-none transition-colors hover:bg-[hsl(var(--bg-hover))] hover:text-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </RACButton>
            <Heading className="grow text-center text-sm font-medium text-foreground" />
            <RACButton
              slot="next"
              className="flex size-8 items-center justify-center rounded-md text-[hsl(var(--text-tertiary))] outline-none transition-colors hover:bg-[hsl(var(--bg-hover))] hover:text-foreground"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </RACButton>
          </header>

          <CalendarGrid className="w-full [&_table]:w-full [&_table]:border-collapse">
            <CalendarGridHeader>
              {(day) => (
                <CalendarHeaderCell className="cx-calendar-weekday">
                  {day}
                </CalendarHeaderCell>
              )}
            </CalendarGridHeader>
            <CalendarGridBody className="[&_td]:p-0.5">
              {(date) => {
                const dateStr = date.toString();
                const isCompleted = completionSet.has(dateStr);
                const isToday = date.compare(now) === 0;
                return (
                  <CalendarCell
                    date={date}
                    className={cn(
                      "cx-calendar-day",
                      "data-[outside-month]:opacity-30",
                      "data-[focus-visible]:ring-1 data-[focus-visible]:ring-[hsl(var(--ring))]",
                      isCompleted && "done",
                      isToday && !isCompleted && "today",
                    )}
                  />
                );
              }}
            </CalendarGridBody>
          </CalendarGrid>
        </Cal>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="cx-stat-value">{value}</div>
      <p className="cx-stat-label">{label}</p>
    </div>
  );
}

