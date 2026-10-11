import { BRAIN_PATTERN_B64 } from './brain-pattern-data';

export interface BrainNode {
  id: string;
  label: string;
  type: string;
  createdAt?: string;
}

export interface BrainLink { source: string; target: string }
export type Point3 = [number, number, number];

// A stylised brain, not an anatomical one: two hemispheres with a deep
// longitudinal fissure, temporal lobes, a small striated cerebellum and a brain
// stem stub, wrapped in brain-coral style folds (gyri and sulci). Everything is
// generated from a handful of ellipsoids plus a precomputed fold pattern, so it
// is deterministic and tiny (no model file).
//
// Axes: x = left/right, y = up/down, z = front(+)/back(-); about 5.6 wide,
// 5.4 tall and 6 long.

// ---- icosphere -------------------------------------------------------------------

export function icosphere(level: number) {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw = [-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1];
  const verts: number[] = [];
  for (let i = 0; i < raw.length; i += 3) {
    const l = Math.hypot(raw[i], raw[i + 1], raw[i + 2]);
    verts.push(raw[i] / l, raw[i + 1] / l, raw[i + 2] / l);
  }
  let faces = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  for (let step = 0; step < level; step++) {
    const cache = new Map<number, number>();
    const mid = (a: number, b: number) => {
      const key = a < b ? a * 65536 + b : b * 65536 + a;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const x = verts[a * 3] + verts[b * 3], y = verts[a * 3 + 1] + verts[b * 3 + 1], z = verts[a * 3 + 2] + verts[b * 3 + 2];
      const l = Math.hypot(x, y, z);
      const index = verts.length / 3;
      verts.push(x / l, y / l, z / l);
      cache.set(key, index);
      return index;
    };
    const next: number[] = [];
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i], b = faces[i + 1], c = faces[i + 2];
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    faces = next;
  }
  return { verts: Float64Array.from(verts), faces: Uint32Array.from(faces) };
}

// ---- shape: smooth union of ellipsoids -------------------------------------------

type Kind = 0 | 1 | 2; // 0 = cerebrum (hemispheres + temporal lobes), 1 = cerebellum, 2 = brain stem
interface Blob { c: Point3; a: Point3; rx: number; kind: Kind; cos: number; sin: number }
const blob = (c: Point3, a: Point3, kind: Kind, rx = 0): Blob => ({ c, a, rx, kind, cos: Math.cos(rx), sin: Math.sin(rx) });

const BLOBS: Blob[] = [
  blob([-1.15, 0.45, 0], [1.45, 1.85, 3.0], 0),
  blob([1.15, 0.45, 0], [1.45, 1.85, 3.0], 0),
  blob([-1.95, -0.8, 0.45], [0.85, 0.62, 1.55], 0, 0.15),
  blob([1.95, -0.8, 0.45], [0.85, 0.62, 1.55], 0, 0.15),
  blob([0, -1.42, -2.2], [1.4, 0.72, 0.92], 1),
  blob([0, -1.55, -0.75], [0.3, 0.72, 0.3], 2, 0.3),
];

function sdBlob(b: Blob, px: number, py: number, pz: number): number {
  const dx = px - b.c[0], dy = py - b.c[1], dz = pz - b.c[2];
  const y = dy * b.cos + dz * b.sin, z = -dy * b.sin + dz * b.cos;
  const x = dx / b.a[0], yy = y / b.a[1], zz = z / b.a[2];
  const k0 = Math.hypot(x, yy, zz);
  const k1 = Math.hypot(x / b.a[0], yy / b.a[1], zz / b.a[2]);
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(b.a[0], b.a[1], b.a[2]);
}
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
function sdf(px: number, py: number, pz: number): number {
  let d = smin(sdBlob(BLOBS[0], px, py, pz), sdBlob(BLOBS[1], px, py, pz), 0.05); // crisp fissure
  d = smin(d, sdBlob(BLOBS[2], px, py, pz), 0.3);
  d = smin(d, sdBlob(BLOBS[3], px, py, pz), 0.3);
  d = smin(d, sdBlob(BLOBS[4], px, py, pz), 0.35);
  return smin(d, sdBlob(BLOBS[5], px, py, pz), 0.3);
}
function kindAt(px: number, py: number, pz: number): Kind {
  let best = Infinity, kind: Kind = 0;
  for (const b of BLOBS) { const d = sdBlob(b, px, py, pz); if (d < best) { best = d; kind = b.kind; } }
  return kind;
}

