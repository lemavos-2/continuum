import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AppLayout from "@/components/AppLayout";
import ContinuumDashboardPreview from "@/components/dashboard/ContinuumDashboardPreview";
import { dashboardApi, graphApi, metricsApi, notesApi, vaultApi, insightsApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { useCreateNote } from "@/hooks/useCreateNote";
import UpgradeModal from "@/components/UpgradeModal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPlanLimits, isUnlimited } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChartContainer } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowRight,
  HardDrive,
  Network,
  FileText,
  Tag,
  Flame,
  Users,
  Clock,
  TrendingUp,
  StickyNote,
  RefreshCw,
  Plus,
  Loader2
} from "@/lib/heroicons";

// --- TYPES & HELPERS ---
interface NoteInsight {
  note: { id: string; title: string; type?: string; entityIds?: string[]; updatedAt?: string; };
  score: number;
  badge: string;
  mentionCount: number;
  recentMentions: number;
  hoursTracked: number;
  entityConnections: number;
  uniqueDaysReferenced: number;
  daysSinceLastInteraction: number;
}

interface EntityInsight {
  entity: { id: string; title: string; type?: string; };
  score: number;
  badge: string;
  mentionCount: number;
  recentMentions: number;
  hoursTracked: number;
  relationsCount: number;
  uniqueDaysMentioned: number;
  daysSinceLastMention: number;
}

const rangeDaysMap = {
  "14d": 14,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
  "total": 3650,
};
type TimeRange = keyof typeof rangeDaysMap;

const formatHours = (h: number) => {
  if (!h) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(h < 10 ? 1 : 0)}h`;
};

const formatDays = (d: number) => {
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.round(d / 30)}mo ago`;
  return `${Math.round(d / 365)}y ago`;
};

const badgeStyle = (badge: string) => {
  const b = badge?.toLowerCase() || "";
  if (b.includes("hot")) return "bg-white/[0.06] text-white/90 border-white/20";
  if (b.includes("forgotten") || b.includes("gem")) return "bg-white/[0.04] text-white/70 border-white/10";
  return "bg-transparent text-white/50 border-white/10";
};

