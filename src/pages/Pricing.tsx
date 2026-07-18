import { useNavigate } from "react-router-dom";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";

type Row = { label: string; free: string | boolean; vision: string | boolean };

const rows: Row[] = [
  { label: "Notes", free: "50", vision: "Unlimited" },
  { label: "Entities", free: "20", vision: "Unlimited" },
  { label: "History retention", free: "30 days", vision: "Unlimited" },
  { label: "Upload metadata", free: "10 KB", vision: "2048 KB" },
  { label: "Native sync across devices", free: true, vision: true },
  { label: "Offline mode", free: true, vision: true },
  { label: "Knowledge graph", free: true, vision: true },
  { label: "Advanced metrics", free: false, vision: true },
  { label: "Data export", free: false, vision: true },
  { label: "Calendar sync", free: false, vision: true },
  { label: "Priority email support", free: false, vision: true },
];

function Cell({ value, accent }: { value: string | boolean; accent?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon className={`mx-auto h-4 w-4 ${accent ? "text-white" : "text-white/45"}`} />
    ) : (
      <MinusIcon className="mx-auto h-4 w-4 text-white/15" />
    );
  }
  return (
    <span className={`text-sm tabular-nums ${accent ? "text-white/90" : "text-white/60"}`}>{value}</span>
  );
}

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <a
          href="#/"
          className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white"
        >
          ← Back to home
        </a>

        <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">Plans & Pricing</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-white sm:text-5xl">
          Simple pricing.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
          Start free forever. Upgrade to VISION when you're ready to remove every limit.
        </p>

        {/* Plan headers */}
        <div className="mt-12 grid grid-cols-[1.4fr_1fr_1fr] items-end gap-2 border-b border-white/10 pb-5">
          <div />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">Free</p>
            <p className="mt-2 font-serif text-2xl text-white">$0</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/30">forever</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">Vision</p>
            <p className="mt-2 font-serif text-2xl text-white">$7.90</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/30">per month</p>
          </div>
        </div>

        {/* Comparison rows */}
        <dl className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[1.4fr_1fr_1fr] items-center gap-2 py-3.5">
              <dt className="text-sm text-white/70">{r.label}</dt>
              <dd className="text-center">
                <Cell value={r.free} />
              </dd>
              <dd className="text-center">
                <Cell value={r.vision} accent />
              </dd>
            </div>
          ))}
        </dl>

        {/* CTAs */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate("/register")}
            className="flex h-11 items-center justify-center border border-white/15 bg-transparent text-[11px] uppercase tracking-[0.28em] text-white/80 rounded-sm transition-colors hover:border-white/40 hover:text-white"
          >
            Start for free
          </button>
          <button
            onClick={() => navigate("/subscription")}
            className="flex h-11 items-center justify-center border border-white bg-white text-[11px] uppercase tracking-[0.28em] text-black rounded-sm transition-all hover:bg-transparent hover:text-white"
          >
            Upgrade to VISION
          </button>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.22em] text-white/30">
          Cancel anytime · Secure checkout
        </p>
      </div>
    </div>
  );
}
