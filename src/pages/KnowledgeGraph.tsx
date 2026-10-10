import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { BrainGraph2D } from '@/components/graph/BrainGraph2D';
import { BrainGraph3D, type BrainGraphHandle } from '@/components/graph/BrainGraph3D';
import { SideInspector } from '@/components/SideInspector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, ZoomIn, ZoomOut, Settings, Eye, EyeOff, RefreshCw, ArrowRight, ExternalLink, Loader2 } from '@/lib/heroicons';
import { graphApi, entitiesApi } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { qk, STALE } from '@/lib/queries';
import { normalizeBrainLinks, type BrainNode, type BrainLink } from '@/lib/brain-layout';
import { useEntityStore } from '@/contexts/EntityContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Entity, EntityType } from '@/types';

const typeKeys: Record<string, string> = { NOTE: 'gr_type_note', ACTIVITY: 'gr_type_activity', PERSON: 'gr_type_person', PROJECT: 'gr_type_project', TOPIC: 'gr_type_topic', ORGANIZATION: 'gr_type_organization' };

export default function KnowledgeGraph() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const viewer = useRef<BrainGraphHandle>(null);
  const [nodes, setNodes] = useState<BrainNode[]>([]);
  const [links, setLinks] = useState<BrainLink[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<BrainNode | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [time, setTime] = useState<'all' | '7d' | '30d'>('all');
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [focus, setFocus] = useState(false);
  const [inside, setInside] = useState(false);
  const [options, setOptions] = useState(false);
  const { inspectorOpen, inspectorEntity, openInspector, closeInspector } = useEntityStore();

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const cached = await queryClient.fetchQuery({
        queryKey: qk.graph(), staleTime: STALE.list,
        queryFn: async () => {
          const [graphRes, entitiesRes] = await Promise.all([graphApi.data(), entitiesApi.list()]);
          return { graph: graphRes.data, entities: Array.isArray(entitiesRes.data) ? entitiesRes.data : [] };
        },
      });
      const allEntities: Entity[] = cached.entities;
      const entityMap = new Map(allEntities.map(e => [e.id, e]));
      const raw: BrainNode[] = Array.isArray(cached.graph?.nodes) ? cached.graph.nodes : [];
      const next = raw.filter(n => typeof n.id === 'string').map(n => ({ ...n, type: String(n.type), createdAt: n.createdAt ?? entityMap.get(n.id)?.createdAt }));
      const edges: BrainLink[] = cached.graph?.links ?? cached.graph?.edges ?? [];
      setEntities(allEntities); setNodes(next); setLinks(normalizeBrainLinks(next, Array.isArray(edges) ? edges : []));
    } catch { setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const toggle = () => setOptions(v => !v);
    window.addEventListener('graph-options-toggle', toggle);
    return () => window.removeEventListener('graph-options-toggle', toggle);
  }, []);

  const neighbors = useMemo(() => {
    if (!selected) return null;
    const ids = new Set([selected.id]);
    links.forEach(l => { if (l.source === selected.id) ids.add(l.target); if (l.target === selected.id) ids.add(l.source); });
    return ids;
  }, [selected, links]);
  const visibleNodes = useMemo(() => nodes.filter(n => {
    if (typeFilters.size && !typeFilters.has(n.type)) return false;
    if (focus && neighbors && !neighbors.has(n.id)) return false;
    if (time !== 'all') {
      const date = n.createdAt ? new Date(n.createdAt).getTime() : NaN;
      if (!Number.isFinite(date) || date < Date.now() - (time === '7d' ? 7 : 30) * 86400000) return false;
    }
    return true;
  }), [nodes, typeFilters, time, focus, neighbors]);
  const visibleLinks = useMemo(() => normalizeBrainLinks(visibleNodes, links), [visibleNodes, links]);
  const highlighted = useMemo(() => search.trim() ? new Set(visibleNodes.filter(n => n.label.toLowerCase().includes(search.trim().toLowerCase())).map(n => n.id)) : neighbors, [search, visibleNodes, neighbors]);
  const types = useMemo(() => [...new Set(nodes.map(n => n.type))], [nodes]);
  const typeLabel = (type: string) => typeKeys[type] ? t(typeKeys[type]) : type;
  const clear = () => { setSelected(null); closeInspector(); };
  const select = (node: BrainNode) => {
    setSelected(node);
    const entity = entities.find(e => e.id === node.id);
    if (entity) openInspector(entity);
    else if (node.type === 'NOTE') openInspector({ id: node.id, title: node.label, type: 'NOTE', content: '', tags: [], entityIds: [], createdAt: node.createdAt ?? '', updatedAt: '' });
    else openInspector({ id: node.id, title: node.label, type: node.type as EntityType, createdAt: node.createdAt ?? '' });
  };
  const open = (node: BrainNode) => navigate(node.type === 'NOTE' ? `/notes/${node.id}` : `/entities/${node.id}`);
  const reset = () => { setInside(false); viewer.current?.reset(); clear(); };
  const tool = (label: string, action: () => void, icon: React.ReactNode, active = false) => <Tooltip key={label}>
    <TooltipTrigger asChild><Button variant="canvasIcon" size="icon" aria-label={label} onClick={action} className={active ? 'bg-muted text-foreground' : 'border-0 bg-transparent'}>{icon}</Button></TooltipTrigger>
    <TooltipContent side="left">{label}</TooltipContent>
  </Tooltip>;

  return <AppLayout>
    <section className="relative h-[100dvh] min-h-[420px] overflow-hidden bg-background" aria-label={t('nav_graph')}>
      {!loading && !failed && (show3D
        ? <BrainGraph3D ref={viewer} nodes={visibleNodes} links={visibleLinks} selectedId={selected?.id ?? null} highlightedIds={highlighted} showEdges={showEdges} showLabels={showLabels} inside={inside} theme={theme} unavailableText={t('gr_3d_unavailable')} onSelect={select} onOpen={open} onClear={clear} />
        : <BrainGraph2D ref={viewer} nodes={visibleNodes} links={visibleLinks} selectedId={selected?.id ?? null} highlightedIds={highlighted} showEdges={showEdges} showLabels={showLabels} onSelect={select} onOpen={open} onClear={clear} />)}
      <div className="pointer-events-none absolute left-5 top-5 max-w-[calc(100%-6rem)]">
        <h1 className="font-display text-xl text-foreground">{t('nav_graph')} <span className="ml-1 font-sans text-xs text-muted-foreground">{show3D ? '3D' : '2D'}</span></h1>
        {!loading && <p className="mt-1 text-xs text-muted-foreground">{t('gr_brain_stats', { nodes: visibleNodes.length, links: visibleLinks.length })}</p>}
      </div>
      <div className="absolute right-4 top-5 z-30 flex items-center gap-2 rounded-lg border border-border/10 bg-card/75 px-2 py-2 backdrop-blur-md">
        <label htmlFor="graph-3d-toggle" className="text-xs text-foreground">3D</label>
        <Switch id="graph-3d-toggle" aria-label={t('gr_view_3d')} checked={show3D} onCheckedChange={checked => { setShow3D(checked); if (!checked) setInside(false); }} />
      </div>
      <div className="absolute right-4 top-16 z-30 flex flex-col gap-1 rounded-lg border border-border/10 bg-card/75 p-1 backdrop-blur-md">
        {tool(t('common_back'), () => navigate(-1), <ArrowLeft className="h-4 w-4" />)}
        {tool(t('gr_zoom_in'), () => viewer.current?.zoom(1), <ZoomIn className="h-4 w-4" />)}
        {tool(t('gr_zoom_out'), () => viewer.current?.zoom(-1), <ZoomOut className="h-4 w-4" />)}
        {show3D && tool(inside ? t('gr_exit_brain') : t('gr_enter_brain'), () => setInside(v => !v), <ArrowRight className="h-4 w-4" />, inside)}
        {tool(t('gr_reset_view'), reset, <RefreshCw className="h-4 w-4" />)}
        {tool(t('gr_focus_mode'), () => setFocus(v => !v), focus ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />, focus)}
        {tool(t('gr_open_options'), () => setOptions(true), <Settings className="h-4 w-4" />)}
      </div>
      {selected && !inspectorOpen && <div className="absolute bottom-6 left-5 right-5 flex items-center justify-between gap-3 rounded-lg border border-border/10 bg-card/80 p-4 backdrop-blur-md sm:right-auto sm:w-80">
        <div className="min-w-0"><p className="truncate text-sm">{selected.label}</p><p className="text-xs text-muted-foreground">{typeLabel(selected.type)}</p></div>
        <Button size="icon" variant="ghost" aria-label={t('common_open')} onClick={() => open(selected)}><ExternalLink className="h-4 w-4" /></Button>
      </div>}
      {(loading || failed || nodes.length === 0) && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto max-w-xs text-center px-6">
          {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /> : failed ? <><p className="mb-4 text-sm text-muted-foreground">{t('gr_load_failed')}</p><Button variant="outline" onClick={() => void load()}>{t('common_refresh')}</Button></> : <><h2 className="font-display text-lg">{t('gr_empty_title')}</h2><p className="my-3 text-sm text-muted-foreground">{t('gr_empty_desc')}</p><Button variant="outline" onClick={() => navigate('/notes')}>{t('gr_empty_cta')}</Button></>}
        </div>
      </div>}
      <Sheet open={options} onOpenChange={setOptions}><SheetContent className="overflow-y-auto bg-background/95 backdrop-blur-xl">
        <SheetHeader><SheetTitle>{t('gr_options_title')}</SheetTitle></SheetHeader>
        <div className="mt-7 space-y-7">
          <div><label htmlFor="graph-search" className="text-xs text-muted-foreground">{t('gr_search_nodes_label')}</label><Input id="graph-search" className="mt-2" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('gr_search_nodes_placeholder')} />
            {search.trim() && <div className="mt-2 max-h-48 overflow-y-auto">{visibleNodes.filter(n => highlighted?.has(n.id)).slice(0, 20).map(n => <Button key={n.id} variant="ghost" className="w-full justify-start truncate" onClick={() => { setOptions(false); select(n); }}>{n.label}</Button>)}</div>}
          </div>
          <div><p className="mb-2 text-xs text-muted-foreground">{t('gr_type_filters')}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant={typeFilters.size === 0 ? 'secondary' : 'ghost'} onClick={() => setTypeFilters(new Set())}>{t('gr_filter_all')}</Button>{types.map(type => <Button key={type} size="sm" variant={typeFilters.has(type) ? 'secondary' : 'ghost'} onClick={() => setTypeFilters(prev => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; })}>{typeLabel(type)}</Button>)}</div></div>
          <div><p className="mb-2 text-xs text-muted-foreground">{t('gr_time_range')}</p><div className="flex flex-wrap gap-2">{(['all', '7d', '30d'] as const).map(value => <Button key={value} size="sm" variant={time === value ? 'secondary' : 'ghost'} onClick={() => setTime(value)}>{t(value === 'all' ? 'gr_time_anytime' : value === '7d' ? 'gr_time_7d' : 'gr_time_30d')}</Button>)}</div></div>
          <div className="divide-y divide-border/10">{[
            { id: 'edges', label: t('gr_edges_on'), value: showEdges, change: setShowEdges },
            { id: 'labels', label: t('gr_labels_on'), value: showLabels, change: setShowLabels },
            { id: 'focus', label: t('gr_focus_mode'), value: focus, change: setFocus },
          ].map(option => <div key={option.id} className="flex items-center justify-between py-4"><label htmlFor={option.id} className="text-sm">{option.label}</label><Switch id={option.id} checked={option.value} onCheckedChange={option.change} /></div>)}</div>
          <Button variant="outline" className="w-full" onClick={() => { setTypeFilters(new Set()); setTime('all'); setSearch(''); setFocus(false); reset(); }}>{t('gr_show_all')}</Button>
        </div>
      </SheetContent></Sheet>
    </section>
    <SideInspector isOpen={inspectorOpen} entity={inspectorEntity} onClose={clear} />
  </AppLayout>;
}