const formatNoteDate = (timestamp?: number) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function DashboardSkeleton() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <Skeleton className="h-4 w-28 bg-white/10" />
          <Skeleton className="mt-4 h-8 w-72 bg-white/10" />
          <Skeleton className="mt-3 h-4 w-96 bg-white/10" />
          <div className="mt-6 flex flex-wrap gap-2">
            <Skeleton className="h-10 w-24 bg-white/10" />
            <Skeleton className="h-10 w-24 bg-white/10" />
            <Skeleton className="h-10 w-28 bg-white/10" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <Skeleton className="h-4 w-20 bg-white/10" />
              <Skeleton className="mt-4 h-8 w-16 bg-white/10" />
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Skeleton className="h-5 w-40 bg-white/10" />
            <Skeleton className="mt-3 h-4 w-60 bg-white/10" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-10 w-full bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <Skeleton className="h-5 w-32 bg-white/10" />
            <Skeleton className="mt-3 h-4 w-48 bg-white/10" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-10 w-full bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// --- MAIN DASHBOARD ---
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { usage, applyUsageDelta } = usePlanGate();
  const { t } = useLanguage();
  const limits = getPlanLimits(user);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("14d");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);
  const { createNote, creating } = useCreateNote({ onLimitReached: () => setUpgradeOpen(true) });

  // Check for new account onboarding popup
  useEffect(() => {
    const isNewAccount = localStorage.getItem('newAccountCreated') === 'true';
    if (isNewAccount) {
      setShowOnboardingPopup(true);
      localStorage.removeItem('newAccountCreated');
    }
  }, []);

  // Insights State
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [hotNotes, setHotNotes] = useState<NoteInsight[]>([]);
  const [forgottenNotes, setForgottenNotes] = useState<NoteInsight[]>([]);
  const [hotEntities, setHotEntities] = useState<EntityInsight[]>([]);
  const [forgottenEntities, setForgottenEntities] = useState<EntityInsight[]>([]);

  const loadInsights = async (silent = false) => {
    if (!silent) setInsightsLoading(true);
    else setRefreshingInsights(true);
    try {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12),
        insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12),
        insightsApi.forgottenEntities(12),
      ]);
      
      const extractData = (res: any) => {
        if (!res) return [];
        const d = res.data;
        if (Array.isArray(d)) return d;
        if (d && typeof d === 'object') {
          return d.items || d.content || d.data || d.insights || [];
        }
        return [];
      };

      setHotNotes(extractData(hn));
      setForgottenNotes(extractData(fn));
      setHotEntities(extractData(he));
      setForgottenEntities(extractData(fe));
    } catch (err) {
      toast({ title: "Couldn't load insights", description: "Please try again.", variant: "destructive" });
    } finally {
      setInsightsLoading(false);
      setRefreshingInsights(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { authApi } = await import("@/lib/api");
      const res = await authApi.exportVaultZip();
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-vault.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export ready", description: "Your full vault was downloaded as a .zip." });
    } catch (e) {
      console.error("Export failed", e);
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
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

  const {
    data: scoreTimeline,
    isLoading: scoreTimelineLoading,
    isFetching: scoreTimelineFetching,
    isError: scoreTimelineError,
    refetch: refetchScoreTimeline,
  } = useQuery({
    queryKey: ["metrics", "scoreTimeline"],
    queryFn: () => metricsApi.scoreTimeline().then((r) => r.data),
    retry: 1,
    staleTime: 60_000,
  });

  const { data: vaultFiles } = useQuery({
    queryKey: ["vault", "files"],
    queryFn: () => vaultApi.list().then((r) => r.data),
  });

  const vaultFilesList = useMemo(() => {
    if (Array.isArray(vaultFiles)) return vaultFiles;
    if (vaultFiles && typeof vaultFiles === 'object') {
      return (vaultFiles as any).files || (vaultFiles as any).data || (vaultFiles as any).content || [];
    }
    return [];
  }, [vaultFiles]);

  const vaultUsedMB = useMemo(() => {
    return vaultFilesList.reduce((t: number, f: any) => t + (f?.size ?? 0) / (1024 * 1024), 0) ?? 0;
  }, [vaultFilesList]);

  const vaultMaxMB = limits.maxVaultSizeMB;
  const storageUsed = `${vaultUsedMB.toFixed(1)} MB`;
  const storageLimit = isUnlimited(vaultMaxMB) ? "∞" : `${vaultMaxMB} MB`;

  useEffect(() => {
    if (vaultFilesList == null || usage == null || vaultFilesList.length === 0) return;
    const storageMB = Number(vaultUsedMB.toFixed(2));
    applyUsageDelta({ vaultSizeMB: storageMB - usage.vaultSizeMB });
  }, [vaultFilesList, vaultUsedMB, usage, applyUsageDelta]);

  const recentNotes = useMemo(() => {
    const summaryNotes = summary?.recentNotes || (summary && typeof summary === 'object' ? ((summary as any).notes || (summary as any).data) : null);
    if (Array.isArray(summaryNotes) && summaryNotes.length > 0) {
      return summaryNotes.slice(0, 6);
    }
    const notesList = Array.isArray(notes) ? notes : (notes && typeof notes === 'object' ? ((notes as any).notes || (notes as any).data || (notes as any).content || []) : []);
    if (!Array.isArray(notesList) || notesList.length === 0) return [];
    return [...notesList]
      .filter((note: any) => note && (note.createdAt || note.updatedAt))
      .sort((a: any, b: any) => new Date(b.createdAt || b.updatedAt).getTime() - new Date(a.createdAt || a.updatedAt).getTime())
      .slice(0, 6)
      .map((note: any) => ({
        id: note.id,
        title: note.title,
        createdAtTimestamp: new Date(note.createdAt || note.updatedAt).getTime(),
      }));
  }, [summary, notes]);

  const graphNodeCount = useMemo(() => {
    if (graphData?.nodes) return graphData.nodes.length;
    if (Array.isArray(graphData)) return graphData.length;
    if (graphData && typeof graphData === 'object') return (graphData as any).totalNodes || (graphData as any).count || 0;
    return 0;
  }, [graphData]);

  const totalNotes = useMemo(() => {
    if (summary?.stats?.totalNotes !== undefined) return summary.stats.totalNotes;
    if ((summary as any)?.totalNotes !== undefined) return (summary as any).totalNotes;
    const notesList = Array.isArray(notes) ? notes : (notes && typeof notes === 'object' ? ((notes as any).notes || (notes as any).data || (notes as any).content || []) : []);
    if (Array.isArray(notesList)) return notesList.length;
    return 0;
  }, [summary, notes]);

  const totalEntities = useMemo(() => {
    if (summary?.stats?.totalEntities !== undefined) return summary.stats.totalEntities;
    if ((summary as any)?.totalEntities !== undefined) return (summary as any).totalEntities;
    return 0;
  }, [summary]);

  const { currentScore, fullHistory } = useMemo(() => {
    const rawHistory = Array.isArray(scoreTimeline)
      ? scoreTimeline
      : scoreTimeline && typeof scoreTimeline === "object"
        ? ((scoreTimeline as any).history ?? (scoreTimeline as any).timeline ?? (scoreTimeline as any).points ?? (scoreTimeline as any).data ?? [])
        : [];

    const normalized = rawHistory.reduce((acc: any[], point: any) => {
      if (!point?.date) return acc;
      const scoreValue = point.score !== undefined ? Number(point.score) : Number(point.value ?? 0);
      const dateStr = String(point.date).includes("T") ? point.date : `${point.date}T00:00:00`;
      const date = new Date(dateStr);
      if (!Number.isNaN(date.getTime()) && !Number.isNaN(scoreValue)) {
        acc.push({
          date: String(point.date).slice(0, 10),
          ts: date.getTime(),
          score: Number(scoreValue.toFixed(2)),
        });
      }
      return acc;
    }, [] as Array<{ date: string; ts: number; score: number }>);

    normalized.sort((a, b) => a.ts - b.ts);

    return {
      currentScore: normalized.length > 0 ? normalized[normalized.length - 1].score : 0,
      fullHistory: normalized,
    };
  }, [scoreTimeline]);

  // Local filtering by selected time range.
  const scoreTimelineData = useMemo(() => {
    const days = rangeDaysMap[timeRange];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a lookup of existing scores keyed by YYYY-MM-DD.
    const byDate = new Map<string, number>();
    fullHistory.forEach((p) => byDate.set(p.date, p.score));

    // "total" → span from earliest known date (or today) up to today.
    let spanDays = days;
    if (timeRange === "total") {
      const earliest = fullHistory[0]?.ts ?? today.getTime();
      const diff = Math.ceil((today.getTime() - earliest) / (24 * 60 * 60 * 1000)) + 1;
      spanDays = Math.max(diff, 14);
    }

    // Hard cap on point count to keep the chart readable.
    const MAX_POINTS = 365;
    const step = Math.max(1, Math.ceil(spanDays / MAX_POINTS));

    const points: Array<{ date: string; ts: number; score: number; label: string }> = [];
    for (let i = spanDays - 1; i >= 0; i -= step) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      points.push({
        date: key,
        ts: d.getTime(),
        score: byDate.get(key) ?? 0,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return points;
  }, [fullHistory, timeRange]);

  const scoreStats = useMemo(() => {
    const values = scoreTimelineData.map((p: any) => p.score);
    const max = Math.max(...values, 0.1);
    const hasData = scoreTimelineData.some((p: any) => p.score > 0);
    return { current: currentScore, max, hasData };
  }, [scoreTimelineData, currentScore]);

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
      <ContinuumDashboardPreview
        greeting={greeting}
        displayName={displayName}
        stats={[
          { label: t("notes_title"), value: totalNotes, delta: isUnlimited(limits.maxNotes) ? t("common_unlimited") : `${t("common_of")} ${limits.maxNotes}`, trend: "up" },
          { label: t("entities_title"), value: totalEntities, delta: isUnlimited(limits.maxEntities) ? t("common_unlimited") : `${t("common_of")} ${limits.maxEntities}`, trend: "up" },
          { label: "Graph nodes", value: graphNodeCount, delta: "in your network", trend: "up" },
          { label: "Storage", value: storageUsed, delta: `of ${storageLimit}`, trend: "neutral" },
        ]}
        documents={recentNotes.slice(0, 5).map((note) => ({
          title: note.title || "Untitled",
          type: "Note",
          connections: 0,
          updated: formatNoteDate(note.createdAtTimestamp),
        }))}
        onCreateNote={() => void createNote()}
        onOpenNotes={() => navigate("/notes")}
        onOpenEntities={() => navigate("/entities")}
        onOpenInsights={() => navigate("/insights")}
        onOpenActivities={() => navigate("/activities")}
        onOpenProjects={() => navigate("/projects")}
        onOpenGraph={() => navigate("/graph")}
        onOpenEditor={() => navigate("/notes")}
      />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="You've reached the notes limit for your plan." />

      <Dialog open={showOnboardingPopup} onOpenChange={setShowOnboardingPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Welcome to Continuum! 🎉</DialogTitle>
            <DialogDescription className="mt-2">
              Your knowledge graph is ready to grow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground/80">
              Did you know? You can import your existing notes as <span className="font-semibold">Markdown</span> files. Bring your knowledge from other tools and start building your graph right away.
            </p>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-white/50 mb-2">📥 Import supports:</p>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• Your notes in Markdown (.md) format</li>
                <li>• Automatic entity detection from mentions</li>
                <li>• Folder structure from your files</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnboardingPopup(false)}
              className="flex-1"
            >
              Got it
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowOnboardingPopup(false);
                navigate("/notes");
              }}
              className="flex-1"
            >
              Import notes →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}