// First surface hit looking from far away toward the origin along `u`.
function surfaceAlong(ux: number, uy: number, uz: number): Point3 {
  let t = 6.5;
  for (let i = 0; i < 80 && t > 0; i++) {
    const d = sdf(ux * t, uy * t, uz * t);
    if (d < 0.0008) break;
    t -= Math.max(d * 0.85, 0.0015);
  }
  let lo = t, hi = t + 0.05; // refine between inside (lo) and outside (hi)
  for (let i = 0; i < 6; i++) {
    const m = (lo + hi) / 2;
    if (sdf(ux * m, uy * m, uz * m) < 0) lo = m; else hi = m;
  }
  return [ux * hi, uy * hi, uz * hi];
}
function normalAt(p: Point3): Point3 {
  const e = 0.01;
  const nx = sdf(p[0] + e, p[1], p[2]) - sdf(p[0] - e, p[1], p[2]);
  const ny = sdf(p[0], p[1] + e, p[2]) - sdf(p[0], p[1] - e, p[2]);
  const nz = sdf(p[0], p[1], p[2] + e) - sdf(p[0], p[1], p[2] - e);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

// ---- the brain mesh --------------------------------------------------------------

const MESH_LEVEL = 5;               // 10 242 vertices, 20 480 triangles
const FOLD_DEPTH = 0.11;            // how far gyri rise above / sulci sink below the base shape

export interface BrainMesh {
  positions: Float32Array;
  normals: Float32Array;
  ridge: Float32Array;              // 0..1, brighter on gyri crests
  index: Uint32Array;
}
interface BrainBuild extends BrainMesh {
  base: Float32Array;               // smooth surface position per vertex (no folds)
  baseNormal: Float32Array;
  cerebrum: Int32Array;             // indices of vertices that belong to the hemispheres
}

function decodePattern(count: number): Uint8Array {
  const out = new Uint8Array(count).fill(128);
  if (!BRAIN_PATTERN_B64) return out;
  const binary = atob(BRAIN_PATTERN_B64);
  for (let i = 0; i < Math.min(count, binary.length); i++) out[i] = binary.charCodeAt(i);
  return out;
}

let buildCache: BrainBuild | null = null;
function build(): BrainBuild {
  if (buildCache) return buildCache;
  const { verts, faces } = icosphere(MESH_LEVEL);
  const count = verts.length / 3;
  const pattern = decodePattern(count);
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  const baseNormal = new Float32Array(count * 3);
  const ridge = new Float32Array(count);
  const cerebrum: number[] = [];
  for (let i = 0; i < count; i++) {
    const p = surfaceAlong(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]);
    const n = normalAt(p);
    const kind = kindAt(p[0], p[1], p[2]);
    base.set(p, i * 3);
    baseNormal.set(n, i * 3);
    let push = 0, r = 0.5;
    if (kind === 0) {
      r = pattern[i] / 255;
      push = (r - 0.5) * 2 * FOLD_DEPTH;
      // lateral (Sylvian) groove: a deep diagonal cut that sets the temporal lobe apart
      const along = Math.abs(p[0]) > 1.2 && p[2] > -1.4 ? 1 : 0;
      const gy = (p[1] + 0.25 - 0.13 * (p[2] - 0.2)) / 0.13;
      const lateral = Math.min(1, Math.max(0, (Math.abs(p[0]) - 1.4) / 0.8));
      push -= 0.2 * along * lateral * Math.exp(-gy * gy);
      cerebrum.push(i);
    }
    else if (kind === 1) { const s = Math.sin(p[1] * 30); r = 0.5 + 0.5 * s; push = s * 0.03; } // cerebellar lamellae
    ridge[i] = r;
    positions[i * 3] = p[0] + n[0] * push;
    positions[i * 3 + 1] = p[1] + n[1] * push;
    positions[i * 3 + 2] = p[2] + n[2] * push;
  }
  const normals = new Float32Array(count * 3);
  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f] * 3, b = faces[f + 1] * 3, c = faces[f + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const o of [a, b, c]) { normals[o] += nx; normals[o + 1] += ny; normals[o + 2] += nz; }
  }
  for (let i = 0; i < count; i++) {
    const l = Math.hypot(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]) || 1;
    normals[i * 3] /= l; normals[i * 3 + 1] /= l; normals[i * 3 + 2] /= l;
  }
  buildCache = { positions, normals, ridge, index: faces, base, baseNormal, cerebrum: Int32Array.from(cerebrum) };
  return buildCache;
}

