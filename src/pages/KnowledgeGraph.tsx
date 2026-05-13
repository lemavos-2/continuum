import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { graphApi, entitiesApi } from "@/lib/api";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Brain,
  Search,
  Tag,
  Eye,
  EyeOff,
  Spline,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SideInspector } from "@/components/SideInspector";
import { useEntityStore } from "@/contexts/EntityContext";
import type { Entity, EntityType } from "@/types";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
  recent?: boolean;
  createdAt?: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

// Resolved via CSS variables to follow design tokens
const TYPE_COLORS: Record<string, string> = {
  NOTE: "hsl(0, 0%, 95%)",
  ACTIVITY: "hsl(0, 0%, 78%)",
  PERSON: "hsl(0, 0%, 65%)",
  PROJECT: "hsl(0, 0%, 55%)",
  TOPIC: "hsl(0, 0%, 45%)",
  ORGANIZATION: "hsl(0, 0%, 38%)",
};

const TYPE_LABELS: Record<string, string> = {
  NOTE: "Note",
  ACTIVITY: "Activity",
  PERSON: "Person",
  PROJECT: "Project",
  TOPIC: "Topic",
  ORGANIZATION: "Organization",
};

const BASE_RADIUS: Record<string, number> = {
  NOTE: 4, ACTIVITY: 5, PERSON: 5, PROJECT: 6, TOPIC: 5, ORGANIZATION: 6,
};

// ── Barnes-Hut quadtree (mutable for perf) ──────────────────────────────
interface QuadNode {
  x: number; y: number; w: number; h: number;
  cx: number; cy: number; mass: number;
  node: GraphNode | null;
  children: (QuadNode | null)[] | null;
}

function makeQuad(x: number, y: number, w: number, h: number): QuadNode {
  return { x, y, w, h, cx: 0, cy: 0, mass: 0, node: null, children: null };
}

function quadInsert(q: QuadNode, n: GraphNode, depth = 0) {
  if (depth > 16) return;
  if (q.mass === 0 && q.node === null) {
    q.node = n; q.cx = n.x; q.cy = n.y; q.mass = 1;
    return;
  }
  if (q.children === null) {
    // subdivide
    const hw = q.w / 2, hh = q.h / 2;
    q.children = [
      makeQuad(q.x, q.y, hw, hh),
      makeQuad(q.x + hw, q.y, hw, hh),
      makeQuad(q.x, q.y + hh, hw, hh),
      makeQuad(q.x + hw, q.y + hh, hw, hh),
    ];
    if (q.node) {
      const old = q.node; q.node = null;
      const idx = (old.x >= q.x + hw ? 1 : 0) + (old.y >= q.y + hh ? 2 : 0);
      quadInsert(q.children[idx]!, old, depth + 1);
    }
  }
  q.cx = (q.cx * q.mass + n.x) / (q.mass + 1);
  q.cy = (q.cy * q.mass + n.y) / (q.mass + 1);
  q.mass += 1;
  const hw = q.w / 2, hh = q.h / 2;
  const idx = (n.x >= q.x + hw ? 1 : 0) + (n.y >= q.y + hh ? 2 : 0);
  quadInsert(q.children[idx]!, n, depth + 1);
}

