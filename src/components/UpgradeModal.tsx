import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { subscriptionApi } from "@/lib/api";
import { Loader2, Crown, Zap, Rocket, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeModalProps { open: boolean; onOpenChange: (open: boolean) => void; reason?: string; }

const plans = [
  { id: "PLUS", name: "Plus", price: "$19.90/month", icon: Zap, color: "text-primary", features: ["100 entities", "500 notes", "180 days history", "1GB Vault"] },
  { id: "PRO", name: "Pro", icon: Rocket, price: "$39.90/month", color: "text-warning", popular: true, features: ["Unlimited entities", "Unlimited notes", "2 years history", "2GB Vault"] },
  { id: "VISION", name: "Vision", icon: Gem, price: "$79.90/month", color: "text-warning", features: ["Unlimited entities", "Unlimited notes", "Unlimited history", "4GB Vault"] },
];

export default function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data } = await subscriptionApi.checkout(planId);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display text-xl">
            <Crown className="w-5 h-5 text-primary" />
            Upgrade your plan
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {reason || "You've reached your current plan limit. Upgrade to continue."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div key={plan.id} className={cn("bento-card p-4 space-y-3 relative", plan.popular && "border-primary/30")}>
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", plan.color)} />
                  <span className="font-semibold text-foreground text-sm">{plan.name}</span>
                </div>
                <p className="text-lg font-display font-bold text-foreground">{plan.price}</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn("w-full", plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border/50")}
                  size="sm"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!loadingPlan}
                >
                  {loadingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
