import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FolderOpen, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityCompletionCalendar } from '@/components/ActivityCompletionCalendar';
import { CreateEntityDialog } from '@/components/CreateEntityDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Entity } from '@/types';

/**
 * List of all trackable entities with time summaries
 */
export function TimeTrackingList({ filterType }: { filterType?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { getAllSummaries } = useTimeTracking();

  const { data: trackableEntities, isLoading: entitiesLoading } = useQuery({
    queryKey: ['entities', 'trackable', filterType],
    queryFn: async () => {
      const response = await entitiesApi.list();
      const entities = response.data as Entity[];
      if (filterType) {
        return entities.filter(e => e.type === filterType);
      }
      return entities.filter(e => e.type === 'PROJECT' || e.type === 'ACTIVITY');
    },
  });

  const { data: summaries, isLoading: summariesLoading } = getAllSummaries();

  const getSummaryForEntity = (entityId: string): TimeEntitySummary | undefined => {
    if (!summaries) return undefined;
    return summaries.find((s: TimeEntitySummary) => s.entityId === entityId);
  };

  const isLoading = entitiesLoading || summariesLoading;

  const typeLabels: Record<string, string> = { PROJECT: 'Project', ACTIVITY: 'Activity', ACCURRENCY: 'Accurrency' };

  const lowerQuery = query.trim().toLowerCase();
  const filteredEntities = useMemo(() => {
    const source = trackableEntities || [];
    return source.filter((e) => {
      const matchesType = filterType ? e.type === filterType : e.type === 'PROJECT' || e.type === 'ACTIVITY';
      if (!matchesType) return false;
      if (!lowerQuery) return true;
      return [e.title, e.description, e.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lowerQuery));
    });
  }, [trackableEntities, filterType, lowerQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${filterType === 'PROJECT' ? 'projects' : 'activities'}...`}
            className="w-full bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-sm outline-none transition-colors placeholder:text-white/30"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New {filterType ? typeLabels[filterType] : 'Entity'}
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredEntities.length === 0 ? (
        <Card className="p-12 text-center bg-white/5 border border-white/10">
          <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">
            No {filterType ? typeLabels[filterType]?.toLowerCase() + 's' : 'entities'} yet
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Create a {filterType ? typeLabels[filterType]?.toLowerCase() : 'project or activity'} to start tracking.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            Create {filterType ? typeLabels[filterType] : 'Entity'}
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-[1.8fr_0.9fr_0.9fr] gap-4 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white/50">
            <span>Name</span>
            <span>Type</span>
            <span>Tracked</span>
          </div>
          <Accordion type="single" collapsible className="divide-y divide-white/10">
            {filteredEntities.map((entity, index) => {
              const summary = getSummaryForEntity(entity.id);
              const showTimer = entity.type === 'PROJECT';

              return (
                <AccordionItem
                  key={entity.id}
                  value={entity.id}
                  className={cn(
                    'transition-colors',
                    index % 2 === 0 ? 'bg-white/5' : 'bg-white/0',
                    'hover:bg-white/10',
                  )}
                >
                  <AccordionTrigger className="grid grid-cols-[1.8fr_0.9fr_0.9fr] items-center gap-4 px-4 py-4 text-left">
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{entity.title || 'Untitled'}</p>
                      {entity.description && (
                        <p className="mt-1 text-xs text-white/40 truncate">{entity.description}</p>
                      )}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-white/60">
                      {typeLabels[entity.type] ?? entity.type}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-mono text-white/80">{summary?.formattedTotal || '00:00:00'}</p>
                      <p className="text-xs text-white/50">{summary?.entriesCount ?? 0} entries</p>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="grid gap-4">
                      {showTimer && summary ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total time</p>
                              <p className="mt-2 font-mono text-white/90">{summary.formattedTotal}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Entries</p>
                              <p className="mt-2 text-white/90">{summary.entriesCount}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ActivityCompletionCalendar
                          entityId={entity.id}
                          trackingDates={entity.trackingDates}
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}

      <CreateEntityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultType={filterType || 'PROJECT'}
        lockType={!!filterType}
        onCreated={(entity) => {
          queryClient.invalidateQueries({ queryKey: ['entities'] });
          navigate(`/entities/${entity.id}`);
        }}
      />
    </div>
  );
}
