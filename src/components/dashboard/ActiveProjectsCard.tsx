import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { entitiesApi, graphApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowRight, Folder, Plus } from "@/lib/heroicons";
import { cn } from "@/lib/utils";

interface ProjectEntity {
  id: string;
  title?: string;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

const endpointId = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
};

/** The few projects the user is actually moving forward, with their link weight. */
export function ActiveProjectsCard({ className, limit = 3 }: { className?: string; limit?: number }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: entities, isLoading } = useQuery({
    queryKey: ["entities", "projects"],
    queryFn: async () => {
      const res = await entitiesApi.list({ size: 1000 });
      const list = (res.data as ProjectEntity[]) ?? [];
      return list.filter((e) => e.type === "PROJECT");
    },
  });

  const { data: graphData } = useQuery({
    queryKey: ["graph", "data"],
    queryFn: () => graphApi.data().then((r) => r.data),
  });

  const linkCounts = useMemo(() => {
    const raw = (graphData as any)?.links ?? (graphData as any)?.edges ?? [];
    const counts: Record<string, number> = {};
    if (!Array.isArray(raw)) return counts;
    for (const link of raw) {
      for (const key of [endpointId(link?.source), endpointId(link?.target)]) {
        if (key) counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }, [graphData]);

  const projects = useMemo(() => {
    const list = entities ?? [];
    const ts = (p: ProjectEntity) => new Date(p.updatedAt || p.createdAt || 0).getTime();
    return [...list]
      .sort((a, b) => (linkCounts[b.id] ?? 0) - (linkCounts[a.id] ?? 0) || ts(b) - ts(a))
      .slice(0, limit);
  }, [entities, linkCounts, limit]);

  return (
    <Card variant="faint" className={cn("flex flex-col", className)}>
      <CardContent className="flex flex-1 flex-col p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
              {t("db_projectsEyebrow")}
            </p>
            <h2 className="mt-1 truncate font-serif text-xl text-foreground">{t("db_projectsTitle")}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/projects")}
            className="h-auto shrink-0 bg-transparent p-0 font-mono text-[11px] uppercase normal-case tracking-widest text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {t("db_viewAll")}
          </Button>
        </div>

        <div className="flex-1 space-y-1">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-center transition-colors hover:border-foreground/20"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("db_projectsEmpty")}</span>
            </button>
          ) : (
            projects.map((project) => {
              const links = linkCounts[project.id] ?? 0;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/entities/${project.id}`)}
                  className="group flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-accent/40"
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground/80 group-hover:text-foreground sm:text-sm">
                      {project.title || t("db_untitled")}
                    </span>
                    <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("db_projectsLinks", { n: links })}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60" />
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ActiveProjectsCard;
