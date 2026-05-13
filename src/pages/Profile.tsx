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
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-50">Profile</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your account information.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account Section */}
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold text-white/90">Account</h2>
              <p className="text-sm text-white/50">Manage your information and preferences.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-xs text-white/70 uppercase tracking-wider">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className="pl-10 bg-white/5 border border-white/10 text-white/90 placeholder:text-white/30 focus:border-white/30 focus:bg-white/10 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-xs text-white/70 uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="pl-10 pr-16 bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white/50 bg-white/10 px-2 py-1 rounded">
                    Google
                  </span>
                </div>
                <p className="text-xs text-white/40">Connected via Google Sign-In</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Plan</p>
                  <p className="text-base font-semibold text-white/90">{currentPlan}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">Member Since</p>
                  <p className="text-base font-semibold text-white/90">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US") : "—"}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving || !username.trim()}
                className="w-full bg-white text-black hover:bg-gray-100 font-semibold shadow-lg transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-500/20 border border-zinc-500/30 flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Account Status</p>
                <p className="text-xs text-white/50">Email {user?.emailVerified ? "verified" : "pending verification"}</p>
              </div>
            </div>
          </section>

          {/* Preferences & Security Section */}
          <section className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold text-white/90">Preferences</h2>
              <p className="text-sm text-white/50">Customize your experience.</p>
            </div>

            {/* Theme Toggle */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white/90">Dark Mode</p>
                  <p className="text-xs text-white/50">Toggle interface theme</p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-2">
                  <Sun className="w-4 h-4 text-white/40" />
                  <Switch
                    checked={mounted ? theme !== "light" : true}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    disabled={!mounted}
                  />
                  <Moon className="w-4 h-4 text-white/40" />
                </div>
              </div>
            </div>

            {/* History Info */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-500/20 border border-zinc-500/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">History Retention</p>
                <p className="text-xs text-white/50">{formatLimitValue(limits.historyDays, " days")}</p>
              </div>
            </div>

            {/* Security Info */}
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-500/20 border border-zinc-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Security</p>
                <p className="text-xs text-white/50">Managed by Google Sign-In</p>
              </div>
            </div>
          </section>
        </div>

        {/* Plan Limits Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-white/90">Plan Limits</h2>
              <p className="text-sm text-white/50">Current usage synchronized with your account.</p>
            </div>
          </div>

          {usageLoading && !usage ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {usageResources.map((resource) => {
                const unlimited = resource.max === -1;
                const percent = unlimited ? 100 : Math.min((resource.current / resource.max) * 100, 100);
                const isCritical = percent >= 90;
                const isWarning = percent >= 70;

                return (
                  <div
                    key={resource.label}
                    className={`rounded-xl border backdrop-blur-sm p-4 space-y-3 transition-all ${
                      isCritical
                        ? "border-zinc-500/50 bg-zinc-500/10"
                        : isWarning
                        ? "border-zinc-500/50 bg-zinc-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white/90">{resource.label}</span>
                      <span className={`text-xs font-mono font-medium ${
                        isCritical ? "text-zinc-300" : isWarning ? "text-zinc-300" : "text-white/60"
                      }`}>
                        {unlimited ? "∞" : `${resource.current.toFixed(resource.suffix ? 1 : 0)}/${resource.max}${resource.suffix ?? ""}`}
                      </span>
                    </div>
                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCritical
                            ? "bg-gradient-to-r from-zinc-500 to-zinc-400"
                            : isWarning
                            ? "bg-gradient-to-r from-zinc-500 to-zinc-400"
                            : "bg-gradient-to-r from-zinc-500 to-zinc-400"
                        }`}
                        style={{ width: `${unlimited ? 0 : percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {planDetails.map((detail) => (
              <div key={detail.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                  <span>{detail.label}</span>
                  <span className="font-semibold text-white/90">{detail.value}</span>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-white/50">
                <span>Data export</span>
                {user?.dataExport ? (
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="font-semibold text-white/90 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {exporting ? "Exporting…" : "Download backup"}
                  </button>
                ) : (
                  <span className="font-semibold text-white/60">Upgrade to enable</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}