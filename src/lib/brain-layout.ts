export interface BrainNode {
  id: string;
  label: string;
  type: string;
  createdAt?: string;
}

export interface BrainLink { source: string; target: string }
export type Point3 = [number, number, number];

// Axes: x = left/right, y = up/down, z = front(+)/back(-).
// A generated network, not an anatomical model: the outer surface of a union of
// ellipsoids (cerebrum, two temporal lobes, cerebellum, brain stem) with a
// longitudinal fissure, central/Sylvian grooves, gyri-like folds and cerebellar
// lamellae. Only points that are not buried inside another part are kept, so
// the silhouette is the real outline and density is even. Fully deterministic.

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

interface Blob {
  name: 'cerebrum' | 'temporal' | 'cerebellum' | 'stem';
  c: Point3;               // centre
  a: Point3;               // semi-axes
  rx: number;              // tilt around the x axis
  polar: 0 | 1 | 2;        // axis the Fibonacci latitude runs along (the longest one)
}

const BLOBS: Blob[] = [
  { name: 'cerebrum',   c: [0, 0.75, 0],       a: [2.45, 1.8, 2.95], rx: 0,    polar: 2 },
  { name: 'temporal',   c: [-1.75, -0.8, 0.4],  a: [0.85, 0.6, 1.65], rx: 0.18, polar: 2 },
  { name: 'temporal',   c: [1.75, -0.8, 0.4],   a: [0.85, 0.6, 1.65], rx: 0.18, polar: 2 },
  { name: 'cerebellum', c: [0, -1.05, -1.95],  a: [1.45, 0.65, 0.95], rx: 0,    polar: 0 },
  { name: 'stem',       c: [0, -1.6, -0.8],    a: [0.36, 1.1, 0.36], rx: 0.28, polar: 1 },
];

// Fibonacci sphere sample as a unit vector in the blob's own axes.
function canonical(b: Blob, local: number, total: number): Point3 {
  const lat = 1 - 2 * ((local + 0.5) / total);
  const r = Math.sqrt(Math.max(0, 1 - lat * lat));
  const ang = local * GOLDEN;
  const out: Point3 = [0, 0, 0];
  const others = [0, 1, 2].filter(i => i !== b.polar);
  out[b.polar] = lat;
  out[others[0]] = Math.cos(ang) * r;
  out[others[1]] = Math.sin(ang) * r;
  return out;
}

const rotX = (v: Point3, t: number): Point3 => [v[0], v[1] * Math.cos(t) - v[2] * Math.sin(t), v[1] * Math.sin(t) + v[2] * Math.cos(t)];
const place = (b: Blob, u: Point3, scale: Point3 = [1, 1, 1]): Point3 => {
  const o = rotX([u[0] * b.a[0] * scale[0], u[1] * b.a[1] * scale[1], u[2] * b.a[2] * scale[2]], b.rx);
  return [b.c[0] + o[0], b.c[1] + o[1], b.c[2] + o[2]];
};
function inside(p: Point3, b: Blob): boolean {
  const l = rotX([p[0] - b.c[0], p[1] - b.c[1], p[2] - b.c[2]], -b.rx);
  return (l[0] / b.a[0]) ** 2 + (l[1] / b.a[1]) ** 2 + (l[2] / b.a[2]) ** 2 < 0.97;
}
function area(b: Blob) { // Knud Thomsen approximation
  const [x, y, z] = b.a, p = 1.6;
  return 4 * Math.PI * (((x * y) ** p + (x * z) ** p + (y * z) ** p) / 3) ** (1 / p);
}

