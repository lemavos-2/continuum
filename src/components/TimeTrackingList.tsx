import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateEntityDialog } from '@/components/CreateEntityDialog';
import { SpotlightTable } from '@/components/ui/spotlight-table';
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

  const filteredEntities = trackableEntities || [];

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
      ) : (
        <SpotlightTable<Entity>
          data={filteredEntities}
          searchKeys={["title", "description", "type"]}
          placeholder={`Search ${filterType === 'PROJECT' ? 'projects' : 'activities'}...`}
          emptyState={
            <div className="text-sm text-white/40">
              No {filterType ? typeLabels[filterType]?.toLowerCase() + 's' : 'entities'} yet.
            </div>
          }
          query={query}
          onQueryChange={setQuery}
          onRowClick={(row) => navigate(`/entities/${row.id}`)}
          rowKey={(row) => row.id}
          columns={[
            {
              key: 'title',
              header: 'Name',
              render: (row) => (
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{row.title || 'Untitled'}</p>
                  {row.description && (
                    <p className="mt-0.5 text-xs text-white/40 truncate">{row.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              width: '140px',
              render: (row) => (
                <span className="text-xs uppercase tracking-wider text-white/60">
                  {typeLabels[row.type] ?? row.type}
                </span>
              ),
            },
            {
              key: 'total',
              header: 'Tracked',
              width: '180px',
              render: (row) => {
                const summary = getSummaryForEntity(row.id);
                return (
                  <div className="text-right">
                    <p className="text-sm font-mono text-white/80">{summary?.formattedTotal || '00:00:00'}</p>
                    <p className="text-xs text-white/50">{summary?.entriesCount ?? 0} entries</p>
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: '',
              width: '120px',
              render: (row) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/entities/${row.id}`);
                  }}
                  className="text-xs text-white/70 hover:text-white"
                >
                  View details
                </button>
              ),
            },
          ]}
        />
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
