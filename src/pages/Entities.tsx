import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { entitiesApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import UpgradeModal from "@/components/UpgradeModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CreateEntityDialog } from "@/components/CreateEntityDialog";
import { SpotlightTable } from "@/components/ui/spotlight-table";
import type { EntityType } from "@/types";

interface Entity {
  id: string;
  title: string;
  type: EntityType;
  description?: string;
  createdAt: string;
  trackingDates?: string[];
}

const typeLabels: Record<string, string> = {
  PERSON: "Person",
  PROJECT: "Project",
  TOPIC: "Topic",
  ORGANIZATION: "Organization",
  ACTIVITY: "Activity",
};

const types = ["PERSON", "PROJECT", "TOPIC", "ORGANIZATION", "ACTIVITY"];

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function Entities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh: refreshUsage, applyUsageDelta } = usePlanGate();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [pendingDeleteEntity, setPendingDeleteEntity] = useState<Entity | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await entitiesApi.list();
        if (!cancelled) setEntities(Array.isArray(res.data) ? (res.data as Entity[]) : []);
      } catch {
        if (!cancelled) toast({ title: "Could not load entities", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleDelete = (e: React.MouseEvent, entity: Entity) => {
    e.stopPropagation();
    setPendingDeleteEntity(entity);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteEntity) return;
    try {
      await entitiesApi.delete(pendingDeleteEntity.id);
      setEntities((prev) => prev.filter((x) => x.id !== pendingDeleteEntity.id));
      applyUsageDelta({ entitiesCount: -1, activitiesCount: pendingDeleteEntity.type === "ACTIVITY" ? -1 : 0 });
      void refreshUsage();
    } catch {
      toast({ title: "Error deleting entity", variant: "destructive" });
    } finally {
      setPendingDeleteEntity(null);
    }
  };

  const filtered = typeFilter ? entities.filter((e) => e.type === typeFilter) : entities;

  return (
    <AppLayout>
      <div className="px-6 lg:px-12 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-end justify-between border-b border-white/10 pb-6 mb-8">
          <div>
            <p className="label-caps mb-2">Index</p>
            <h1 className="font-serif text-5xl tracking-tight">Entities</h1>
            <p className="mt-2 text-sm text-white/50">
              The atoms of your knowledge graph.
            </p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New entity
          </button>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSearchParams({})}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              !typeFilter
                ? "bg-white text-black border-white"
                : "border-white/10 text-white/60 hover:border-white/30 hover:text-white",
            )}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSearchParams({ type: t })}
              className={cn(
                "text-xs px-3 py-1.5 rounded-md border transition-colors",
                typeFilter === t
                  ? "bg-white text-black border-white"
                  : "border-white/10 text-white/60 hover:border-white/30 hover:text-white",
              )}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : (
          <SpotlightTable
            data={filtered}
            searchKeys={["title", "description", "type"]}
            placeholder="Search by name, type or description…"
            emptyState="No entities yet. Create your first one."
            onRowClick={(row) => navigate(`/entities/${row.id}`)}
            columns={[
              {
                key: "title",
                header: "Name",
                render: (row) => (
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{row.title || "Untitled"}</p>
                    {row.description && (
                      <p className="mt-0.5 text-xs text-white/40 truncate">{row.description}</p>
                    )}
                  </div>
                ),
              },
              {
                key: "type",
                header: "Type",
                width: "180px",
                render: (row) => (
                  <span className="text-xs uppercase tracking-wider text-white/60">
                    {typeLabels[row.type] ?? row.type}
                  </span>
                ),
              },
              {
                key: "createdAt",
                header: "Created",
                width: "160px",
                render: (row) => (
                  <span className="text-xs text-white/50 font-mono">{formatDate(row.createdAt)}</span>
                ),
              },
              {
                key: "actions",
                header: "",
                width: "60px",
                render: (row) => (
                  <button
                    onClick={(e) => handleDelete(e, row)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10"
                    aria-label="Delete entity"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/50 hover:text-white" />
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>

      <CreateEntityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultType={(typeFilter as string) || "TOPIC"}
        onCreated={(entity) => setEntities((prev) => [...prev, entity as Entity])}
      />
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="You've reached the entities limit for your plan."
      />
      <ConfirmDialog
        open={!!pendingDeleteEntity}
        onOpenChange={(open) => !open && setPendingDeleteEntity(null)}
        title="Delete entity?"
        description={
          pendingDeleteEntity
            ? `${pendingDeleteEntity.title || "Untitled"} will be permanently removed.`
            : "This action cannot be undone."
        }
        confirmText="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </AppLayout>
  );
}