function quadForce(q: QuadNode, n: GraphNode, theta: number, repulsion: number) {
  if (q.mass === 0) return;
  if (q.node === n) return;
  const dx = q.cx - n.x;
  const dy = q.cy - n.y;
  const d2 = dx * dx + dy * dy + 0.01;
  if (q.children === null || (q.w * q.w) / d2 < theta * theta) {
    const dist = Math.sqrt(d2);
    const force = (repulsion * q.mass) / d2;
    n.vx -= (dx / dist) * force;
    n.vy -= (dy / dist) * force;
    return;
  }
  for (const c of q.children) if (c) quadForce(c, n, theta, repulsion);
}

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"all" | "7d" | "30d">("all");
  const [legendOpen, setLegendOpen] = useState(false);

  const { inspectorOpen, inspectorEntity, openInspector, closeInspector } = useEntityStore();
  const [allEntities, setAllEntities] = useState<Entity[]>([]);

  // Refs (avoid re-renders during simulation)
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const adjRef = useRef<Map<string, Set<string>>>(new Map());
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const draggingRef = useRef<GraphNode | null>(null);
  const panningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const alphaRef = useRef(1);
  const selectedRef = useRef<GraphNode | null>(null);
  const hoveredRef = useRef<GraphNode | null>(null);
  const filtersRef = useRef<Set<string>>(typeFilters);
  const searchRef = useRef<string>("");
  const showLabelsRef = useRef(true);
  const showEdgesRef = useRef(true);
  const timeFilterRef = useRef<"all" | "7d" | "30d">("all");
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const tappedAtRef = useRef(0);

  useEffect(() => { selectedRef.current = selectedNode; alphaRef.current = Math.max(alphaRef.current, 0.3); }, [selectedNode]);
  useEffect(() => { hoveredRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { filtersRef.current = typeFilters; }, [typeFilters]);
  useEffect(() => { searchRef.current = search.trim().toLowerCase(); }, [search]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { showEdgesRef.current = showEdges; }, [showEdges]);
  useEffect(() => { timeFilterRef.current = timeFilter; alphaRef.current = Math.max(alphaRef.current, 0.4); }, [timeFilter]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const isNodeVisible = useCallback((n: GraphNode) => {
    const f = filtersRef.current;
    if (f.size > 0 && !f.has(n.type)) return false;
    const tf = timeFilterRef.current;
    if (tf !== "all" && n.createdAt) {
      const diff = Date.now() - new Date(n.createdAt).getTime();
      const limit = tf === "7d" ? 7 * 86400000 : 30 * 86400000;
      if (diff > limit) return false;
    } else if (tf !== "all" && !n.createdAt) {
      // fallback: hide unknown-date nodes when filtering
      return false;
    }
    return true;
  }, []);

  const neighborIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const n = adjRef.current.get(selectedNode.id) || new Set<string>();
    const out = new Set<string>(n);
    out.add(selectedNode.id);
    return out;
  }, [selectedNode]);

  const neighborIdsRef = useRef(neighborIds);
  useEffect(() => { neighborIdsRef.current = neighborIds; }, [neighborIds]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const z = zoomRef.current;
    const p = panRef.current;
    return { x: (sx - p.x) / z, y: (sy - p.y) / z };
  }, []);

  const findNodeAt = useCallback((sx: number, sy: number) => {
    const w = screenToWorld(sx, sy);
    const z = zoomRef.current;
    const nodes = nodesRef.current;
    const hitPad = (isMobile ? 10 : 4) / z;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!isNodeVisible(n)) continue;
      const r = (BASE_RADIUS[n.type] || 5) + Math.min(6, n.degree * 0.6) + hitPad;
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      if (dx * dx + dy * dy < r * r) return n;
    }
    return null;
  }, [screenToWorld, isMobile, isNodeVisible]);

  // ── Simulation step (Barnes-Hut, cooling) ────────────────────────────
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;
    if (alphaRef.current < 0.01) return;

    const repulsion = 220;
    const attraction = 0.025;
    const idealLen = 90;
    const damping = 0.82;
    const centerForce = 0.012;
    const alpha = alphaRef.current;

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }
    const pad = 50;
    const w = Math.max(maxX - minX, maxY - minY, 200) + pad * 2;
    const root = makeQuad(minX - pad, minY - pad, w, w);
    for (const n of nodes) quadInsert(root, n);

    // Repulsion via quadtree
    for (const n of nodes) {
      n.vx -= n.x * centerForce;
      n.vy -= n.y * centerForce;
      quadForce(root, n, 0.9, repulsion);
    }

    // Spring attraction
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - idealLen) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    const drag = draggingRef.current;
    for (const n of nodes) {
      if (n === drag) continue;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
    }

    alphaRef.current *= 0.985;
  }, []);

  // ── Render ───────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const selected = selectedRef.current;
    const hovered = hoveredRef.current;
    const neighbors = neighborIdsRef.current;
    const hasSelection = selected !== null;
    const z = zoomRef.current;
    const sq = searchRef.current;
    const showL = showLabelsRef.current;

    // Edges
    if (showEdgesRef.current) {
      ctx.lineCap = "round";
      for (const e of edges) {
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
        if (!a || !b) continue;
        if (!isNodeVisible(a) || !isNodeVisible(b)) continue;
        const isHighlighted = hasSelection && neighbors.has(e.source) && neighbors.has(e.target);
        if (hasSelection && !isHighlighted) {
          ctx.strokeStyle = "hsla(0,0%,100%,0.025)";
          ctx.lineWidth = 0.6 / z;
        } else if (isHighlighted) {
          ctx.strokeStyle = "hsla(180,80%,55%,0.55)";
          ctx.lineWidth = 1.8 / z;
        } else {
          // edge thickness by combined degree
          const w = Math.min(2.2, 0.5 + (a.degree + b.degree) * 0.04) / z;
          ctx.strokeStyle = "hsla(180,60%,50%,0.18)";
          ctx.lineWidth = w;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Nodes
    for (const n of nodes) {
      const visible = isNodeVisible(n);
      const r = (BASE_RADIUS[n.type] || 5) + Math.min(8, n.degree * 0.6);
      const color = TYPE_COLORS[n.type] || "hsl(0,0%,40%)";
      const isHovered = hovered?.id === n.id;
      const isSelected = selected?.id === n.id;
      const isNeighbor = hasSelection && neighbors.has(n.id);
      const matchesSearch = sq.length > 0 && n.label.toLowerCase().includes(sq);
      const dimmed = !visible || (hasSelection && !isNeighbor) || (sq.length > 0 && !matchesSearch);

      const drawRadius = isHovered || isSelected ? r + 3 : r;
      const nodeAlpha = dimmed ? 0.07 : 1;

      // glow
      if (!dimmed && (isSelected || isHovered || isNeighbor || matchesSearch || n.recent)) {
        ctx.save();
        ctx.globalAlpha = isSelected ? 0.5 : matchesSearch ? 0.45 : isHovered ? 0.35 : 0.2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius + 8, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = nodeAlpha;
      ctx.beginPath();
      ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "hsl(0,0%,100%)";
        ctx.lineWidth = 2 / z;
        ctx.stroke();
      } else if (matchesSearch) {
        ctx.strokeStyle = "hsla(180,90%,60%,0.9)";
        ctx.lineWidth = 1.6 / z;
        ctx.stroke();
      }

      // labels
      const labelable = !dimmed && showL && (
        isHovered || isSelected || isNeighbor || matchesSearch ||
        z > 1.1 || (z > 0.55 && n.degree >= 3)
      );
      if (labelable) {
        const fontSize = Math.max(10, 11 / z);
        ctx.font = `${isSelected || isHovered ? "600" : "400"} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = isSelected || isHovered
          ? "hsl(0,0%,100%)"
          : "hsla(0,0%,100%,0.55)";
        const text = n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label;
        ctx.fillText(text, n.x, n.y + drawRadius + fontSize + 2);
      }
      ctx.restore();
    }
  }, [isNodeVisible]);

  const tick = useCallback(() => {
    simulate();
    draw();
    animFrameRef.current = requestAnimationFrame(tick);
  }, [simulate, draw]);

  // ── Resize handling (only resize canvas on size change) ──────────────
  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    dprRef.current = dpr;
    sizeRef.current = { w, h };
    alphaRef.current = Math.max(alphaRef.current, 0.3);
  }, [isMobile]);

  // ── Load graph ──────────────────────────────────────────────────────
  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading graph data...');
      const [graphRes, entitiesRes] = await Promise.all([graphApi.data(), entitiesApi.list()]);
      console.log('Graph response:', graphRes);
      console.log('Entities response:', entitiesRes);
      const data = graphRes.data;
      const entities = Array.isArray(entitiesRes.data) ? entitiesRes.data : [];
      console.log('Entities data:', entities);
      setAllEntities(entities);

      const rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
      const rawEdges = Array.isArray(data?.links) ? data.links : (Array.isArray((data as any)?.edges) ? (data as any).edges : []);

      if (rawNodes.length === 0) {
        setEmpty(true);
        setGraphStats({ nodes: 0, edges: 0 });
        return;
      }

      // Degree map + adjacency
      const degree = new Map<string, number>();
      const adj = new Map<string, Set<string>>();
      for (const e of rawEdges as GraphEdge[]) {
        degree.set(e.source, (degree.get(e.source) || 0) + 1);
        degree.set(e.target, (degree.get(e.target) || 0) + 1);
        if (!adj.has(e.source)) adj.set(e.source, new Set());
        if (!adj.has(e.target)) adj.set(e.target, new Set());
        adj.get(e.source)!.add(e.target);
        adj.get(e.target)!.add(e.source);
      }
      adjRef.current = adj;

      const entityMap = new Map(entities.map(e => [e.id, e]));
      const recentLimit = Date.now() - 7 * 86400000;

      const nextNodes: GraphNode[] = rawNodes.map((n: any, i: number) => {
        const ent = entityMap.get(n.id);
        const createdAt = ent?.createdAt;
        const angle = (i / rawNodes.length) * Math.PI * 2;
        const radius = Math.sqrt(rawNodes.length) * 25;
        return {
          id: n.id,
          label: n.label,
          type: String(n.type),
          x: Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
          y: Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          degree: degree.get(n.id) || 0,
          createdAt,
          recent: createdAt ? new Date(createdAt).getTime() > recentLimit : false,
        };
      });

      nodesRef.current = nextNodes;
      edgesRef.current = rawEdges as GraphEdge[];
      setGraphStats({ nodes: nextNodes.length, edges: (rawEdges as GraphEdge[]).length });
      alphaRef.current = 1;

      // Center view
      requestAnimationFrame(() => {
        resizeCanvas();
        const { w, h } = sizeRef.current;
        panRef.current = { x: w / 2, y: h / 2 };
        zoomRef.current = 1;
      });
      setEmpty(false);
    } catch {
      setEmpty(true);
      setGraphStats({ nodes: 0, edges: 0 });
    } finally {
      setLoading(false);
    }
  }, [resizeCanvas]);

  useEffect(() => { void loadGraph(); }, [loadGraph]);

  useEffect(() => {
    if (loading || empty) return;
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [loading, empty, tick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    resizeCanvas();
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // ── Interaction ─────────────────────────────────────────────────────
  const focusNode = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    const entity = allEntities.find(e => e.id === node.id);
    if (entity) {
      openInspector(entity);
    } else {
      openInspector({
        id: node.id,
        title: node.label,
        type: (node.type as EntityType) || "TOPIC",
        createdAt: node.createdAt || new Date().toISOString(),
        ownerId: "",
      });
    }
    // Smooth re-center
    const { w, h } = sizeRef.current;
    const z = zoomRef.current;
    panRef.current = { x: w / 2 - node.x * z, y: h / 2 - node.y * z };
  }, [allEntities, openInspector]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      draggingRef.current = node;
      focusNode(node);
      alphaRef.current = Math.max(alphaRef.current, 0.3);
    } else {
      panningRef.current = true;
      setSelectedNode(null);
      closeInspector();
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (draggingRef.current) {
      const w = screenToWorld(sx, sy);
      draggingRef.current.x = w.x;
      draggingRef.current.y = w.y;
      draggingRef.current.vx = 0;
      draggingRef.current.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.4);
    } else if (panningRef.current) {
      panRef.current.x += e.clientX - lastMouseRef.current.x;
      panRef.current.y += e.clientY - lastMouseRef.current.y;
    } else {
      const node = findNodeAt(sx, sy);
      setHoveredNode(node);
      setTooltipPos(node ? { x: sx, y: sy } : null);
      if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "grab";
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { draggingRef.current = null; panningRef.current = false; };

  const handleWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const oldZ = zoomRef.current;
    const newZ = Math.max(0.15, Math.min(5, oldZ * (e.deltaY < 0 ? 1.1 : 0.9)));
    panRef.current.x = sx - (sx - panRef.current.x) * (newZ / oldZ);
    panRef.current.y = sy - (sy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (!node) return;
    if (node.type === "NOTE") navigate(`/notes/${node.id}`);
    else navigate(`/entities/${node.id}`);
  };

  const handleZoom = (dir: number) => {
    const { w, h } = sizeRef.current;
    const cx = w / 2, cy = h / 2;
    const oldZ = zoomRef.current;
    const newZ = Math.max(0.15, Math.min(5, oldZ * (dir > 0 ? 1.3 : 0.77)));
    panRef.current.x = cx - (cx - panRef.current.x) * (newZ / oldZ);
    panRef.current.y = cy - (cy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleReset = () => {
    const { w, h } = sizeRef.current;
    panRef.current = { x: w / 2, y: h / 2 };
    zoomRef.current = 1;
    setTypeFilters(new Set());
    setSearch("");
    setTimeFilter("all");
    setSelectedNode(null);
    closeInspector();
    alphaRef.current = 0.5;
  };

  // ── Touch handlers (pinch + drag + tap) ─────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY;
      pinchRef.current = {
        dist: Math.sqrt(dx * dx + dy * dy),
        cx: (t1.clientX + t2.clientX) / 2,
        cy: (t1.clientY + t2.clientY) / 2,
      };
      draggingRef.current = null;
      panningRef.current = false;
      return;
    }
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    const now = Date.now();
    if (node && now - tappedAtRef.current < 300) {
      // double-tap → open
      if (node.type === "NOTE") navigate(`/notes/${node.id}`);
      else navigate(`/entities/${node.id}`);
      tappedAtRef.current = 0;
      return;
    }
    tappedAtRef.current = now;
    if (node) { draggingRef.current = node; focusNode(node); }
    else { panningRef.current = true; setSelectedNode(null); closeInspector(); }
    lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
      const cy = (t1.clientY + t2.clientY) / 2 - rect.top;
      const oldZ = zoomRef.current;
      const ratio = dist / pinchRef.current.dist;
      const newZ = Math.max(0.15, Math.min(5, oldZ * ratio));
      panRef.current.x = cx - (cx - panRef.current.x) * (newZ / oldZ);
      panRef.current.y = cy - (cy - panRef.current.y) * (newZ / oldZ);
      zoomRef.current = newZ;
      pinchRef.current.dist = dist;
      return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    if (draggingRef.current) {
      const w = screenToWorld(sx, sy);
      draggingRef.current.x = w.x; draggingRef.current.y = w.y;
      draggingRef.current.vx = 0; draggingRef.current.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.4);
    } else if (panningRef.current) {
      panRef.current.x += touch.clientX - lastMouseRef.current.x;
      panRef.current.y += touch.clientY - lastMouseRef.current.y;
    }
    lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      draggingRef.current = null;
      panningRef.current = false;
    }
  };

  // Block native pinch-to-zoom & pull-to-refresh
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: TouchEvent) => { if (e.touches.length >= 1) e.preventDefault(); };
    const wheel = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener("touchmove", prevent, { passive: false });
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("touchmove", prevent);
      canvas.removeEventListener("wheel", wheel);
    };
  }, []);

  const availableTypes = useMemo(() => {
    const nodes = nodesRef.current;
    const types = new Set(nodes.map(n => n.type));
    return Array.from(types).map(t => ({
      type: t,
      label: TYPE_LABELS[t] || t,
      color: TYPE_COLORS[t] || "hsl(0,0%,40%)",
    }));
  }, [graphStats]);

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
    alphaRef.current = Math.max(alphaRef.current, 0.3);
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return [];
    return nodesRef.current
      .filter(n => n.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search]);

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
        {/* Toolbar */}
        <div className="px-3 lg:px-4 py-2.5 flex items-center justify-between border-b border-border/50 shrink-0 gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-base lg:text-lg font-semibold tracking-tight text-foreground leading-none">
              Knowledge Graph
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {graphStats.nodes} nodes · {graphStats.edges} connections
              {selectedNode && <> · <span className="text-primary">{selectedNode.label}</span></>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Search" onClick={() => setSearchOpen(v => !v)}>
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${showLabels ? "text-foreground" : "text-muted-foreground"}`}
              title={showLabels ? "Hide labels" : "Show labels"}
              onClick={() => setShowLabels(v => !v)}
            >
              {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${showEdges ? "text-foreground" : "text-muted-foreground"}`}
              title={showEdges ? "Hide edges" : "Show edges"}
              onClick={() => setShowEdges(v => !v)}
            >
              <Spline className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border/60 mx-1 hidden sm:block" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom(1)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoom(-1)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset view">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search bar (inline) */}
        {searchOpen && (
          <div className="px-3 lg:px-4 py-2 border-b border-border/30 shrink-0 relative">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search nodes…"
                className="pl-8 h-8 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-3 right-3 lg:left-4 lg:right-4 top-full mt-1 bg-popover border border-border/60 rounded-md shadow-lg z-30 overflow-hidden">
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { focusNode(n); setSearchOpen(false); setSearch(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[n.type] }} />
                    <span className="truncate text-foreground">{n.label}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{TYPE_LABELS[n.type] || n.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter chips */}
        {!empty && availableTypes.length > 0 && (
          <div className="px-3 lg:px-4 py-2 flex gap-1.5 flex-wrap items-center border-b border-border/30 shrink-0 overflow-x-auto">
            <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
            <button
              onClick={() => setTypeFilters(new Set())}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                typeFilters.size === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              All
            </button>
            {availableTypes.map(({ type, label, color }) => {
              const active = typeFilters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  {label}
                </button>
              );
            })}
            <div className="w-px h-3 bg-border/60 mx-1 shrink-0" />
            {(["all", "7d", "30d"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                  timeFilter === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {t === "all" ? "Anytime" : t === "7d" ? "Last 7d" : "Last 30d"}
              </button>
            ))}
          </div>
        )}

        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden min-h-0 touch-none">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading graph…</p>
              </div>
            </div>
          )}

          {empty && !loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center space-y-4 max-w-xs px-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    No connections detected yet
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Start creating notes and mention entities with <span className="text-primary font-medium">@</span> to grow your graph.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/notes")}>
                  Create first note →
                </Button>
              </div>
            </div>
          )}

          {!empty && (
            <canvas
              ref={canvasRef}
              className="bg-background select-none"
              style={{ display: "block", touchAction: "none" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            />
          )}

          {/* Hover tooltip */}
          {hoveredNode && tooltipPos && !selectedNode && (
            <div
              className="absolute z-20 pointer-events-none px-2.5 py-1.5 rounded-md bg-popover/95 backdrop-blur-sm border border-border/50 shadow-lg"
              style={{
                left: Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth || 300) - 180),
                top: Math.max(8, tooltipPos.y - 40),
              }}
            >
              <p className="text-xs font-medium text-foreground truncate max-w-[160px]">{hoveredNode.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {TYPE_LABELS[hoveredNode.type] || hoveredNode.type} · {hoveredNode.degree} link{hoveredNode.degree === 1 ? "" : "s"}
              </p>
            </div>
          )}

          {/* Legend */}
          {!empty && availableTypes.length > 0 && (
            <div className="absolute bottom-3 left-3">
              <button
                onClick={() => setLegendOpen(v => !v)}
                className="bento-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                Legend
              </button>
              {legendOpen && (
                <div className="bento-card p-2.5 space-y-1 max-w-[160px] mt-1.5">
                  {availableTypes.map(({ type, label, color }) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                  <p className="text-[9px] text-muted-foreground pt-1 border-t border-border/50">
                    {isMobile ? "Tap to inspect · Double-tap to open · Pinch to zoom" : "Click to inspect · Double-click to open · Scroll to zoom"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SideInspector
        isOpen={inspectorOpen}
        entity={inspectorEntity}
        onClose={() => { closeInspector(); setSelectedNode(null); }}
      />
    </AppLayout>
  );
}
