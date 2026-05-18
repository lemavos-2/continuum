import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { subscriptionApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeModalProps { open: boolean; onOpenChange: (open: boolean) => void; reason?: string; }

const plans = [
  { id: "PLUS", name: "Plus", price: "$19.90", features: ["100 entities", "500 notes", "180 days history", "1GB Vault"] },
  { id: "PRO", name: "Pro", price: "$39.90", popular: true, features: ["Unlimited entities", "Unlimited notes", "2 years history", "2GB Vault"] },
  { id: "VISION", name: "Vision", price: "$79.90", features: ["Unlimited entities", "Unlimited notes", "Unlimited history", "4GB Vault"] },
];

export default function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data } = await subscriptionApi.checkout(planId);
      if (data.url) window.location.href = data.url;
    } catch {
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-black/95 backdrop-blur-xl">
        <DialogHeader>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">Upgrade</p>
          <DialogTitle className="font-serif text-3xl tracking-tight text-white">
            Expand your continuum
          </DialogTitle>
          <DialogDescription className="text-sm text-white/50">
            {reason || "You've reached your current plan limit."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative space-y-4 rounded-sm border bg-white/[0.02] p-5 backdrop-blur-xl transition-colors",
                plan.popular ? "border-white/40" : "border-white/10 hover:border-white/25"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-sm border border-white/20 bg-black px-2 py-0.5 text-[9px] uppercase tracking-[0.22em] text-white/80">
                  Popular
                </span>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">{plan.name}</p>
                <p className="mt-1 font-serif text-3xl text-white">{plan.price}<span className="text-xs text-white/40">/mo</span></p>
              </div>
              <ul className="space-y-1.5 border-t border-white/10 pt-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                    <span aria-hidden className="mt-2 h-px w-2 bg-white/40" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={!!loadingPlan}
                onClick={() => handleCheckout(plan.id)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-sm border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-50",
                  plan.popular
                    ? "border-white bg-white text-black hover:bg-white/90"
                    : "border-white/20 text-white/80 hover:border-white/50 hover:text-white"
                )}
              >
                {loadingPlan === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Subscribe"}
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