// Surface detail for one sample of one part.
function detail(b: Blob, u: Point3): Point3 {
  const [ux, uy, uz] = u;
  if (b.name === 'cerebrum') {
    const side = ux >= 0 ? 1 : -1;
    const ax = Math.abs(ux);
    const sylvian = gauss(uy, -0.2 - 0.3 * uz, 0.07) * smooth(0.3, 0.7, ax);
    const central = gauss(uz, -0.05 + 0.4 * ax, 0.055) * smooth(0.2, 0.5, uy);
    const fold = 1 + 0.05 * Math.sin(ux * 9 + uz * 6) * Math.cos(uy * 10 - uz * 5)
                   + 0.035 * Math.sin(uz * 15 + uy * 7 - ux * 6)
                   - 0.1 * sylvian - 0.085 * central;
    const p = place(b, u, [fold, fold, fold]);
    // longitudinal fissure: split into hemispheres and sink the top midline
    const dx = Math.abs(p[0]);
    const sink = uy > 0 ? 0.3 * uy * gauss(dx, 0, 0.4) : 0;
    return [side * (0.1 + dx), p[1] - sink, p[2]];
  }
  if (b.name === 'temporal') {
    const f = 1 + 0.05 * Math.sin(ux * 8 + uz * 7) * Math.cos(uy * 9);
    return place(b, u, [f, f, f]);
  }
  if (b.name === 'cerebellum') {
    const f = 1 + 0.07 * Math.sin(uy * 30 + ux * 1.5);   // horizontal lamellae
    const vermis = 1 - 0.1 * gauss(ux, 0, 0.12);
    return place(b, u, [f, f * vermis, f]);
  }
  return place(b, u);
}

interface PoolEntry { p: Point3; c: Point3 }
const poolCache = new Map<number, PoolEntry[]>();
function pool(count: number): PoolEntry[] {
  const cached = poolCache.get(count);
  if (cached) return cached;
  const areas = BLOBS.map(area);
  const sum = areas.reduce((x, y) => x + y, 0);
  let factor = 2.4, kept: PoolEntry[] = [];
  for (let attempt = 0; attempt < 4 && kept.length < count; attempt++, factor *= 1.5) {
    kept = [];
    BLOBS.forEach((b, bi) => {
      const m = Math.ceil(count * factor * areas[bi] / sum);
      for (let i = 0; i < m; i++) {
        const u = canonical(b, i, m);
        const base = place(b, u);
        if (BLOBS.some((o, oi) => oi !== bi && inside(base, o))) continue; // buried in another part
        kept.push({ p: detail(b, u), c: b.c });
      }
    });
  }
  const out = Array.from({ length: count }, (_, i) => kept[Math.min(kept.length - 1, Math.floor((i + 0.5) * kept.length / count))]);
  poolCache.set(count, out);
  return out;
}

// `depth` < 1 pulls a point toward the centre of its own part (not the world
// origin), so interior nodes stay inside the lobe they belong to.
export function brainPoint(index: number, count: number, depth = 1): Point3 {
  const e = pool(count)[Math.min(Math.max(0, index), count - 1)];
  return [e.c[0] + depth * (e.p[0] - e.c[0]), e.c[1] + depth * (e.p[1] - e.c[1]), e.c[2] + depth * (e.p[2] - e.c[2])];
}

// ---- scaffold -----------------------------------------------------------------

export interface BrainScaffold { points: Point3[]; links: [number, number][] }

