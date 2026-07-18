import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getCurrentPlan, getPlanLimits } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  LockClosedIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  SunIcon,
  MoonIcon,
  LifebuoyIcon,
  ChatBubbleLeftEllipsisIcon,
  BugAntIcon,
  ChevronRightIcon,

} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import MarkdownImportDialog from "@/components/import/MarkdownImportDialog";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { flushQueue, getLastSyncAt } from "@/lib/offline/sync";
import { toast as sonnerToast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const formatLimitValue = (value: number, suffix = "") => (value === -1 ? "Unlimited" : `${value}${suffix}`);

function OfflineSyncRow() {
  const { status, pending, syncing } = useOfflineStatus();
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<number | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void getLastSyncAt().then((v) => alive && setLastSync(v));
    return () => { alive = false; };
  }, [pending, syncing]);

  const onSync = async () => {
    if (!navigator.onLine) {
      sonnerToast.error("You're offline. Changes will sync when you're back online.");
      return;
    }
    setBusy(true);
    try {
      const r = await flushQueue();
      if (r.sent === 0 && r.failed === 0) sonnerToast.success("Everything is up to date.");
      else if (r.failed === 0) sonnerToast.success(`${r.sent} change${r.sent === 1 ? "" : "s"} synced.`);
      else sonnerToast.warning(`${r.sent} synced, ${r.failed} failed — will retry.`);
    } finally {
      setBusy(false);
    }
  };

  const subtitle = status === "offline"
    ? `Working offline${pending > 0 ? ` · ${pending} pending` : ""}`
    : pending > 0
      ? `${pending} pending change${pending === 1 ? "" : "s"}`
      : lastSync
        ? `Last sync: ${new Date(lastSync).toLocaleString()}`
        : "Up to date";

  return (
    <div className="flex items-center gap-4 py-4">
      <ArrowPathIcon className={`h-4 w-4 text-foreground/30 shrink-0 ${syncing || busy ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground/70">Offline & Sync</p>
        <p className="text-xs text-foreground/30 truncate">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={busy || syncing}
        className="text-xs text-white/70 hover:text-white underline underline-offset-4 disabled:opacity-40"
      >
        {busy || syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { usage, loading: usageLoading } = usePlanGate();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
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
      toast({ title: "Backup downloaded successfully" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const currentPlan = getCurrentPlan(user);
  const limits = getPlanLimits(user);

  const usageResources = useMemo(
    () => [
      { label: "Notes", current: usage?.notesCount ?? 0, max: limits.maxNotes, suffix: "" },
      { label: "Entities", current: usage?.entitiesCount ?? 0, max: limits.maxEntities, suffix: "" },
      { label: "Vault Storage", current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, suffix: " MB" },
    ],
    [usage, limits],
  );

  const planDetails = useMemo(
    () => [
      { label: "Vault Limit", value: limits.maxVaultSizeMB === -1 ? "Unlimited" : `${limits.maxVaultSizeMB} MB` },
      { label: "Upload Metadata", value: limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB` },
      { label: "History", value: limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days` },
    ],
    [limits],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({ username, name: username });
      await refreshUser();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({
        title: "Error saving profile",
        description: err.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-16 space-y-12">

        {/* HEADER */}
        <header>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{t("profile_settings")}</p>
          <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">{t("profile_title")}</h1>
          <p className="mt-2 text-sm text-white/50">{t("profile_subtitle")}</p>
        </header>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ACCOUNT SECTION */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white/80">{t("profile_accountDetails")}</h2>
            </div>

            <div className="space-y-5 border border-white/5 bg-white/[0.01] p-6 rounded-sm">
              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-xs text-white/40">{t("profile_username")}</Label>
                <div className="relative">
                  <UserIcon className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("profile_usernamePlaceholder")}
                    className="w-full border-0 border-b border-white/10 bg-transparent pl-6 rounded-none text-sm text-white placeholder:text-white/20 focus:border-white/40 focus:outline-none focus:ring-0 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-xs text-white/40">{t("profile_emailAddress")}</Label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="w-full border-0 border-b border-white/5 bg-transparent pl-6 pr-16 rounded-none text-sm text-white/45 cursor-not-allowed focus:outline-none focus:ring-0"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-white/40 bg-white/[0.04] border border-white/5 px-1.5 py-0.5 rounded-sm">
                    Google
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
                <div>
                  <p className="text-xs text-white/30">{t("profile_currentPlan")}</p>
                  <p className="mt-1 text-sm font-medium text-white/70">{currentPlan === "VISION" ? "PRO" : currentPlan}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30">{t("profile_memberSince")}</p>
                  <p className="mt-1 text-sm font-medium text-white/70">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSaveConfirmOpen(true)}
                disabled={saving || !username.trim()}
                className="flex items-center justify-center gap-2 w-full h-9 border border-white/15 bg-transparent hover:border-white/40 text-white/80 hover:text-white rounded-sm text-sm font-medium transition-colors disabled:opacity-40 mt-4"
              >
                {saving && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                {t("profile_saveChanges")}
              </button>

              <ConfirmDialog
                open={saveConfirmOpen}
                onOpenChange={setSaveConfirmOpen}
                title={t("profile_saveConfirmTitle")}
                description={t("profile_saveConfirmDesc")}
                confirmText={t("common_save")}
                onConfirm={async () => {
                  setSaveConfirmOpen(false);
                  await handleSave();
                }}
              />
            </div>

            <div className="flex items-center gap-3 border border-white/5 bg-white/[0.01] p-4 rounded-sm">
              <ShieldCheckIcon className="h-4 w-4 text-white/40 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/70">{t("profile_secureAuth")}</p>
                <p className="text-xs text-white/30 truncate">{t("profile_secureAuthDesc")}</p>
              </div>
            </div>

            <div className="border border-white/5 bg-white/[0.01] p-5 rounded-sm space-y-3">
              <div className="flex items-start gap-3">
                <ArrowUpTrayIcon className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/70">{t("profile_importMd")}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {t("profile_importMdDesc")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportOpen(true)}
                className="w-full h-9 border border-white/15 bg-transparent hover:border-white/40 text-white/80 hover:text-white rounded-sm text-sm font-medium transition-colors"
              >
                {t("profile_importMdBtn")}
              </button>
            </div>
          </div>

          {/* PREFERENCES SECTION */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white/80">{t("profile_prefsAppearance")}</h2>
            </div>

            <div className="border-t border-b border-white/5 divide-y divide-white/[0.04] dark:border-white/5 light:border-black/5">
              <LanguageSelector />

              <div className="flex items-center gap-4 py-4">
                <CalendarIcon className="h-4 w-4 text-foreground/30 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground/70">{t("profile_history")}</p>
                  <p className="text-xs text-foreground/30">{limits.historyDays === -1 ? t("common_unlimited") : t("profile_historyDays", { n: limits.historyDays })}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-4">
                <LockClosedIcon className="h-4 w-4 text-foreground/30 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground/70">{t("profile_securityLayer")}</p>
                  <p className="text-xs text-foreground/30">{t("profile_securityLayerDesc")}</p>
                </div>
              </div>

              <OfflineSyncRow />
            </div>

            {/* HELP & SUPPORT */}
            <div className="border border-white/5 bg-white/[0.01] rounded-sm divide-y divide-white/[0.04]">
              <a
                href="#/support"
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
              >
                <LifebuoyIcon className="h-4 w-4 text-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/70">{t("profile_supportCenter")}</p>
                  <p className="text-xs text-foreground/30 truncate">{t("profile_supportCenterDesc")}</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-foreground/20 shrink-0" />
              </a>
              <a
                href="mailto:feedback@continuum.onl?subject=Continuum%20%E2%80%94%20Feedback"
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/70">{t("profile_sendFeedback")}</p>
                  <p className="text-xs text-foreground/30 truncate">feedback@continuum.onl</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-foreground/20 shrink-0" />
              </a>
              <a
                href="mailto:bugs@continuum.onl?subject=Continuum%20%E2%80%94%20Bug%20report"
                className="flex items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
              >
                <BugAntIcon className="h-4 w-4 text-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/70">{t("profile_reportBug")}</p>
                  <p className="text-xs text-foreground/30 truncate">bugs@continuum.onl</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-foreground/20 shrink-0" />
              </a>
            </div>
          </div>


          {/* LIMITS SECTION */}
          <section className="space-y-6 pt-4 border-t border-white/5 lg:col-span-2">
            <div>
              <h2 className="text-sm font-semibold text-white/80">{t("profile_planUsage")}</h2>
            </div>

            {usageLoading && !usage ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-5 h-5 animate-spin text-white/20" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {usageResources.map((resource) => {
                  const unlimited = resource.max === -1;
                  const percent = unlimited ? 100 : Math.min((resource.current / resource.max) * 100, 100);

                  return (
                    <div key={resource.label} className="border border-white/5 bg-white/[0.01] p-5 rounded-sm space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-white/80">{resource.label}</span>
                        <span className="text-xs text-white/40 tabular-nums">
                          {unlimited ? "∞" : `${resource.current.toFixed(resource.suffix ? 1 : 0)} / ${resource.max}${resource.suffix}`}
                        </span>
                      </div>
                      <Progress value={unlimited ? 0 : percent} className="h-[2px] bg-white/5 rounded-none" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* PLAN DETAILS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {planDetails.map((detail) => (
                <div key={detail.label} className="border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between gap-3 text-xs rounded-sm">
                  <span className="text-white/40 text-xs">{detail.label}</span>
                  <span className="text-xs text-white/70 tabular-nums">{detail.value}</span>
                </div>
              ))}

              <div className="border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between gap-3 text-xs rounded-sm">
                <span className="text-white/40 text-xs">{t("profile_exportData")}</span>
                {user?.dataExport ? (
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white underline underline-offset-4 disabled:opacity-40 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-3 h-3" />
                    {exporting ? t("profile_exporting") : t("profile_downloadBackup")}
                  </button>
                ) : (
                  <span className="text-white/20 text-xs">{t("profile_locked")}</span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      <MarkdownImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => { refreshUser(); }}
      />
    </AppLayout>
  );
}
