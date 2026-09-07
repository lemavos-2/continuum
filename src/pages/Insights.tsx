import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  FireIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterChips } from "@/components/ui/filter-chips";
import { EntityTypeIcon } from "@/components/ui/entity-type-icon";
import { StickyNote } from "@/lib/heroicons";
import { ScoreEvolutionSection } from "@/components/insights/ScoreEvolutionSection";

import { cn } from "@/lib/utils";
import { insightsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

interface NoteInsight {
  note: {
    id: string;
    title: string;
    type?: string;
  };
  score: number;
  badge: string;
  mentionCount: number;
  entityConnections: number;
  hoursTracked: number;
  daysSinceLastInteraction: number;
}

interface EntityInsight {
  entity: {
    id: string;
    title: string;
    type?: string;
  };
  score: number;
  badge: string;
  mentionCount: number;
  relationsCount: number;
  hoursTracked: number;
  daysSinceLastMention: number;
}

type InsightCategory =
  | "hotNotes"
  | "hotEntities"
  | "worthRevisiting"
  | "forgottenGems";

type View = "all" | InsightCategory;

interface InsightItem {
  id: string;
  kind: "note" | "entity";
  category: InsightCategory;
  score: number;
  badge: string;
  title: string;
  subtitle: string;
  mentions: number;
  links: number;
  hours: number;
  daysAgo: number;
  onOpen: () => void;
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

const CATEGORY_META: Record<
  InsightCategory,
  {
    labelKey: string;
    icon: typeof FireIcon;
  }
> = {
  hotNotes: {
    labelKey: "ins_cat_hot_notes",
    icon: FireIcon,
  },
  hotEntities: {
    labelKey: "ins_cat_hot_entities",
    icon: UsersIcon,
  },
  worthRevisiting: {
    labelKey: "ins_cat_worth_revisiting",
    icon: ClockIcon,
  },
  forgottenGems: {
    labelKey: "ins_cat_forgotten_gems",
    icon: ArrowTrendingUpIcon,
  },
};

const categoryOrder: InsightCategory[] = [
  "hotNotes",
  "hotEntities",
  "worthRevisiting",
  "forgottenGems",
];

const formatHours = (hours: number) => {
  if (!hours) return null;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
};

const formatDays = (
  days: number,
  t: (key: string, vars?: Record<string, any>) => string,
) => {
  if (days <= 0) return t("ins_today");
  if (days === 1) return t("ins_days_ago_1");
  if (days < 30) return t("ins_days_ago_n", { count: days });
  if (days < 365) {
    return t("ins_months_ago", {
      count: Math.floor(days / 30),
    });
  }

  return t("ins_years_ago", {
    count: Math.floor(days / 365),
  });
};

const BADGE_KEY_MAP: Record<string, string> = {
  "hot right now": "ins_badge_hot",
  "worth revisiting": "ins_badge_worth_revisiting",
  "forgotten gem": "ins_badge_forgotten_gem",
  "key entity": "ins_badge_key_entity",
};

const translateBadge = (
  badge: string,
  t: (key: string, vars?: Record<string, any>) => string,
) => {
  const key = BADGE_KEY_MAP[badge?.toLowerCase()?.trim() || ""];
  return key ? t(key) : badge;
};

/* ─────────────────────────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────────────────────────── */

function Meta({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
      {children}
    </span>
  );
}

function InsightListItem({
  item,
}: {
  item: InsightItem;
}) {
  const { t } = useLanguage();

  const Icon =
    item.kind === "note" ? (
      <StickyNote className="h-5 w-5" />
    ) : (
      <EntityTypeIcon
        type={item.subtitle}
        className="h-5 w-5"
      />
    );

  return (
    <button
      onClick={item.onOpen}
      className="
        group flex w-full items-center gap-4
        border-b border-white/[0.06]
        py-5 text-left
        transition-colors
        hover:bg-white/[0.025]
      "
    >
      <div
        className="
          flex h-11 w-11 shrink-0 items-center justify-center
          rounded-xl bg-white/[0.045]
          text-white/55
          transition-colors
          group-hover:bg-white/[0.08]
          group-hover:text-white/80
        "
      >
        {Icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-serif text-[21px] leading-tight text-white/90">
            {item.title}
          </h3>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Meta>{item.subtitle}</Meta>

          {item.mentions > 0 && (
            <>
              <span className="text-white/15">·</span>
              <Meta>
                {t("ins_mentions", {
                  count: item.mentions,
                })}
              </Meta>
            </>
          )}

          {item.hours > 0 && (
            <>
              <span className="text-white/15">·</span>
              <Meta>
                {formatHours(item.hours)}
              </Meta>
            </>
          )}

          <span className="text-white/15">·</span>

          <Meta>
            {formatDays(item.daysAgo, t)}
          </Meta>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden font-mono text-[11px] tabular-nums text-white/25 sm:block">
          {item.score.toFixed(1)}
        </span>

        <span className="text-lg text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60">
          →
        </span>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────── */

export default function Insights() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [hotNotes, setHotNotes] = useState<NoteInsight[]>([]);
  const [forgottenNotes, setForgottenNotes] = useState<NoteInsight[]>([]);
  const [hotEntities, setHotEntities] = useState<EntityInsight[]>([]);
  const [forgottenEntities, setForgottenEntities] = useState<EntityInsight[]>([]);

  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [currentScore, setCurrentScore] = useState(0);
  const [showEvolution, setShowEvolution] = useState(false);

  /* ─────────────────────────────────────────────
     LOAD
  ───────────────────────────────────────────── */

  const load = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [hn, fn, he, fe] = await Promise.all([
        insightsApi.hotNotes(12),
        insightsApi.forgottenNotes(12),
        insightsApi.hotEntities(12),
        insightsApi.forgottenEntities(12),
      ]);

      setHotNotes(hn.data || []);
      setForgottenNotes(fn.data || []);
      setHotEntities(he.data || []);
      setForgottenEntities(fe.data || []);
    } catch {
      toast({
        title: t("ins_could_not_load"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ─────────────────────────────────────────────
     NORMALIZE INSIGHTS
  ───────────────────────────────────────────── */

  const insights = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];

    hotNotes.forEach((item) => {
      items.push({
        id: item.note.id,
        kind: "note",
        category: "hotNotes",
        score: item.score,
        badge: item.badge,
        title: item.note.title || t("ins_untitled"),
        subtitle: t("ins_note"),
        mentions: item.mentionCount,
        links: item.entityConnections,
        hours: item.hoursTracked,
        daysAgo: item.daysSinceLastInteraction,
        onOpen: () => navigate(`/notes/${item.note.id}`),
      });
    });

    hotEntities.forEach((item) => {
      items.push({
        id: item.entity.id,
        kind: "entity",
        category: "hotEntities",
        score: item.score,
        badge: item.badge,
        title: item.entity.title || t("ins_untitled"),
        subtitle: item.entity.type || t("ins_atom"),
        mentions: item.mentionCount,
        links: item.relationsCount,
        hours: item.hoursTracked,
        daysAgo: item.daysSinceLastMention,
        onOpen: () => navigate(`/entities/${item.entity.id}`),
      });
    });

    forgottenNotes.forEach((item) => {
      items.push({
        id: item.note.id,
        kind: "note",
        category: "worthRevisiting",
        score: item.score,
        badge: item.badge,
        title: item.note.title || t("ins_untitled"),
        subtitle: t("ins_note"),
        mentions: item.mentionCount,
        links: item.entityConnections,
        hours: item.hoursTracked,
        daysAgo: item.daysSinceLastInteraction,
        onOpen: () => navigate(`/notes/${item.note.id}`),
      });
    });

    forgottenEntities.forEach((item) => {
      items.push({
        id: item.entity.id,
        kind: "entity",
        category: "forgottenGems",
        score: item.score,
        badge: item.badge,
        title: item.entity.title || t("ins_untitled"),
        subtitle: item.entity.type || t("ins_atom"),
        mentions: item.mentionCount,
        links: item.relationsCount,
        hours: item.hoursTracked,
        daysAgo: item.daysSinceLastMention,
        onOpen: () => navigate(`/entities/${item.entity.id}`),
      });
    });

    return items.sort((a, b) => b.score - a.score);
  }, [
    hotNotes,
    forgottenNotes,
    hotEntities,
    forgottenEntities,
    navigate,
    t,
  ]);

  /* ─────────────────────────────────────────────
     FILTER
  ───────────────────────────────────────────── */

  const filteredInsights = useMemo(() => {
    const query = search.trim().toLowerCase();

    return insights.filter((item) => {
      if (
        view !== "all" &&
        item.category !== view
      ) {
        return false;
      }

      if (!query) return true;

      return `${item.title} ${item.subtitle} ${item.badge}`
        .toLowerCase()
        .includes(query);
    });
  }, [insights, search, view]);

  const counts = {
    all: insights.length,
    hotNotes: hotNotes.length,
    hotEntities: hotEntities.length,
    worthRevisiting: forgottenNotes.length,
    forgottenGems: forgottenEntities.length,
  };

  const topInsight = insights[0];

  /* ─────────────────────────────────────────────
     CATEGORY CHIPS
  ───────────────────────────────────────────── */

  const categoryOptions = [
    {
      value: "all",
      label: t("ins_all_insights"),
    },
    ...categoryOrder.map((category) => ({
      value: category,
      label: t(CATEGORY_META[category].labelKey),
    })),
  ];

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */

  return (
    <AppLayout>
      <main className="mx-auto min-h-full max-w-5xl px-5 pb-28 pt-8 sm:px-8 lg:px-12 lg:pb-20 lg:pt-14">

        {/* ─────────────────────────────
            HEADER
        ───────────────────────────── */}

        <header className="mb-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/30">
                {t("ins_intelligence")}
              </p>

              <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t("ins_title")}
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
                {t("ins_subtitle")}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => load(true)}
              disabled={refreshing}
              className="mt-1 shrink-0 rounded-full text-white/40 hover:bg-white/[0.05] hover:text-white"
              aria-label={t("ins_refresh")}
            >
              <ArrowPathIcon
                className={cn(
                  "h-4 w-4",
                  refreshing && "animate-spin",
                )}
              />
            </Button>
          </div>
        </header>

        {/* ─────────────────────────────
            MAIN SIGNAL
        ───────────────────────────── */}

        {!loading && topInsight && (
          <section className="mb-12">
            <div className="border-y border-white/[0.08] py-7">
              <div className="flex items-start justify-between gap-5">
                <div className="max-w-2xl">
                  <Meta>{translateBadge(topInsight.badge, t)}</Meta>

                  <button
                    onClick={topInsight.onOpen}
                    className="mt-2 text-left"
                  >
                    <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl">
                      {topInsight.title}
                    </h2>
                  </button>

                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                    {topInsight.subtitle}
                    {topInsight.mentions > 0 &&
                      ` · ${t("ins_mentions", {
                        count: topInsight.mentions,
                      })}`}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <span className="font-serif text-4xl tabular-nums text-white">
                    {topInsight.score.toFixed(1)}
                  </span>

                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
                    signal
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─────────────────────────────
            SEARCH + FILTERS
        ───────────────────────────── */}

        <section className="mb-10">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                t("ins_searchAmong", {
                  n: counts.all,
                }) || `Search among ${counts.all} signals…`
              }
              className="
                h-12 rounded-2xl
                border-white/[0.07]
                bg-white/[0.035]
                pl-11
                text-sm
                text-white
                placeholder:italic
                placeholder:text-white/25
                focus:border-white/20
                focus:bg-white/[0.05]
              "
            />
          </div>

          <div className="mt-4 overflow-x-auto pb-1">
            <FilterChips
              value={view}
              onChange={(value) =>
                setView(value as View)
              }
              options={categoryOptions}
            />
          </div>
        </section>

        {/* ─────────────────────────────
            INSIGHTS LIST
        ───────────────────────────── */}

        <section>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="font-serif text-2xl text-white">
                {filteredInsights.length}{" "}
                {filteredInsights.length === 1
                  ? "insight"
                  : "insights"}
              </p>
            </div>

            {view !== "all" && (
              <button
                onClick={() => setView("all")}
                className="font-mono text-[10px] uppercase tracking-wider text-white/30 transition-colors hover:text-white/70"
              >
                {t("ins_all_insights")}
              </button>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-white/[0.06]">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex gap-4 py-5"
                >
                  <Skeleton className="h-11 w-11 rounded-xl" />

                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="border-y border-white/[0.07] py-20 text-center">
              <p className="font-serif text-2xl italic text-white/30">
                {t("ins_no_matching")}
              </p>
            </div>
          ) : (
            <div>
              {filteredInsights.map((item) => (
                <InsightListItem
                  key={`${item.kind}-${item.id}-${item.category}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </section>

        {/* ─────────────────────────────
            SCORE — SECONDARY
        ───────────────────────────── */}

        <section className="mt-16 border-t border-white/[0.08] pt-8">
          <button
            onClick={() =>
              setShowEvolution((value) => !value)
            }
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <Meta>{t("sc_current")}</Meta>

              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-serif text-3xl text-white">
                  {currentScore.toFixed(2)}
                </span>

                <span className="font-mono text-[10px] uppercase tracking-wider text-white/25">
                  knowledge score
                </span>
              </div>
            </div>

            <span
              className={cn(
                "text-white/30 transition-transform",
                showEvolution && "rotate-180",
              )}
            >
              ↓
            </span>
          </button>

          {showEvolution && (
            <div className="mt-8">
              <ScoreEvolutionSection
                onScoreChange={setCurrentScore}
              />
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
              }