// k-nearest links through a uniform grid (the old version sorted every point
// against every other one: O(n^2 log n) on each mount).
function nearestLinks(points: Point3[], k = 3): [number, number][] {
  const cell = 0.5;
  const grid = new Map<string, number[]>();
  const c = (v: number) => Math.floor(v / cell);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  points.forEach((p, i) => {
    const kk = key(c(p[0]), c(p[1]), c(p[2]));
    const bucket = grid.get(kk);
    if (bucket) bucket.push(i); else grid.set(kk, [i]);
  });
  const seen = new Set<number>();
  const links: [number, number][] = [];
  points.forEach((p, i) => {
    const cx = c(p[0]), cy = c(p[1]), cz = c(p[2]);
    let cand: number[] = [];
    for (let r = 1; r <= 3 && cand.length < k + 1; r++) {
      cand = [];
      for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
        const bucket = grid.get(key(x, y, z));
        if (bucket) for (const j of bucket) if (j !== i) cand.push(j);
      }
    }
    const near = cand
      .map(j => ({ j, d: (p[0] - points[j][0]) ** 2 + (p[1] - points[j][1]) ** 2 + (p[2] - points[j][2]) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k);
    for (const { j } of near) {
      const a = Math.min(i, j), b = Math.max(i, j);
      const id = a * points.length + b;
      if (!seen.has(id)) { seen.add(id); links.push([a, b]); }
    }
  });
  return links;
}

const scaffoldCache = new Map<number, BrainScaffold>();
export function createBrainScaffold(count = 1800): BrainScaffold {
  const cached = scaffoldCache.get(count);
  if (cached) return cached;
  const points = Array.from({ length: count }, (_, i) => brainPoint(i, count));
  const scaffold = { points, links: nearestLinks(points) };
  scaffoldCache.set(count, scaffold);
  return scaffold;
}

const bufferCache = new WeakMap<BrainScaffold, { points: Float32Array; lines: Float32Array }>();
export function scaffoldBuffers(scaffold: BrainScaffold) {
  const cached = bufferCache.get(scaffold);
  if (cached) return cached;
  const points = new Float32Array(scaffold.points.length * 3);
  scaffold.points.forEach((p, i) => points.set(p, i * 3));
  const lines = new Float32Array(scaffold.links.length * 6);
  scaffold.links.forEach(([a, b], i) => {
    lines.set(scaffold.points[a], i * 6);
    lines.set(scaffold.points[b], i * 6 + 3);
  });
  const buffers = { points, lines };
  bufferCache.set(scaffold, buffers);
  return buffers;
}

// ---- topology-aware node placement ---------------------------------------------

// Smooth, low-frequency coordinates of the graph (random-walk eigenvectors via
// power iteration). Linked nodes get similar coordinates.
function spectral(n: number, adj: number[][], dims = 3): Float64Array[] {
  const deg = adj.map(a => Math.max(1, a.length));
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const vecs: Float64Array[] = [];
  for (let d = 0; d < dims; d++) {
    let v = Float64Array.from({ length: n }, () => rnd() - 0.5);
    for (let it = 0; it < 60; it++) {
      const w = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (const j of adj[i]) s += v[j];
        w[i] = 0.5 * v[i] + 0.5 * s / deg[i];
      }
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) { num += deg[i] * w[i]; den += deg[i]; }
      const mean = num / den;
      for (let i = 0; i < n; i++) w[i] -= mean;
      for (const u of vecs) {
        let a = 0, b = 0;
        for (let i = 0; i < n; i++) { a += deg[i] * w[i] * u[i]; b += deg[i] * u[i] * u[i]; }
        const c = a / (b || 1);
        for (let i = 0; i < n; i++) w[i] -= c * u[i];
      }
      let norm = 0;
      for (let i = 0; i < n; i++) norm += w[i] * w[i];
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < n; i++) w[i] /= norm;
      v = w;
    }
    vecs.push(v);
  }
  return vecs;
}

// Rank-preserving recursive bisection: nodes sorted by one spectral coordinate
// are matched to slots sorted by one spatial axis (z, then x, then y), halving
// each time. Every node gets its own slot, so nothing is stacked.
function match(items: number[], slotIds: number[], emb: Float64Array[], slots: Point3[], depth: number, out: number[]) {
  if (items.length === 0) return;
  if (items.length === 1) { out[items[0]] = slotIds[0]; return; }
  const k = depth % 3;
  const geo = [2, 0, 1][k];
  items.sort((a, b) => emb[k][a] - emb[k][b] || a - b);
  slotIds.sort((a, b) => slots[a][geo] - slots[b][geo] || a - b);
  const mid = items.length >> 1;
  match(items.slice(0, mid), slotIds.slice(0, mid), emb, slots, depth + 1, out);
  match(items.slice(mid), slotIds.slice(mid), emb, slots, depth + 1, out);
}

export function layoutBrainNodes(nodes: BrainNode[], links: BrainLink[] = []): Map<string, Point3> {
  const n = nodes.length;
  const positions = new Map<string, Point3>();
  if (!n) return positions;
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const total = Math.max(900, n);
  const slots: Point3[] = sorted.map((_, i) => {
    const s = Math.floor((i + 0.5) * total / n);
    // three depth layers: most nodes on the surface, the rest filling the volume
    const h = ((s * 2654435761) >>> 0) % 100;
    return brainPoint(s, total, h < 14 ? 0.5 : h < 38 ? 0.75 : 0.98);
  });
  const index = new Map(sorted.map((nd, i) => [nd.id, i]));
  const adj: number[][] = sorted.map(() => []);
  for (const l of links) {
    const a = index.get(l.source), b = index.get(l.target);
    if (a === undefined || b === undefined || a === b) continue;
    adj[a].push(b);
    adj[b].push(a);
  }
  const emb = spectral(n, adj);
  const out: number[] = new Array(n);
  match(sorted.map((_, i) => i), slots.map((_, i) => i), emb, slots, 0, out);
  sorted.forEach((nd, i) => positions.set(nd.id, slots[out[i]]));
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
