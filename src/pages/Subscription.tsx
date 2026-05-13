import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { plansApi, subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type Plan, type PlanLimits } from "@/types";
import { Loader2, Crown, Zap, Rocket, Gem, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";

const planMeta: Record<Plan, { icon: any; color: string }> = {
  FREE: { icon: Crown, color: "text-muted-foreground" },
  PLUS: { icon: Zap, color: "text-primary" },
  PRO: { icon: Rocket, color: "text-warning" },
  VISION: { icon: Gem, color: "text-warning" },
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface SubInfo { plan?: string; effectivePlan?: string; status: string; currentPeriodEnd?: string; }

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => { subscriptionApi.me().then(({ data }) => setSub(data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    let active = true;
    plansApi.list()
      .then(({ data }) => { if (active) setPlans(data); })
      .catch(() => {})
      .finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { data } = await subscriptionApi.checkout(planId);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Try again", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    try { await subscriptionApi.cancel(); toast({ title: "Subscription canceled" }); const { data } = await subscriptionApi.me(); setSub(data); }
    catch { toast({ title: "Error canceling subscription", variant: "destructive" }); }
  };

  const currentPlan = ((sub?.effectivePlan || user?.plan) as Plan) || "FREE";
  const [plans, setPlans] = useState<Array<{ plan: Plan; limits: PlanLimits; priceId?: string }>>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const formatLimit = (val: number, suffix = "") => val === -1 ? "Unlimited" : `${val}${suffix}`;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your plan and limits</p>
        </div>

        {sub && (
          <div className="bento-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(() => { const M = planMeta[currentPlan]; const I = M.icon; return <I className={cn("w-5 h-5", M.color)} />; })()}
                <div>
                  <p className="font-semibold text-foreground">Plan <span className="text-primary">{currentPlan}</span></p>
                  <p className="text-xs text-muted-foreground">
                    Status: {sub.status} {sub.currentPeriodEnd && `· Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-US")}`}
                  </p>
                </div>
              </div>
              {currentPlan !== "FREE" && (
                <Button variant="outline" size="sm" onClick={handleCancel} className="border-border/50 text-muted-foreground hover:text-foreground">Cancel</Button>
              )}
            </div>
          </div>
        )}

        {loading || planLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((planInfo) => {
              const plan = planInfo.plan;
              const limits = planInfo.limits;
              const meta = planMeta[plan];
              const Icon = meta.icon;
              const isCurrent = plan === currentPlan;
              const prices: Record<Plan, string> = { FREE: "Free", PLUS: "$19.90/month", PRO: "$39.90/month", VISION: "$79.90/month" };
              return (
                <div key={plan} className={cn("bento-card p-5 space-y-4", isCurrent && "border-primary/30")}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", meta.color)} />
                    <span className="font-semibold text-foreground">{plan}</span>
                  </div>
                  <p className="text-xl font-display font-bold text-foreground">{prices[plan]}</p>
                  <ul className="space-y-2 text-sm">
                    {[
                      `${formatLimit(limits.maxEntities)} entities`,
                      `${formatLimit(limits.maxNotes)} notes`,
                      `${formatLimit(limits.historyDays, " days")} history`,
                      `${formatLimit(limits.maxVaultSizeMB, "MB")} Vault`,
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" size="sm" disabled>Current Plan</Button>
                  ) : plan === "FREE" ? (
                    <Button variant="outline" className="w-full border-border/50" size="sm" disabled>Free Plan</Button>
                  ) : (
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm" onClick={() => handleCheckout(plan)} disabled={!!checkoutLoading}>
                      {checkoutLoading === plan ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