export function createBrainMesh(): BrainMesh {
  const { positions, normals, ridge, index } = build();
  return { positions, normals, ridge, index };
}

// ---- node slots: only on the hemispheres ------------------------------------------

let orderCache: Int32Array = new Int32Array(0);
// Farthest-point ordering of the hemisphere vertices: any prefix is evenly spread.
function spreadOrder(want: number): Int32Array {
  const { base, cerebrum } = build();
  const m = cerebrum.length;
  want = Math.min(want, m);
  if (orderCache.length >= want) return orderCache;
  const order = new Int32Array(want);
  const dist = new Float64Array(m).fill(Infinity);
  let cx = 0, cy = 0, cz = 0;
  for (let k = 0; k < m; k++) { cx += base[cerebrum[k] * 3]; cy += base[cerebrum[k] * 3 + 1]; cz += base[cerebrum[k] * 3 + 2]; }
  cx /= m; cy /= m; cz /= m;
  let next = 0, far = -1;
  for (let k = 0; k < m; k++) {
    const d = (base[cerebrum[k] * 3] - cx) ** 2 + (base[cerebrum[k] * 3 + 1] - cy) ** 2 + (base[cerebrum[k] * 3 + 2] - cz) ** 2;
    if (d > far) { far = d; next = k; }
  }
  for (let i = 0; i < want; i++) {
    order[i] = next;
    const px = base[cerebrum[next] * 3], py = base[cerebrum[next] * 3 + 1], pz = base[cerebrum[next] * 3 + 2];
    let best = -1, bestK = 0;
    for (let k = 0; k < m; k++) {
      const v = cerebrum[k] * 3;
      const d = (base[v] - px) ** 2 + (base[v + 1] - py) ** 2 + (base[v + 2] - pz) ** 2;
      if (d < dist[k]) dist[k] = d;
      if (dist[k] > best) { best = dist[k]; bestK = k; }
    }
    next = bestK;
  }
  orderCache = order;
  return order;
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

const CENTER: Point3 = [0, 0.3, 0];

export function layoutBrainNodes(nodes: BrainNode[], links: BrainLink[] = []): Map<string, Point3> {
  const n = nodes.length;
  const positions = new Map<string, Point3>();
  if (!n) return positions;
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const { base, baseNormal, cerebrum } = build();
  const available = cerebrum.length;
  const order = spreadOrder(n);
  // Slot i = i-th hemisphere point of an evenly spread ordering, so nodes never stack and
  // keep a minimum spacing. Nodes sit on the surface of the hemispheres only (never on the
  // cerebellum or the stem); graphs larger than the point set wrap into smaller inner shells.
  const slots: Point3[] = sorted.map((_, i) => {
    const layer = Math.floor(i / available);
    const v = cerebrum[order[i % order.length]] * 3;
    const depth = Math.pow(0.88, layer);
    const out = layer === 0 ? 0.05 : 0; // surface nodes float just above the folds
    return [
      CENTER[0] + (base[v] + baseNormal[v] * out - CENTER[0]) * depth,
      CENTER[1] + (base[v + 1] + baseNormal[v + 1] * out - CENTER[1]) * depth,
      CENTER[2] + (base[v + 2] + baseNormal[v + 2] * out - CENTER[2]) * depth,
    ];
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