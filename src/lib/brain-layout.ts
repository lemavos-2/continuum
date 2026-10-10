export interface BrainNode {
  id: string;
  label: string;
  type: string;
  createdAt?: string;
}

export interface BrainLink { source: string; target: string }
export type Point3 = [number, number, number];

const goldenAngle = Math.PI * (3 - Math.sqrt(5));

// A generated network, not a solid anatomical model: paired cerebral lobes,
// a folded lower cerebellum, and a tapering brain stem, all with true depth.
export function brainPoint(index: number, count: number): Point3 {
  const part = index / Math.max(count, 1);
  if (part < 0.84) {
    const half = index % 2 === 0 ? -1 : 1;
    const local = Math.floor(index / 2);
    const total = Math.max(1, Math.ceil(count * 0.84 / 2));
    const y = 1 - 2 * ((local + 0.5) / total);
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = local * goldenAngle;
    const fold = 1 + 0.055 * Math.sin(angle * 5 + y * 8) * Math.cos(y * 11);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return [half * (0.15 + (x + 1) * 1.35) * fold, 0.55 + y * 2.05 * fold, z * 2.65 * fold];
  }
  if (part < 0.96) {
    const local = index - Math.ceil(count * 0.84);
    const total = Math.max(1, Math.ceil(count * 0.12));
    const y = 1 - 2 * ((local + 0.5) / total);
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    return [Math.cos(local * goldenAngle) * radius * 1.35, -1.25 + y * 0.8, -1.6 + Math.sin(local * goldenAngle) * radius * 1.1];
  }
  const local = index - Math.ceil(count * 0.96);
  const t = local / Math.max(1, count - Math.ceil(count * 0.96) - 1);
  const radius = 0.34 * (1 - t * 0.72);
  return [Math.cos(local * goldenAngle) * radius, -1.7 - t * 1.55, -0.85 - t * 0.4 + Math.sin(local * goldenAngle) * radius];
}

export function createBrainScaffold(count = 680) {
  const points = Array.from({ length: count }, (_, i) => brainPoint(i, count));
  const links: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const nearest = points.map((b, j) => ({ j, distance: (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2 }))
      .filter(p => p.j !== i).sort((a, b) => a.distance - b.distance).slice(0, 3);
    for (const { j } of nearest) if (i < j) links.push([i, j]);
  }
  return { points, links };
}

export function layoutBrainNodes(nodes: BrainNode[]): Map<string, Point3> {
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const positions = new Map<string, Point3>();
  sorted.forEach((node, i) => {
    // Spread small graphs across both hemispheres; larger graphs also occupy
    // the interior rather than creating a flat surface-only diagram.
    const slot = Math.floor((i + 0.5) * 680 / Math.max(1, sorted.length));
    const p = brainPoint(slot, 680);
    const depth = i % 5 === 0 ? 0.62 : 0.98;
    positions.set(node.id, [p[0] * depth, p[1] * depth, p[2] * depth]);
  });
  return positions;
}

export function normalizeBrainLinks(nodes: BrainNode[], links: BrainLink[]): BrainLink[] {
  const ids = new Set(nodes.map(n => n.id));
  const seen = new Set<string>();
  return links.filter(link => {
    if (!ids.has(link.source) || !ids.has(link.target) || link.source === link.target) return false;
    const key = [link.source, link.target].sort().join('\u0000');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}