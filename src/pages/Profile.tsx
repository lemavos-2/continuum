import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getCurrentPlan, getPlanLimits } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BadgeCheck, Loader2, Moon, Sun, Mail, User, Calendar, Lock } from "lucide-react";

const formatLimitValue = (value: number, suffix = "") => (value === -1 ? "Unlimited" : `${value}${suffix}`);

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { usage, loading: usageLoading } = usePlanGate();
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
      toast({ title: "Backup downloaded" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
      { label: "Vault storage", current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, suffix: " MB" },
    ],
    [usage, limits],
  );

  const planDetails = useMemo(
    () => [
      { label: "Vault limit", value: limits.maxVaultSizeMB === -1 ? "Unlimited" : `${limits.maxVaultSizeMB} MB` },
      { label: "Upload metadata limit", value: limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB` },
      { label: "History retention", value: limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days` },
    ],
    [limits],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({
        username,
        name: username,
      });
      await refreshUser();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({
        title: "Error saving profile",
        description: err.response?.data?.message || "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="border-b border-white/5 pb-6">
          <p className="text-[10px] tracking-wider uppercase text-neutral-500 font-semibold mb-1">Settings</p>
          <h1 className="font-serif text-4xl tracking-tight text-neutral-100">Profile</h1>
          <p className="text-xs text-neutral-500 mt-1">Manage your account information and system preferences.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* ACCOUNT SECTION */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-neutral-200">Account details</h2>
              <p className="text-xs text-neutral-500">Your personal identity inside the network.</p>
            </div>

            <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 space-y-4 shadow-inner">
              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className="pl-10 bg-neutral-900/40 border-white/5 text-neutral-200 placeholder:text-neutral-600 focus:border-white/10 focus:bg-neutral-900/60 transition-all rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="pl-10 pr-16 bg-neutral-900/20 border-white/5 text-neutral-500 cursor-not-allowed rounded-xl h-10"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                    Google
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">Connected via secure Google Sign-In</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-neutral-900/30 p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Plan tier</p>
                  <p className="text-sm font-semibold text-neutral-300">{currentPlan}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-neutral-900/30 p-3 flex flex-col gap-0.5">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Member since</p>
                  <p className="text-sm font-semibold text-neutral-300">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              {/* BOTÃO SALVAR REESTILIZADO PARA ESCURO TRASLÚCIDO OUTLINE */}
              <Button
                onClick={() => setSaveConfirmOpen(true)}
                disabled={saving || !username.trim()}
                variant="outline"
                className="w-full border-white/5 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/80 hover:text-white rounded-xl font-medium transition-all shadow-md h-10 mt-2"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
              <ConfirmDialog
                open={saveConfirmOpen}
                onOpenChange={setSaveConfirmOpen}
                title="Save profile changes?"
                description="Your username change will be updated across your account network."
                confirmText="Save"
                onConfirm={async () => {
                  setSaveConfirmOpen(false);
                  await handleSave();
                }}
              />
            </div>

            <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-200">Account status</p>
                <p className="text-[11px] text-neutral-500 truncate">Email {user?.emailVerified ? "verified and synchronized" : "pending verification"}</p>
              </div>
            </div>
          </section>

          {/* PREFERENCES SECTION */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-neutral-200">Preferences</h2>
              <p className="text-xs text-neutral-500">Tailor your interface and system runtime.</p>
            </div>

            {/* Theme Toggle */}
            <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-inner">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-neutral-200">Dark Mode theme</p>
                  <p className="text-[11px] text-neutral-500">Switch application skin preference</p>
                </div>
                <div className="flex items-center gap-2.5 bg-neutral-900/40 border border-white/5 rounded-xl p-1.5 shrink-0">
                  <Sun className="w-3.5 h-3.5 text-neutral-500" />
                  <Switch
                    checked={mounted ? theme !== "light" : true}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    disabled={!mounted}
                  />
                  <Moon className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              </div>
            </div>

            {/* History Info */}
            <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-200">History retention</p>
                <p className="text-[11px] text-neutral-500">{formatLimitValue(limits.historyDays, " days")}</p>
              </div>
            </div>

            {/* Security Info */}
            <div className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-200">Security layer</p>
                <p className="text-[11px] text-neutral-500">Tokens managed by federated Google auth</p>
              </div>
            </div>
          </section>
        </div>

        {/* PLAN LIMITS SECTION */}
        <section className="space-y-4 pt-2">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-neutral-200">Plan quotas & limits</h2>
            <p className="text-xs text-neutral-500">Live operational sync from your subscription tier.</p>
          </div>

          {usageLoading && !usage ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {usageResources.map((resource) => {
                const unlimited = resource.max === -1;
                const percent = unlimited ? 100 : Math.min((resource.current / resource.max) * 100, 100);

                return (
                  <div
                    key={resource.label}
                    className="border border-white/5 bg-neutral-900/20 backdrop-blur-md rounded-2xl p-5 shadow-inner space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-300">{resource.label}</span>
                      <span className="text-[11px] font-mono font-medium text-neutral-500 tabular-nums">
                        {unlimited ? "∞" : `${resource.current.toFixed(resource.suffix ? 1 : 0)}/${resource.max}${resource.suffix ?? ""}`}
                      </span>
                    </div>
                    <Progress value={unlimited ? 0 : percent} className="h-1 bg-white/5" />
                  </div>
                );
              })}
            </div>
          )}

          {/* METADATA, RETENTION & BACKUP GRID */}
          <div className="grid gap-4 md:grid-cols-3">
            {planDetails.map((detail) => (
              <div key={detail.label} className="border border-white/5 bg-neutral-900/20 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-500">{detail.label}</span>
                <span className="font-medium text-neutral-300 tabular-nums">{detail.value}</span>
              </div>
            ))}
            
            <div className="border border-white/5 bg-neutral-900/20 rounded-xl p-4 flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-500">Data export</span>
              {user?.dataExport ? (
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={exporting}
                  className="font-medium text-neutral-300 underline underline-offset-4 hover:text-white disabled:opacity-50 transition-colors"
                >
                  {exporting ? "Exporting…" : "Download backup"}
                </button>
              ) : (
                <span className="text-neutral-600 font-medium">Upgrade to enable</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
                    }
