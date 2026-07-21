import { useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, BarChart3 } from "@/lib/heroicons";
import { useTimeAnalytics } from '@/hooks/useTimeAnalytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TimeAnalyticsCalendarProps {
  projectId?: string; // Filter analytics by project
  onDayClick?: (dayData: any) => void;
}

/**
 * Interactive calendar component for time analytics
 * Shows monthly view with time spent per day
 * Can be filtered by projectId for project-specific analytics
 */
export function TimeAnalyticsCalendar({ projectId, onDayClick }: TimeAnalyticsCalendarProps) {
  const {
    currentDate,
    canAccessAnalytics,
    calendarDays,
    dayDataMap,
    monthlyStats,
    isLoading,
    navigateMonth,
    goToToday,
    getDayData
  } = useTimeAnalytics();

  // Generate full calendar grid (including days from prev/next month for proper alignment)
  const fullCalendarGrid = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getIntensityBg = (seconds: number): string => {
    if (seconds === 0) return 'transparent';
    if (seconds < 1800) return 'hsl(43 20% 94% / 0.06)';
    if (seconds < 3600) return 'hsl(43 20% 94% / 0.10)';
    if (seconds < 7200) return 'hsl(43 20% 94% / 0.16)';
    return 'hsl(43 20% 94% / 0.24)';
  };

  if (!canAccessAnalytics) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Analytics Premium</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade your plan to access detailed time analytics and calendar view.
        </p>
        <Button>Upgrade Plan</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Monthly Stats — plain numbers, no boxes (§7) */}
      <div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="cx-eyebrow">Overview</p>
            <h3 className="mt-1 font-serif text-xl text-foreground">Monthly Summary</h3>
          </div>
          <Badge variant="secondary">{format(currentDate, 'MMM yyyy')}</Badge>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <div>
            <div className="cx-stat-value">{formatDuration(monthlyStats.totalSeconds)}</div>
            <p className="cx-stat-label">Total Time</p>
          </div>
          <div>
            <div className="cx-stat-value">{monthlyStats.activeDays}</div>
            <p className="cx-stat-label">Active Days</p>
          </div>
          <div>
            <div className="cx-stat-value">{monthlyStats.totalEntries}</div>
            <p className="cx-stat-label">Time Entries</p>
          </div>
          <div>
            <div className="cx-stat-value">{formatDuration(monthlyStats.averageDaily)}</div>
            <p className="cx-stat-label">Daily Average</p>
          </div>
        </div>
      </div>

      {/* Calendar — borderless cells (§8) */}
      <div className="rounded-lg bg-[hsl(var(--bg-surface))] p-5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="cx-calendar-weekday">{day}</div>
          ))}

          {fullCalendarGrid.map((date, index) => {
            const dayData = getDayData(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, new Date());
            const hasTime = dayData && dayData.totalSeconds > 0;

            return (
              <button
                key={index}
                onClick={() => dayData && onDayClick?.(dayData)}
                style={hasTime ? { background: getIntensityBg(dayData.totalSeconds) } : undefined}
                className={cnCal(
                  "min-h-[72px] rounded-md p-2 text-left cursor-pointer transition-colors",
                  "hover:bg-[hsl(var(--bg-hover))]",
                  !isCurrentMonth && "opacity-30",
                  isToday && "ring-1 ring-[hsl(var(--ring))]",
                )}
              >
                <div className="text-[13px] font-medium text-foreground/80">
                  {format(date, 'd')}
                </div>

                {isLoading ? (
                  <Skeleton className="mt-1 h-3 w-10" />
                ) : hasTime ? (
                  <div className="mt-1">
                    <div className="text-xs font-medium text-foreground">
                      {formatDuration(dayData.totalSeconds)}
                    </div>
                    <div className="text-[10px] text-[hsl(var(--text-tertiary))]">
                      {dayData.entries.length} entr{dayData.entries.length === 1 ? 'y' : 'ies'}
                    </div>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function cnCal(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}
