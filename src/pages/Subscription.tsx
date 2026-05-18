import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { plansApi, subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type Plan, type PlanLimits } from "@/types";
import { Loader2, Crown, Zap, Rocket, Gem, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import PricingSection6 from "@/components/ui/pricing-section-4";

const planMeta: Record<Plan, { icon: any; color: string }> = {
  FREE: { icon: Crown, color: "text-muted-foreground" },
  PLUS: { icon: Zap, color: "text-primary" },
  PRO: { icon: Rocket, color: "text-warning" },
  VISION: { icon: Gem, color: "text-warning" },
};

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
      <div className="w-full">
        {sub && (
          <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-2 relative z-10 mb-8">
            <div className="bento-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => { const M = planMeta[currentPlan]; const I = M.icon; return <I className={cn("w-5 h-5", M.color)} />; })()}
                  <div>
                    <p className="font-semibold text-foreground">Current Plan <span className="text-primary">{currentPlan}</span></p>
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
          </div>
        )}
        
        <PricingSection6 />
      </div>
    </AppLayout>
  );
}
