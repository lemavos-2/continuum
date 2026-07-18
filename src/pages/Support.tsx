import { useState } from "react";
import {
  Mail,
  MessageSquare,
  Bug,
  ChevronDown,
} from "@/lib/heroicons";

const FEEDBACK_EMAIL = "feedback@continuum.onl";
const CONTACT_EMAIL = "contact@continuum.onl";
const BUG_EMAIL = "bugs@continuum.onl";

function mailto(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const cards = [
  {
    icon: MessageSquare,
    title: "Send feedback",
    description: "Share ideas, suggestions, or anything you'd love to see in Continuum.",
    action: "Write feedback",
    href: mailto(
      FEEDBACK_EMAIL,
      "Continuum — Feedback",
      "Hi Continuum team,\n\nHere's my feedback:\n\n",
    ),
  },
  {
    icon: Mail,
    title: "Contact us",
    description: "Questions about your account, billing, or anything else? We're here.",
    action: "Contact support",
    href: mailto(
      CONTACT_EMAIL,
      "Continuum — Contact",
      "Hi Continuum team,\n\nI'd like to get in touch about:\n\n",
    ),
  },
  {
    icon: Bug,
    title: "Report a bug",
    description: "Found something broken? Tell us what happened so we can fix it fast.",
    action: "Report bug",
    href: mailto(
      BUG_EMAIL,
      "Continuum — Bug report",
      "Hi Continuum team,\n\nWhat happened:\n\nSteps to reproduce:\n1.\n2.\n3.\n\nWhat I expected:\n\nDevice / browser:\n\n",
    ),
  },
];

const faqs = [
  {
    q: "How does Continuum sync across my devices?",
    a: "Your knowledge graph syncs natively across every device where you're signed in. No plugins or manual setup — just open the app and everything is there. When offline, changes are saved locally and synced automatically once you're back online.",
  },
  {
    q: "Can I use Continuum offline?",
    a: "Yes. Continuum is a PWA with full offline support. You can read and edit your notes without a connection, and your changes sync the next time you're online.",
  },
  {
    q: "How do mentions and entities work?",
    a: "Type @ to mention people or projects and # to reference topics. Every mention becomes a living link that strengthens your knowledge graph, so related notes resurface when you need them.",
  },
  {
    q: "What is the Score System?",
    a: "Notes and entities earn relevance based on how you interact with them. The most important items float to the top automatically — no manual tagging required.",
  },
  {
    q: "How do I manage my subscription?",
    a: "Go to Subscription from the menu to view your plan, upgrade, or manage billing at any time.",
  },
  {
    q: "How can I delete my account or data?",
    a: "You can request access, correction, or deletion of your data at any time by contacting us at contact@continuum.onl. We'll respond promptly.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 bg-white/[0.02] rounded-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-white/85">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="px-5 pb-5 text-sm leading-7 text-white/50">{a}</p>
      )}
    </div>
  );
}

export default function Support() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="#/"
          className="mb-8 inline-flex text-sm font-semibold uppercase tracking-[0.28em] text-zinc-400 transition hover:text-white"
        >
          ← Back to home
        </a>

        <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">Help & Contact</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-white sm:text-5xl">Support center</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
          Need a hand? Send us feedback, get in touch, report a bug, or browse the most common questions.
        </p>

        {/* Action cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.title}
                href={c.href}
                className="group flex flex-col border border-white/10 bg-white/[0.02] p-5 rounded-sm transition hover:border-white/30 hover:bg-white/[0.04]"
              >
                <Icon className="h-6 w-6 text-white/70" />
                <h2 className="mt-4 text-base font-medium text-white/90">{c.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-white/50">{c.description}</p>
                <span className="mt-4 text-xs uppercase tracking-[0.22em] text-white/60 group-hover:text-white transition-colors">
                  {c.action} →
                </span>
              </a>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="font-serif text-2xl tracking-tight text-white">Frequently asked questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>

        <p className="mt-16 text-sm text-white/40">
          Still stuck? Email us directly at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-white hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
