import { useMemo } from "react";
import {
  Calendar as Cal,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  Button as RACButton,
} from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { ArrowRight } from "@/lib/heroicons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActivityCompletionCalendarProps {
  entityId: string;
  trackingDates?: string[];
  onMarkComplete?: () => void;
  onOpenDetail?: () => void;
}

/**
 * Inline preview calendar for activities — visually aligned with
 * ActivityAnalyticsCalendar (RAC + monospace headers) but compact.
 */
export function ActivityCompletionCalendar({
  entityId,
  trackingDates = [],
  onMarkComplete,
  onOpenDetail,
}: ActivityCompletionCalendarProps) {
  void entityId;
  void onMarkComplete;

  const completionSet = useMemo(() => {
    const s = new Set<string>();
    trackingDates.forEach((d) => s.add(d.split("T")[0]));
    return s;
  }, [trackingDates]);

  const now = today(getLocalTimeZone());

  return (
    <div className="w-full rounded-lg bg-[hsl(var(--bg-surface))] p-4 sm:p-5">
      <Cal aria-label="Activity calendar" className="w-full">
        <header className="mb-3 flex items-center gap-1">
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

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-[hsl(var(--text-tertiary))]">
          <span className="text-foreground font-medium">{trackingDates.length}</span> tracked
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={onOpenDetail}
        >
          Open detail
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

