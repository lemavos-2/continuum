import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Network, User, Briefcase, Hash, Building, Flame, Loader2, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CreateEntityDialog } from "@/components/CreateEntityDialog";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import type { EntityType } from "@/types";

interface Entity { id: string; title: string; type: EntityType; description?: string; createdAt: string; trackingDates?: string[]; }

const typeIcons: Record<string, any> = { PERSON: User, PROJECT: Briefcase, TOPIC: Hash, ORGANIZATION: Building, ACTIVITY: Flame };
const typeLabels: Record<string, string> = { PERSON: "Person", PROJECT: "Project", TOPIC: "Topic", ORGANIZATION: "Organization", ACTIVITY: "Activity" };

// Dynamic badge colors based on type
function getEntityBadgeColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    PERSON: "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    PROJECT: "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    TOPIC: "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    ORGANIZATION: "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    ACTIVITY: "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
    ACCURRENCY: "bg-zinc-500/20 text-zinc-200 border border-zinc-500/30",
  };
  return colors[type] || "";
}

export default function Entities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh: refreshUsage, applyUsageDelta } = usePlanGate();

  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: timeSummaries } = useTimeTracking().getAllSummaries();

  const getTimeSummaryForEntity = (entityId: string) => {
    return timeSummaries?.find(s => s.entityId === entityId);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching entities...');
      const eRes = await entitiesApi.list();
      console.log('Entities response:', eRes);
      setEntities(Array.isArray(eRes.data) ? eRes.data : []);
      console.log('Entities set:', Array.isArray(eRes.data) ? eRes.data : []);
    } catch (error) {
      console.error('Error loading entities:', error);
      toast({ title: "Error loading entities", variant: "destructive" });
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const entity = entities.find((item) => item.id === id);
      await entitiesApi.delete(id);
      setEntities((prev) => prev.filter((en) => en.id !== id));
      applyUsageDelta({ entitiesCount: -1, activitiesCount: entity?.type === "ACTIVITY" ? -1 : 0 });
      void refreshUsage();
    }
    catch { toast({ title: "Error deleting", variant: "destructive" }); }
  };

  const filtered = entities.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter ? e.type === typeFilter : true;
    return matchSearch && matchType;
  });

  const types = ["PERSON", "PROJECT", "TOPIC", "ORGANIZATION", "ACTIVITY"];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Entities</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="w-4 h-4" /> New Entity
          </Button>
          <CreateEntityDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            defaultType={(typeFilter as string) || "TOPIC"}
            onCreated={(entity) => setEntities((prev) => [...prev, entity as Entity])}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSearchParams({})} className={cn("bento-tag", !typeFilter && "bg-primary/10 text-primary font-medium")}>All</button>
          {types.map((t) => {
            const Icon = typeIcons[t];
            return (
              <button key={t} onClick={() => setSearchParams({ type: t })} className={cn("bento-tag flex items-center gap-1", typeFilter === t && "bg-primary/10 text-primary font-medium")}>
                <Icon className="w-3 h-3" /> {typeLabels[t]}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search entities..." className="pl-9 bg-accent border-border/50" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Network className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">No entities found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entity) => {
              const Icon = typeIcons[entity.type] || Network;
              const streak = entity.trackingDates?.length || 0;
              
              return (
                <div
                  key={entity.id}
                  onClick={() => navigate(`/entities/${entity.id}`)}
                  className="group relative p-4 rounded-xl cursor-pointer transition-all border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/15 hover:border-white/30 hover:shadow-lg min-h-40 flex flex-col"
                >
                  {/* Icon and Type Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Icon className="w-5 h-5 text-white/70" />
                    </div>
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", getEntityBadgeColor(entity.type))}>
                      {typeLabels[entity.type]}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-white/90 text-sm line-clamp-2 flex-1">{entity.title}</h3>

                  {/* Description */}
                  {entity.description && (
                    <p className="text-xs text-white/50 line-clamp-2 mt-2 mb-auto">{entity.description}</p>
                  )}

                  {/* Footer - Track/Streak and Delete */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 gap-2">
                          <div className="flex items-center gap-1">
                      {entity.type === "ACTIVITY" && streak > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-500/20 border border-zinc-500/30">
                          <Flame className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-semibold text-zinc-200">{streak}</span>
                        </div>
                      )}
                      {entity.type === "PROJECT" && (() => {
                        const summary = getTimeSummaryForEntity(entity.id);
                        return summary ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-500/20 border border-zinc-500/30">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-200">{summary.formattedTotal}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(entity.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-zinc-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-400/60 hover:text-zinc-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason="You've reached the entities limit for your plan." />
    </AppLayout>
  );
}

