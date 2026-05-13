import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { dashboardApi, entitiesApi, graphApi, notesApi, trackingApi, timeTrackingApi, vaultApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getPlanLimits } from "@/lib/plan";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Share2,
  Activity,
  FolderOpen,
  ArrowRight,
  HardDrive,
  Network,
  FileText,
  Tag,
  Timer,
} from "lucide-react";
import type { Entity } from "@/types";

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((value) => String(value).padStart(2, "0")).join(":");
};

const DashboardSkeleton = () => (
  <AppLayout>
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
      <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-7 h-[340px] rounded-xl bg-muted/40 animate-pulse" />
        <div className="lg:col-span-5 h-[340px] rounded-xl bg-muted/40 animate-pulse" />
        <div className="lg:col-span-7 h-[280px] rounded-xl bg-muted/40 animate-pulse" />
        <div className="lg:col-span-5 h-[280px] rounded-xl bg-muted/40 animate-pulse" />
      </div>
    </div>
  </AppLayout>
);

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}

function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <div className="bento-card flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[11px] uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-semibold text-foreground tabular-nums leading-tight">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { usage, applyUsageDelta } = usePlanGate();
  const limits = getPlanLimits(user);

  const [selectedTimer, setSelectedTimer] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { authApi } = await import("@/lib/api");
      const res = await authApi.exportData();
      const json = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary().then((r) => r.data),
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", "list"],
    queryFn: () => notesApi.list().then((r) => r.data),
  });

  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then((r) => r.data),
  });

  const { data: activities } = useQuery({
    queryKey: ["entities", "activities"],
    queryFn: async () => {
      const response = await entitiesApi.list();
      return (response.data as Entity[]).filter((entity) => entity.type === "ACTIVITY");
    },
  });

  const { data: vaultFiles } = useQuery({
    queryKey: ["vault", "files"],
    queryFn: () => vaultApi.list().then((r) => r.data),
  });

  const { data: todayTracking } = useQuery({
    queryKey: ["tracking", "today"],
    queryFn: () => trackingApi.today().then((r) => r.data),
  });

  const { data: timerSummaries } = useQuery({
    queryKey: ["timeTracking", "summaries"],
    queryFn: () => timeTrackingApi.getAllSummaries().then((r) => r.data),
  });

  const { data: selectedTimerBreakdown } = useQuery({
    queryKey: ["timeTracking", "breakdown", selectedTimer],
    queryFn: () => selectedTimer ? timeTrackingApi.getDailyBreakdown(selectedTimer).then((r) => r.data) : Promise.resolve([]),
    enabled: Boolean(selectedTimer),
  });

  useEffect(() => {
    if (!selectedTimer && Array.isArray(timerSummaries) && timerSummaries.length > 0) {
      setSelectedTimer(timerSummaries[0].entityId);
    }
  }, [selectedTimer, timerSummaries]);

  const vaultUsedMB = vaultFiles?.reduce((t, f) => t + f.size / (1024 * 1024), 0) ?? 0;
  const vaultMaxMB = limits.maxVaultSizeMB;
  const storageUsed = `${vaultUsedMB.toFixed(1)} MB`;
  const storageLimit = vaultMaxMB === -1 ? "Unlimited" : `${vaultMaxMB} MB`;

  useEffect(() => {
    if (vaultFiles == null || usage == null) return;
    const storageMB = Number(vaultUsedMB.toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [vaultFiles, vaultUsedMB, usage, applyUsageDelta]);

  const noteTimeline = useMemo(() => {
    if (!Array.isArray(notes)) return [];
    const counts: Record<string, number> = {};
    notes.forEach((note: any) => {
      if (!note.createdAt) return;
      const date = note.createdAt.split("T")[0];
      counts[date] = (counts[date] || 0) + 1;
    });

    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const iso = date.toISOString().split("T")[0];
      return {
        date: iso,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: counts[iso] || 0,
      };
    });
  }, [notes]);

  const recentNotes = useMemo(() => {
    if (summary?.recentNotes && summary.recentNotes.length > 0) {
      return summary.recentNotes.slice(0, 6);
    }
    if (!Array.isArray(notes)) return [];
    return [...notes]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)
      .map((note: any) => ({
        id: note.id,
        title: note.title,
        createdAtTimestamp: new Date(note.createdAt).getTime(),
      }));
  }, [summary?.recentNotes, notes]);

  const todayActivities = useMemo(() => {
    if (!Array.isArray(activities) || !Array.isArray(todayTracking)) return [];
    return todayTracking
      .map((entry: any) => {
        const entity = activities.find((activity) => activity.id === entry.entityId);
        return {
          id: entry.entityId,
          title: entity?.title ?? entry.entityId,
          time: entry.durationSeconds ? formatTime(entry.durationSeconds) : entry.duration || "00:00",
        };
      })
      .slice(0, 6);
  }, [activities, todayTracking]);

  const timerChartData = useMemo(() => {
    if (!Array.isArray(selectedTimerBreakdown)) return [];
    return selectedTimerBreakdown.map((point: any) => ({
      name: point.date ? point.date.slice(5) : "",
      value: point.durationSeconds ?? point.duration ?? 0,
    }));
  }, [selectedTimerBreakdown]);

  const graphNodeCount = graphData?.nodes?.length ?? 0;
  const totalNotes = summary?.stats?.totalNotes ?? 0;
  const totalEntities = summary?.stats?.totalEntities ?? 0;

  if (summaryLoading) return <DashboardSkeleton />;

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = user?.username || user?.email?.split("@")[0] || "there";

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
              {greeting}, {displayName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what's happening across your knowledge graph.
            </p>
          </div>
          <Button onClick={() => navigate("/notes")} size="sm" className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> New note
          </Button>
        </header>

        {/* KPI grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={FileText} label="Notes" value={totalNotes} hint={limits.maxNotes === -1 ? "Unlimited" : `of ${limits.maxNotes}`} />
          <StatCard icon={Tag} label="Entities" value={totalEntities} hint={limits.maxEntities === -1 ? "Unlimited" : `of ${limits.maxEntities}`} />
          <StatCard icon={Network} label="Graph nodes" value={graphNodeCount} hint="In your network" />
          <StatCard icon={HardDrive} label="Storage" value={storageUsed} hint={`of ${storageLimit}`} />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Notes timeline */}
          <div className="bento-card lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="bento-icon-box !h-8 !w-8">
                  <Share2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Notes over time</h2>
                  <p className="text-xs text-muted-foreground">Last 14 days</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/graph")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore graph →
              </button>
            </div>
            <div className="h-[220px] sm:h-[260px] -mx-2">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={noteTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="notesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={28} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#notesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          {/* Plan usage */}
          <div className="bento-card lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="bento-icon-box !h-8 !w-8">
                  <Activity className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Plan usage</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
                {user?.plan || "FREE"}
              </span>
            </div>

            {usage ? (
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="text-foreground tabular-nums">
                      {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
                    </span>
                  </div>
                  <Progress value={limits.maxNotes === -1 ? 0 : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Entities</span>
                    <span className="text-foreground tabular-nums">
                      {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
                    </span>
                  </div>
                  <Progress value={limits.maxEntities === -1 ? 0 : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1.5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Vault storage</span>
                    <span className="text-foreground tabular-nums">{storageUsed} / {storageLimit}</span>
                  </div>
                  <Progress
                    value={
                      limits.maxVaultSizeMB === -1
                        ? 0
                        : Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)
                    }
                    className="h-1.5"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading usage…</div>
            )}

            <div className="space-y-4 mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>History retention</span>
                  <span className="text-foreground">
                    {limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Upload metadata limit</span>
                  <span className="text-foreground">
                    {limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground sm:col-span-2">
                  <span>Data export</span>
                  {user?.dataExport ? (
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {exporting ? "Exporting…" : "Download backup"}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Upgrade to enable</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="mt-5 text-xs text-muted-foreground hover:text-foreground self-start"
            >
              Manage subscription →
            </button>
          </div>

          {/* Recent notes */}
          <div className="bento-card lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="bento-icon-box !h-8 !w-8">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Recent notes</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/notes")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all
              </button>
            </div>
            <div className="space-y-1.5 flex-1">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group w-full rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-muted/40 hover:border-border"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground truncate">{note.title || "Untitled"}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatNoteDate(note.createdAtTimestamp)}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  No recent notes yet.
                </div>
              )}
            </div>
          </div>

          {/* Today's activities */}
          <div className="bento-card lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="bento-icon-box !h-8 !w-8">
                  <Activity className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Today's activities</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/time-tracking")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Open
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 flex-1">
              {todayActivities.length > 0 ? (
                todayActivities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex items-center justify-between gap-3 min-w-0"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <span className="rounded-md bg-background/60 px-2 py-0.5 text-[11px] tabular-nums text-foreground shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  No activities tracked today.
                </div>
              )}
            </div>
          </div>

          {/* Timers */}
          <div className="bento-card lg:col-span-12 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="bento-icon-box !h-8 !w-8">
                  <Timer className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Timers</h2>
                  <p className="text-xs text-muted-foreground">Tap to inspect a timer's daily trend.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/time-tracking")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Open
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4 snap-x">
              {Array.isArray(timerSummaries) && timerSummaries.length > 0 ? (
                timerSummaries.slice(0, 8).map((timer: any) => {
                  const active = selectedTimer === timer.entityId;
                  return (
                    <button
                      key={timer.entityId}
                      type="button"
                      onClick={() => setSelectedTimer(timer.entityId)}
                      className={`shrink-0 snap-start min-w-[140px] max-w-[180px] rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground truncate">{timer.entityTitle}</p>
                      <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                        {timer.formattedTotal ?? formatTime(timer.totalSeconds ?? 0)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  No timers yet.
                </div>
              )}
            </div>

            <div className="h-[200px] sm:h-[240px] rounded-lg border border-border bg-muted/10 p-2">
              {selectedTimer && timerChartData.length > 0 ? (
                <ChartContainer config={{}} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        width={32}
                        tickFormatter={(v) => `${Math.round(Number(v) / 60)}m`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [formatTime(Number(v)), "Time"]}
                      />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {selectedTimer ? "No data for this timer yet." : "Select a timer to view its trend."}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
