import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entitiesApi } from '@/lib/api';
import { useTimeTracking, type TimeEntitySummary } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FolderOpen, Briefcase, Flame, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityCompletionCalendar } from '@/components/ActivityCompletionCalendar';
import { CreateEntityDialog } from '@/components/CreateEntityDialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import type { Entity } from '@/types';

/**
 * List of all trackable entities with time summaries
 */
export function TimeTrackingList({ filterType }: { filterType?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
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

  const filteredEntities = trackableEntities || [];

  const types = filterType ? [filterType] : ['PROJECT', 'ACTIVITY', 'ACCURRENCY'];
  const typeIcons: Record<string, any> = { PROJECT: Briefcase, ACTIVITY: Flame, ACCURRENCY: Activity };
  const typeLabels: Record<string, string> = { PROJECT: 'Project', ACTIVITY: 'Activity', ACCURRENCY: 'Accurrency' };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New {filterType ? typeLabels[filterType] : 'Entity'}
        </Button>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !filteredEntities || filteredEntities.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No {filterType ? typeLabels[filterType]?.toLowerCase() + 's' : 'entities'} yet</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Create a {filterType ? typeLabels[filterType]?.toLowerCase() : 'project or activity'} to start tracking.
              </p>
              <Button onClick={() => setCreateOpen(true)}>
                Create {filterType ? typeLabels[filterType] : 'Entity'}
              </Button>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-2 w-full">
              {filteredEntities.map(entity => {
                const summary = getSummaryForEntity(entity.id);
                const isEntityTimerActive = isTimerActive(entity.id);
                const showTimer = entity.type === 'PROJECT';

                return (
                  <AccordionItem key={entity.id} value={entity.id} className="border border-white/10 rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:bg-white/[0.02] hover:no-underline">
                      <div className="flex items-start gap-3 text-left flex-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">
                            {entity.title}
                          </h3>
                          <p className="text-xs text-zinc-500 mt-1">
                            {entity.type === 'PROJECT'
                              ? '📁 Project'
                              : entity.type === 'ACCURRENCY'
                              ? '⚡ Accurrency'
                              : '🔥 Activity'
                            }
                          </p>
                        </div>
                        {summary && (
                          <div className="text-right">
                            <p className="text-sm font-mono text-zinc-400">
                              {summary?.formattedTotal || '00:00:00'}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 py-4 border-t border-white/10 space-y-4">
                      {/* Stats */}
                      {showTimer && summary && (
                        <div className="bg-zinc-950/50 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-zinc-400">Total Time</span>
                            <span className="font-mono font-bold text-zinc-300">
                              {summary.formattedTotal || '00:00:00'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">
                              {summary.entriesCount || 0} entries
                            </span>
                            <span className="text-zinc-400">
                              {summary.totalHours?.toFixed(1) || '0.0'}h
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Completion Calendar - Only for Activities */}
                      {!showTimer && (
                        <ActivityCompletionCalendar
                          entityId={entity.id}
                          trackingDates={entity.trackingDates}
                        />
                      )}

                      {/* Actions */}
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/entities/${entity.id}`);
                          }}
                          className="text-xs"
                        >
                          View Details
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

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
