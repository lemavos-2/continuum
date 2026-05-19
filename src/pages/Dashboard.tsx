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
    <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-6">
      <div className="h-16 rounded-2xl bg-neutral-900/40 border border-white/5 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-[340px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-5 h-[340px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-7 h-[280px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
        <div className="lg:col-span-5 h-[280px] rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse" />
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
    <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-1.5 min-w-0 shadow-inner transition-all duration-300 hover:border-white/10">
      <div className="flex items-center gap-2 text-neutral-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-semibold text-neutral-100 tabular-nums leading-none mt-1">{value}</p>
      {hint && <p className="text-[11px] text-neutral-500 truncate mt-0.5">{hint}</p>}
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
      return (response.data as Entity[]).filter(
        (entity) => entity.type === "ACTIVITY" || entity.type === "PROJECT",
      );
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
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto space-y-6">
        
        {/* HEADER COM BOTÃO "NEW NOTE" COMBINANDO COM O VAULT / DESIGN SISTEMA */}
        <header className="border-b border-white/5 pb-6 mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold mb-1">Overview</p>
            <h1 className="font-serif text-4xl tracking-tight text-neutral-100">
              {greeting}, {displayName}
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Here's what's happening across your knowledge graph.
            </p>
          </div>
          <Button 
            onClick={() => navigate("/notes")} 
            size="sm"
            variant="outline"
            className="gap-2 border-white/5 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/80 hover:text-white rounded-xl self-start sm:self-auto transition-all shadow-md h-9"
          >
            <Plus className="h-4 w-4" /> New note
          </Button>
        </header>

        {/* CONTADORES / CARDS KPI */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Notes" value={totalNotes} hint={limits.maxNotes === -1 ? "Unlimited" : `of ${limits.maxNotes}`} />
          <StatCard icon={Tag} label="Entities" value={totalEntities} hint={limits.maxEntities === -1 ? "Unlimited" : `of ${limits.maxEntities}`} />
          <StatCard icon={Network} label="Graph nodes" value={graphNodeCount} hint="In your network" />
          <StatCard icon={HardDrive} label="Storage" value={storageUsed} hint={`of ${storageLimit}`} />
        </section>

        {/* CORPO DO DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* GRÁFICO HISTÓRICO DE NOTAS */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Share2 className="h-4 w-4 text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200">Notes over time</h2>
                  <p className="text-xs text-neutral-500">Last 14 days</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/graph")}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Explore graph →
              </button>
            </div>
            <div className="h-[220px] sm:h-[250px] -mx-2">
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={noteTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="notesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="white" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#737373", fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#737373", fontSize: 10 }} width={24} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0a0a0a",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "#f5f5f5"
                      }}
                      labelStyle={{ color: "#737373" }}
                    />
                    <Area type="monotone" dataKey="count" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} fill="url(#notesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>

          {/* PLAN USAGE CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-5 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Activity className="h-4 w-4 text-neutral-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-neutral-200">Plan usage</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                  {user?.plan || "FREE"}
                </span>
              </div>

              {usage ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Notes</span>
                      <span className="text-neutral-200 font-mono tabular-nums">
                        {usage.notesCount} / {limits.maxNotes === -1 ? "∞" : limits.maxNotes}
                      </span>
                    </div>
                    <Progress value={limits.maxNotes === -1 ? "0" : Math.min((usage.notesCount / limits.maxNotes) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Entities</span>
                      <span className="text-neutral-200 font-mono tabular-nums">
                        {usage.entitiesCount} / {limits.maxEntities === -1 ? "∞" : limits.maxEntities}
                      </span>
                    </div>
                    <Progress value={limits.maxEntities === -1 ? "0" : Math.min((usage.entitiesCount / limits.maxEntities) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Vault storage</span>
                      <span className="text-neutral-200 font-mono tabular-nums">{storageUsed} / {storageLimit}</span>
                    </div>
                    <Progress value={limits.maxVaultSizeMB === -1 ? "0" : Math.min((usage.vaultSizeMB / limits.maxVaultSizeMB) * 100, 100)} className="h-1 bg-white/5" />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-500">Loading usage…</div>
              )}

              <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-neutral-500 text-[10px] uppercase font-medium">History retention</span>
                    <span className="text-neutral-300 font-medium">{limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days`}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="text-neutral-500 text-[10px] uppercase font-medium">Metadata limit</span>
                    <span className="text-neutral-300 font-medium">{limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB`}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 sm:col-span-2 pt-2 border-t border-white/5 mt-1">
                    <span>Data export</span>
                    {user?.dataExport ? (
                      <button
                        type="button"
                        onClick={handleExportData}
                        disabled={exporting}
                        className="text-neutral-200 underline underline-offset-4 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        {exporting ? "Exporting…" : "Download backup"}
                      </button>
                    ) : (
                      <span className="text-neutral-500 text-xs">Upgrade to enable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/subscription")}
              className="mt-5 text-xs text-neutral-400 hover:text-white self-start transition-colors"
            >
              Manage subscription →
            </button>
          </div>

          {/* RECENT NOTES CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-5 flex flex-col shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="h-4 w-4 text-neutral-400" />
                </div>
                <h2 className="text-sm font-semibold text-neutral-200">Recent notes</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/notes")}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    className="group w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition-all hover:bg-neutral-900/40 hover:border-white/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-300 group-hover:text-white truncate">{note.title || "Untitled"}</p>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-0.5 text-[10px] font-mono text-neutral-500">{formatNoteDate(note.createdAtTimestamp)}</p>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 bg-neutral-900/5 p-6 text-center text-xs text-neutral-500">
                  No recent notes yet.
                </div>
              )}
            </div>
          </div>

          {/* TODAY'S ACTIVITIES CARD */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-7 flex flex-col shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-neutral-400" />
                </div>
                <h2 className="text-sm font-semibold text-neutral-200">Today's activities</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/activities")}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Open
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 flex-1 content-start overflow-y-auto max-h-[300px]">
              {todayActivities.length > 0 ? (
                todayActivities.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/5 bg-neutral-900/30 px-3 py-2.5 flex items-center justify-between gap-3 min-w-0"
                  >
                    <p className="text-xs font-medium text-neutral-300 truncate">{item.title}</p>
                    <span className="rounded-lg bg-white/5 border border-white/5 px-2 py-0.5 text-[10px] font-mono text-neutral-400 shrink-0 tabular-nums">
                      {item.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 rounded-xl border border-dashed border-white/5 bg-neutral-900/5 p-6 text-center text-xs text-neutral-500">
                  No activities tracked today.
                </div>
              )}
            </div>
          </div>

          {/* TIMERS COMPONENT E INSPEÇÃO */}
          <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 lg:col-span-12 flex flex-col shadow-inner">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Timer className="h-4 w-4 text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-200">Timers</h2>
                  <p className="text-xs text-neutral-500">Tap to inspect a timer's daily trend.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/activities")}
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Open
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-4 snap-x scrollbar-none">
              {Array.isArray(timerSummaries) && timerSummaries.length > 0 ? (
                timerSummaries.slice(0, 8).map((timer: any) => {
                  const active = selectedTimer === timer.entityId;
                  return (
                    <button
                      key={timer.entityId}
                      type="button"
                      onClick={() => setSelectedTimer(timer.entityId)}
                      className={`shrink-0 snap-start min-w-[140px] max-w-[180px] rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
                        active
                          ? "border-neutral-400/40 bg-white/5 shadow-md"
                          : "border-white/5 bg-neutral-900/30 hover:border-white/10 hover:bg-neutral-900/50"
                      }`}
                    >
                      <p className="text-xs font-medium text-neutral-300 truncate">{timer.entityTitle}</p>
                      <p className="mt-1 text-sm font-mono font-semibold text-neutral-400 tabular-nums">
                        {timer.formattedTotal ?? formatTime(timer.totalSeconds ?? 0)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="flex-1 rounded-xl border border-dashed border-white/5 bg-neutral-900/5 p-4 text-center text-xs text-neutral-500">
                  No timers yet.
                </div>
              )}
            </div>

            <div className="h-[200px] sm:h-[240px] rounded-xl border border-white/5 bg-neutral-950/20 p-3">
              {selectedTimer && timerChartData.length > 0 ? (
                <ChartContainer config={{}} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timerChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#737373", fontSize: 10 }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#737373", fontSize: 10 }}
                        width={28}
                        tickFormatter={(v) => `${Math.round(Number(v) / 60)}m`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0a0a0a",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "#f5f5f5"
                        }}
                        formatter={(v: any) => [formatTime(Number(v)), "Time"]}
                      />
                      <Line type="monotone" dataKey="value" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-neutral-500">
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
