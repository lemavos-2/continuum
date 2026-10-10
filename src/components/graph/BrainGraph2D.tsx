import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { layoutBrainNodes2D, type BrainLink, type BrainNode, type Point2 } from '@/lib/brain-layout';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BrainGraphHandle } from './BrainGraph3D';

interface Props {
  nodes: BrainNode[];
  links: BrainLink[];
  selectedId: string | null;
  highlightedIds: Set<string> | null;
  showEdges: boolean;
  showLabels: boolean;
  onSelect: (node: BrainNode) => void;
  onOpen: (node: BrainNode) => void;
  onClear: () => void;
}

interface ViewBox { x: number; y: number; width: number; height: number }

const INITIAL_VIEW: ViewBox = { x: -500, y: -350, width: 1000, height: 700 };
const TYPE_COLORS: Record<string, string> = {
  NOTE: '#78cdc4',
  ACTIVITY: '#f0b36b',
  PERSON: '#9d8cf5',
  PROJECT: '#5ba7e8',
  TOPIC: '#e887b4',
  ORGANIZATION: '#8bc779',
};

export const BrainGraph2D = forwardRef<BrainGraphHandle, Props>(function BrainGraph2D(props, ref) {
  const { t } = useLanguage();
  const [viewBox, setViewBox] = useState(INITIAL_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const positions = useMemo(() => layoutBrainNodes2D(props.nodes, props.links), [props.nodes, props.links]);
  const degree = useMemo(() => {
    const counts = new Map<string, number>();
    props.links.forEach(link => {
      counts.set(link.source, (counts.get(link.source) ?? 0) + 1);
      counts.set(link.target, (counts.get(link.target) ?? 0) + 1);
    });
    return counts;
  }, [props.links]);
  useImperativeHandle(ref, () => ({
    zoom(direction) {
      setViewBox(current => {
        const factor = direction > 0 ? 0.78 : 1 / 0.78;
        const width = Math.min(10000, Math.max(125, current.width * factor));
        const height = Math.min(7000, Math.max(88, current.height * factor));
        return {
          x: current.x + (current.width - width) / 2,
          y: current.y + (current.height - height) / 2,
          width,
          height,
        };
      });
    },
    reset() { setViewBox(INITIAL_VIEW); },
    enter() { setViewBox(INITIAL_VIEW); },
  }), []);

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = viewBox.x + ((event.clientX - bounds.left) / bounds.width) * viewBox.width;
    const y = viewBox.y + ((event.clientY - bounds.top) / bounds.height) * viewBox.height;
    const factor = event.deltaY < 0 ? 0.85 : 1 / 0.85;
    setViewBox(current => {
      const width = Math.min(10000, Math.max(125, current.width * factor));
      const height = Math.min(7000, Math.max(88, current.height * factor));
      const ratio = width / current.width;
      return { x: x - (x - current.x) * ratio, y: y - (y - current.y) * ratio, width, height };
    });
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setViewBox(current => ({
      ...current,
      x: current.x - (event.clientX - drag.x) * current.width / bounds.width,
      y: current.y - (event.clientY - drag.y) * current.height / bounds.height,
    }));
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
  };

  const handleNodeKeyDown = (event: KeyboardEvent<SVGGElement>, node: BrainNode) => {
    if (event.key === 'Enter') { event.preventDefault(); props.onOpen(node); }
    if (event.key === ' ') { event.preventDefault(); props.onSelect(node); }
  };

  return <svg
    ref={svgRef}
    className="absolute inset-0 h-full w-full touch-none"
    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
    role="img"
    aria-label={t('nav_graph')}
    onWheel={handleWheel}
    onPointerDown={(event) => {
      if (event.target !== event.currentTarget) return;
      dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={handlePointerMove}
    onPointerUp={(event) => {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    }}
    onPointerCancel={() => { dragRef.current = null; }}
    onClick={(event) => { if (event.target === event.currentTarget) props.onClear(); }}
    onDoubleClick={(event) => { if (event.target === event.currentTarget) props.onClear(); }}
  >
    {props.showEdges && props.links.map((link, index) => {
      const source = positions.get(link.source), target = positions.get(link.target);
      if (!source || !target) return null;
      const highlighted = !props.highlightedIds || (props.highlightedIds.has(link.source) && props.highlightedIds.has(link.target));
      return <line
        key={`${link.source}:${link.target}:${index}`}
        x1={source[0]} y1={source[1]} x2={target[0]} y2={target[1]}
        stroke="var(--graph-node)"
        strokeOpacity={highlighted ? 0.32 : 0.07}
        strokeWidth={1.25}
        pointerEvents="none"
      />;
    })}
    {props.nodes.map(node => {
      const point: Point2 | undefined = positions.get(node.id);
      if (!point) return null;
      const isSelected = node.id === props.selectedId;
      const isHighlighted = !props.highlightedIds || props.highlightedIds.has(node.id);
      const isDimmed = Boolean(props.highlightedIds && !isHighlighted);
      const radius = 5 + Math.min(8, (degree.get(node.id) ?? 0) * 0.55);
      const showLabel = props.showLabels && (isSelected || isHighlighted && (viewBox.width < 850 || (degree.get(node.id) ?? 0) >= 4));
      return <g
        key={node.id}
        transform={`translate(${point[0]} ${point[1]})`}
        role="button"
        tabIndex={0}
        aria-label={node.label}
        aria-pressed={isSelected}
        className="cursor-pointer outline-none"
        opacity={isDimmed ? 0.18 : 1}
        onClick={event => { event.stopPropagation(); props.onSelect(node); }}
        onDoubleClick={event => { event.stopPropagation(); props.onOpen(node); }}
        onKeyDown={event => handleNodeKeyDown(event, node)}
      >
        <circle r={radius + (isSelected ? 5 : 0)} fill={TYPE_COLORS[node.type] ?? '#8c969f'} opacity={isSelected ? 0.2 : 0} />
        <circle r={radius} fill={TYPE_COLORS[node.type] ?? '#8c969f'} stroke={isSelected ? 'var(--graph-node)' : 'none'} strokeWidth={2} />
        {showLabel && <text
          y={radius + 18}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize={14}
          paintOrder="stroke"
          stroke="hsl(var(--background))"
          strokeWidth={4}
          strokeLinejoin="round"
          className="pointer-events-none select-none"
        >{node.label.length > 32 ? `${node.label.slice(0, 31)}…` : node.label}</text>}
      </g>;
    })}
  </svg>;
});
